'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  onComplete?: () => void;
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
  onComplete,
}: CollaborationWallProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(CARD_COLORS[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  
  // Pan/zoom state
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

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
        
        // Auto-arrange cards with generous spacing to prevent overlap
        const arrangedCards = data.map((card: Card, index: number) => {
          // Calculate grid position based on screen size
          const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
          const cardsPerRow = isMobile ? 1 : 3; // 1 column on mobile, 3 on desktop
          const cardWidth = 240; // Fixed card width
          const cardHeight = 200; // Fixed card height
          const gap = isMobile ? 40 : 50; // Generous spacing between cards
          
          const col = index % cardsPerRow;
          const row = Math.floor(index / cardsPerRow);
          
          return {
            ...card,
            positionX: gap + col * (cardWidth + gap),
            positionY: gap + row * (cardHeight + gap),
          };
        });
        
        setCards(arrangedCards);
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
      // Calculate position for new card with generous spacing
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const cardsPerRow = isMobile ? 1 : 3;
      const cardWidth = 240;
      const cardHeight = 200;
      const gap = isMobile ? 40 : 50;
      
      const col = cards.length % cardsPerRow;
      const row = Math.floor(cards.length / cardsPerRow);
      
      const newX = gap + col * (cardWidth + gap);
      const newY = gap + row * (cardHeight + gap);

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
          isFirstSubmission: true, // Let the backend decide based on existing cards with pointsAwarded
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCards((prev) => [...prev, data.card]);
        if (data.pointsAwarded) {
          setPointsEarned(2);
          // Notify parent to refresh tasks after a small delay to ensure DB commit
          setTimeout(() => {
            if (onComplete) {
              onComplete();
            }
          }, 500);
        }
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
    return <div className="flex items-center justify-center h-full p-8 text-center">Loading collaboration wall...</div>;
  }

  const handlePanStart = (e: React.MouseEvent | React.TouchEvent) => {
    // Don't pan if clicking on a card or button
    const target = e.target as HTMLElement;
    if (target.closest('[data-card]') || target.closest('button') || target.closest('textarea')) {
      return;
    }
    
    setIsPanning(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setPanStart({ x: clientX - panOffset.x, y: clientY - panOffset.y });
  };

  const handlePanMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isPanning) return;
    e.preventDefault(); // Prevent text selection while panning
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setPanOffset({
      x: clientX - panStart.x,
      y: clientY - panStart.y,
    });
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top toolbar */}
      <div className="flex-shrink-0 p-3 bg-gray-50 border-b flex items-center justify-between gap-2 flex-wrap">
        {/* Points notification */}
        {pointsEarned > 0 && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded text-sm flex items-center gap-2">
            🎉 +{pointsEarned} points earned!
          </div>
        )}

        {/* Create card button */}
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Card
          </Button>
        )}

        <p className="text-xs text-gray-500 ml-auto">
          💡 Drag canvas to pan • Drag cards to move
        </p>
      </div>

      {/* Create card form */}
      {isCreating && (
        <div className="flex-shrink-0 bg-white p-4 border-b space-y-3">
          <h3 className="font-semibold text-sm">Share What You Learned</h3>
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="What insight did you gain from this passage?"
            className="min-h-[80px] text-sm"
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
              size="sm"
            >
              {isSaving ? 'Creating...' : 'Create'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreating(false);
                setNewContent('');
              }}
              disabled={isSaving}
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Pannable canvas */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 cursor-grab active:cursor-grabbing"
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
        onTouchStart={handlePanStart}
        onTouchMove={handlePanMove}
        onTouchEnd={handlePanEnd}
      >
        <div 
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
            width: '3000px',
            height: '2000px',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
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
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-gray-400">
              <p className="text-lg mb-2">No learning cards yet</p>
              <p className="text-sm">Be the first to share your insight!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
