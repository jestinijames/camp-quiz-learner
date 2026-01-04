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
  book: {
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
}

export function CollaborationModal({ wallSessionId, isOpen, onClose }: CollaborationModalProps) {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 bg-white z-10 p-4 sm:p-6 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="bg-blue-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                <Book className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900 mb-1 sm:mb-2">
                  {wall?.title || 'Loading...'}
                </DialogTitle>
                {wall?.description && (
                  <p className="text-sm text-gray-600 mb-2">{wall.description}</p>
                )}
                {wall && (
                  <div className="inline-flex items-center px-2 sm:px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs sm:text-sm font-medium">
                    {wall.book.name} {wall.fromChapter}:{wall.fromVerse} - {wall.toChapter}:{wall.toVerse}
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Collaboration wall */}
            {wall && currentUserId && (
              <div className="bg-white rounded-lg border p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">
                  💡 Team Learning Wall
                </h3>
                <p className="text-sm text-gray-600 mb-4 sm:mb-6">
                  Share insights, reflections, and learnings from this passage with your team
                </p>
                <CollaborationWall wallSessionId={wall.id} currentUserId={currentUserId} />
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
