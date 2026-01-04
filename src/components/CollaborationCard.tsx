'use client';

import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface CollaborationCardProps {
  id: string;
  content: string;
  color: string;
  authorName: string;
  authorId: number;
  currentUserId: number;
  positionX: number;
  positionY: number;
  onUpdate: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function CollaborationCard({
  id,
  content,
  color,
  authorName,
  authorId,
  currentUserId,
  positionX,
  positionY,
  onUpdate,
  onDelete,
}: CollaborationCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [isSaving, setIsSaving] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
      data: { positionX, positionY },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    left: `${positionX}px`,
    top: `${positionY}px`,
    backgroundColor: color,
    zIndex: isDragging ? 1000 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOwner = authorId === currentUserId;

  const handleSave = async () => {
    if (editContent.trim() === content) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(id, editContent);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update card:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditContent(content);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (confirm('Delete this card?')) {
      await onDelete(id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="absolute w-64 p-4 rounded-lg shadow-lg cursor-move select-none"
      {...listeners}
      {...attributes}
    >
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[100px] bg-white/90 resize-none"
            placeholder="What did you learn?"
            disabled={isSaving}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !editContent.trim()}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
            {content}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-300/50">
            <span className="text-xs text-gray-600 font-medium">
              {authorName}
            </span>
            {isOwner && (
              <div className="flex gap-1">
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 hover:bg-white/50 rounded"
                  title="Edit"
                >
                  <Pencil className="w-3 h-3 text-gray-600" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1 hover:bg-white/50 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3 text-gray-600" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
