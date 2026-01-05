/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { Sparkles } from 'lucide-react';

interface InsightSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallSessionId: number;
  wallTitle: string;
  passage: string;
  onComplete: () => void;
}

const CARD_COLORS = [
  '#FFE5E5', '#E5F3FF', '#FFF9E5', '#E5FFE5', 
  '#F5E5FF', '#FFE5F5', '#E5FFFF', '#FFE5CC'
];

export function InsightSubmissionModal({ 
  isOpen, 
  onClose, 
  wallSessionId, 
  wallTitle,
  passage,
  onComplete 
}: InsightSubmissionModalProps) {
  const [insight, setInsight] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!insight.trim()) {
      setError('Please enter your insight');
      return;
    }

    const trimmedInsight = insight.trim();

    if (trimmedInsight.length < 10) {
      setError('Please share a more detailed insight (at least 10 characters)');
      return;
    }

    // Check for gibberish: repeated characters
    const repeatedChars = /(.)\1{4,}/; // 5+ same characters in a row
    if (repeatedChars.test(trimmedInsight)) {
      setError('Please share a meaningful insight, not repeated characters');
      return;
    }

    // Check for actual words (must have at least 3 words with letters)
    const words = trimmedInsight.split(/\s+/).filter(word => /[a-zA-Z]{2,}/.test(word));
    if (words.length < 3) {
      setError('Please share a complete thought with at least 3 words');
      return;
    }

    // Check for only punctuation or numbers
    const hasLetters = /[a-zA-Z]/.test(trimmedInsight);
    if (!hasLetters) {
      setError('Please use words to share your insight');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Random color for the card
      const randomColor = CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)];
      
      const response = await fetch(`/api/collaboration-walls/${wallSessionId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: insight.trim(),
          color: randomColor,
          positionX: Math.floor(Math.random() * 300),
          positionY: Math.floor(Math.random() * 300),
          isFirstSubmission: true // Flag to award points
        })
      });

      if (response.ok) {
        setSuccess(true);
        setInsight('');
        
        // Show success message briefly, then close
        setTimeout(() => {
          onComplete();
          onClose();
        }, 2000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to submit insight');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setInsight('');
      setError('');
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Share Your Insight
          </DialogTitle>
          <div className="text-center text-sm text-gray-600 dark:text-gray-400 space-y-1 mt-2">
            <p className="font-medium">{wallTitle}</p>
            <p className="text-xs">{passage}</p>
          </div>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-green-600 dark:text-green-400">
              Thank You! 🎉
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your insight has been shared!
            </p>
            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
              +2 Points Earned! 🏆
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <p className="text-sm text-purple-800 dark:text-purple-300 font-medium mb-1">
                  💡 What did you learn from this passage?
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  Share one key insight, lesson, or reflection. Earn +2 points for your team!
                </p>
              </div>

              <Textarea
                value={insight}
                onChange={(e) => setInsight(e.target.value)}
                placeholder="I learned that..."
                className="min-h-[120px] resize-none"
                disabled={submitting}
                maxLength={500}
                autoFocus
              />
              <p className="text-xs text-right text-gray-500">
                {insight.length}/500 characters
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={submitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || insight.trim().length < 10}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {submitting ? 'Submitting...' : 'Submit & Earn Points'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
