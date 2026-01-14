'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Book, X } from 'lucide-react';
import CollaborationWall from './CollaborationWall';

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

interface CollaborationModalProps {
  wallSessionId: number;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function CollaborationModal({ wallSessionId, isOpen, onClose, onComplete }: CollaborationModalProps) {
  const [wall, setWall] = useState<WallDetails | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch wall session details
        const wallResponse = await fetch(`/api/collaboration-walls/${wallSessionId}`);

        if (!wallResponse.ok) throw new Error('Failed to fetch wall session');

        const wallData = await wallResponse.json();
        setWall(wallData);
        setCurrentUserId(wallData.currentUserId); // Get current user ID from API response

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, wallSessionId]);

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="!fixed !inset-0 !max-w-none !w-screen !h-screen !translate-x-0 !translate-y-0 !rounded-none p-0 gap-0 flex flex-col m-0"
        style={{ top: 0, left: 0, right: 0, bottom: 0, transform: 'none', maxWidth: '100vw', width: '100vw', height: '100vh' }}
        showCloseButton={false}
      >
        <DialogHeader className="bg-white z-10 p-3 sm:p-4 border-b shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="bg-blue-100 p-2 rounded-lg shrink-0">
                <Book className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-sm sm:text-base font-bold text-gray-900 truncate">
                  {wall?.title || 'Loading...'}
                </DialogTitle>
                {wall && (
                  <div className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium mt-1">
                    {wall.BibleBook.name} {wall.fromChapter}:{wall.fromVerse} - {wall.toChapter}:{wall.toVerse}
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0"
              title="Close (ESC)"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            {/* Collaboration wall - full screen canvas */}
            {wall && currentUserId && (
              <CollaborationWall 
                wallSessionId={wall.id} 
                currentUserId={currentUserId} 
                onComplete={onComplete}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
