'use client';

import { useState, useEffect, useCallback } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import CollaborationCard from './CollaborationCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';

interface Card {
  id: string;
  content: string;
  color: string;
  positionX: number;
  positionY: number;
  author: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

interface CollaborationWallProps {
  wallSessionId: number;
  currentUserId: number;
  quizSessionId?: number;
}

const CARD_COLORS = [
  '#FEF3C7', // Yellow
  '#DBEAFE', // Blue
  '#FCE7F3', // Pink
  '#D1FAE5', // Green
  '#E0E7FF', // Indigo
  '#FED7AA', // Orange
];

export default function CollaborationWall({
  wallSessionId,
  currentUserId,
  quizSessionId,
}: CollaborationWallProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(CARD_COLORS[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const fetchCards = useCallback(async () => {
    try {
      const response = await fetch(`/api/collaboration-walls/${wallSessionId}/cards`);
      if (response.ok) {
        const data = await response.json();
        setCards(data);
      }
    } catch (error) {
      console.error('Failed to fetch cards:', error);
    } finally {
      setIsLoading(false);
    }
  }, [wallSessionId]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, delta } = event;
    const card = cards.find((c) => c.id === active.id);
    if (!card) return;

    const newX = card.positionX + delta.x;
    const newY = card.positionY + delta.y;

    // Update local state immediately
    setCards((prev) =>
      prev.map((c) =>
        c.id === active.id ? { ...c, positionX: newX, positionY: newY } : c
      )
    );

    // Save to server
    try {
      await fetch(`/api/collaboration-walls/${wallSessionId}/cards/${active.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ positionX: newX, positionY: newY }),
      });
    } catch (error) {
      console.error('Failed to update card position:', error);
      // Revert on error
      fetchCards();
    }
  };

  const handleCreateCard = async () => {
    if (!newContent.trim()) return;

    setIsSaving(true);
    try {
      // Calculate position for new card (avoid overlap)
      const newX = 20 + (cards.length % 5) * 280;
      const newY = 20 + Math.floor(cards.length / 5) * 200;

      const response = await fetch(`/api/collaboration-walls/${wallSessionId}/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newContent,
          color: selectedColor,
          positionX: newX,
          positionY: newY,
          quizSessionId,
        }),
      });

      if (response.ok) {
        const card = await response.json();
        setCards((prev) => [...prev, card]);
        setNewContent('');
        setSelectedColor(CARD_COLORS[0]);
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Failed to create card:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateCard = async (id: string, content: string) => {
    const response = await fetch(`/api/collaboration-walls/${wallSessionId}/cards/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (response.ok) {
      const updatedCard = await response.json();
      setCards((prev) =>
        prev.map((c) => (c.id === id ? updatedCard : c))
      );
    }
  };

  const handleDeleteCard = async (id: string) => {
    const response = await fetch(`/api/collaboration-walls/${wallSessionId}/cards/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      setCards((prev) => prev.filter((c) => c.id !== id));
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading collaboration wall...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Points notification */}
      {pointsEarned > 0 && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
          🎉 You earned +{pointsEarned} point for sharing your learning!
        </div>
      )}

      {/* Create card button */}
      {!isCreating && (
        <Button onClick={() => setIsCreating(true)} className="mb-4">
          <Plus className="w-4 h-4 mr-2" />
          Add Learning Card
        </Button>
      )}

      {/* Create card form */}
      {isCreating && (
        <div className="bg-white p-6 rounded-lg shadow-md border space-y-4">
          <h3 className="font-semibold text-lg">Share What You Learned</h3>
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="What insight did you gain from this passage?"
            className="min-h-[120px]"
            disabled={isSaving}
          />
          
          {/* Color picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Card Color</label>
            <div className="flex gap-2">
              {CARD_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    selectedColor === color
                      ? 'border-gray-900 scale-110'
                      : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  disabled={isSaving}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCreateCard}
              disabled={isSaving || !newContent.trim()}
            >
              {isSaving ? 'Creating...' : 'Create Card'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreating(false);
                setNewContent('');
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Wall */}
      <div className="relative bg-gray-50 rounded-lg border min-h-[600px] max-h-[600px] overflow-auto">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {cards.map((card) => (
            <CollaborationCard
              key={card.id}
              id={card.id}
              content={card.content}
              color={card.color}
              authorName={`${card.author.firstName} ${card.author.lastName}`}
              authorId={card.author.id}
              currentUserId={currentUserId}
              positionX={card.positionX}
              positionY={card.positionY}
              onUpdate={handleUpdateCard}
              onDelete={handleDeleteCard}
            />
          ))}
        </DndContext>

        {cards.length === 0 && !isCreating && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-lg mb-2">No learning cards yet</p>
              <p className="text-sm">Be the first to share your insight!</p>
            </div>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-500 text-center">
        💡 Drag cards to organize them. Click to edit your own cards.
      </p>
    </div>
  );
}
