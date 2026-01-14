'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Book, X, Volume2, VolumeX, Pause, Play, Circle } from 'lucide-react';

interface WallDetails {
  id: number;
  title: string;
  description: string | null;
  BibleBook: {
    id: number;
    name: string;
  };
  fromChapter: number;
  fromVerse: number;
  toChapter: number;
  toVerse: number;
}

interface PassageVerse {
  chapter: number;
  verse: number;
  text: string;
}

interface ReadPortionModalProps {
  wallSessionId: number;
  isOpen: boolean;
  onClose: () => void;
  onListeningComplete?: (wallId: number) => void;
}

export function ReadPortionModal({ wallSessionId, isOpen, onClose, onListeningComplete }: ReadPortionModalProps) {
  const [wall, setWall] = useState<WallDetails | null>(null);
  const [passage, setPassage] = useState<PassageVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [listeningComplete, setListeningComplete] = useState(false);
  const [awardingPoints, setAwardingPoints] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      speechSynthesisRef.current = window.speechSynthesis;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopSpeaking();
      setListeningComplete(false);
      setHasAttempted(false);
      setHasSubmitted(false);
      return;
    }

    // Mark as attempted immediately when modal opens
    setHasAttempted(true);

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch wall session details
        const wallResponse = await fetch(`/api/collaboration-walls/${wallSessionId}`);

        if (!wallResponse.ok) throw new Error('Failed to fetch wall session');

        const wallData = await wallResponse.json();
        setWall(wallData);

        // Fetch passage verses
        const passageResponse = await fetch(
          `/api/bible/passage?bookId=${wallData.BibleBook.id}&fromChapter=${wallData.fromChapter}&fromVerse=${wallData.fromVerse}&toChapter=${wallData.toChapter}&toVerse=${wallData.toVerse}`
        );

        if (passageResponse.ok) {
          const verses = await passageResponse.json();
          setPassage(verses);
        }

        // Check if user has already listened to this passage
        const listenCheckResponse = await fetch(`/api/collaboration-walls/${wallSessionId}/listen-status`);
        if (listenCheckResponse.ok) {
          const listenStatus = await listenCheckResponse.json();
          setListeningComplete(listenStatus.hasListened);
        }
      } catch (error) {
        console.error('Error fetching passage:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, wallSessionId]);

  const stopSpeaking = () => {
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  const toggleSpeech = () => {
    if (!speechSynthesisRef.current || passage.length === 0) return;

    if (isSpeaking && !isPaused) {
      // Pause
      speechSynthesisRef.current.pause();
      setIsPaused(true);
    } else if (isSpeaking && isPaused) {
      // Resume
      speechSynthesisRef.current.resume();
      setIsPaused(false);
    } else {
      // Start speaking
      const text = passage.map(v => `Chapter ${v.chapter}, verse ${v.verse}. ${v.text}`).join('. ');
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onend = async () => {
        setIsSpeaking(false);
        setIsPaused(false);
        
        // Award points for listening completion
        if (!listeningComplete) {
          setAwardingPoints(true);
          try {
            const response = await fetch(`/api/collaboration-walls/${wallSessionId}/listen`, {
              method: 'POST'
            });
            
            if (response.ok) {
              const result = await response.json();
              setListeningComplete(true);
              
              // Immediately update parent state
              if (onListeningComplete) {
                onListeningComplete(wallSessionId);
              }
              
              // Show success message briefly then close
              setTimeout(() => {
                onClose();
              }, 2500);
            }
          } catch (error) {
            console.error('Error awarding points:', error);
          } finally {
            setAwardingPoints(false);
          }
        }
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };

      speechSynthesisRef.current.speak(utterance);
      setIsSpeaking(true);
      setIsPaused(false);
    }
  };

  const handleModalClose = async (open: boolean) => {
    console.log('handleModalClose called with open:', open);
    if (!open) {
      // User is closing the modal
      console.log('Modal closing - hasAttempted:', hasAttempted, 'listeningComplete:', listeningComplete, 'hasSubmitted:', hasSubmitted);
      
      // If they attempted but didn't complete AND haven't already submitted, record a 0-point attempt
      if (hasAttempted && !listeningComplete && !hasSubmitted) {
        console.log('Submitting incomplete attempt with 0 points');
        setHasSubmitted(true);
        try {
          const response = await fetch(`/api/collaboration-walls/${wallSessionId}/listen`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completedListening: false }),
          });
          
          const result = await response.json();
          console.log('API response:', result);
          
          // Notify parent to refresh tasks
          if (onListeningComplete) {
            console.log('Calling onListeningComplete to remove task');
            onListeningComplete(wallSessionId);
          }
        } catch (error) {
          console.error('Error recording incomplete listening attempt:', error);
        }
      }
      
      // Call parent's onClose after we've handled the submission
      onClose();
    }
  };

  const handleSkip = async () => {
    if (!listeningComplete && !hasSubmitted) {
      setHasSubmitted(true);
      setAwardingPoints(true);
      try {
        await fetch(`/api/collaboration-walls/${wallSessionId}/listen`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completedListening: false, skipped: true }),
        });
        
        // Notify parent to refresh tasks
        if (onListeningComplete) {
          onListeningComplete(wallSessionId);
        }
        
        // Close the modal
        onClose();
      } catch (error) {
        console.error('Error skipping passage:', error);
      } finally {
        setAwardingPoints(false);
      }
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 bg-white z-10 p-4 sm:p-6 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="bg-blue-100 p-2 sm:p-3 rounded-lg shrink-0">
                <Book className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                  {wall?.title || 'Loading...'}
                </DialogTitle>
                {wall && (
                  <div className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                    📖 {wall.BibleBook.name} {wall.fromChapter}:{wall.fromVerse} - {wall.toChapter}:{wall.toVerse}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {passage.length > 0 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleSpeech}
                  title={isSpeaking ? (isPaused ? "Resume" : "Pause") : "Read aloud"}
                >
                  {isSpeaking ? (
                    isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
              )}
              {isSpeaking && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={stopSpeaking}
                  title="Stop"
                >
                  <Circle className="w-4 h-4 fill-current" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading passage...</p>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6">
            {listeningComplete && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <span className="text-2xl">🎉</span>
                </div>
                <div>
                  <h3 className="font-semibold text-green-800">Listening Complete!</h3>
                  <p className="text-sm text-green-600">You earned 10 points for listening to this passage</p>
                </div>
              </div>
            )}
            {passage.length > 0 ? (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 sm:p-6">
                <div className="space-y-3 text-gray-700 leading-relaxed">
                  {passage.map((verse, idx) => (
                    <p key={idx} className="hover:bg-white/50 p-2 rounded transition-colors">
                      <sup className="text-blue-600 font-semibold mr-2">
                        {verse.chapter}:{verse.verse}
                      </sup>
                      {verse.text}
                    </p>
                  ))}
                </div>

                {/* Skip Button */}
                {!listeningComplete && (
                  <div className="mt-6 flex justify-center">
                    <Button
                      onClick={handleSkip}
                      variant="outline"
                      disabled={awardingPoints}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      {awardingPoints ? 'Processing...' : "I'm done"}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No passage text available
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
