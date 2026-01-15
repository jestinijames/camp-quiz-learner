'use client';

import Image from 'next/image';

interface FixedCollaborationCardProps {
  id: string;
  content: string;
  color: string;
  authorName: string;
  teamName?: string;
  teamLogo?: string | null;
  positionX: number;
  positionY: number;
}

export default function FixedCollaborationCard({
  id,
  content,
  color,
  authorName,
  teamName,
  teamLogo,
  positionX,
  positionY,
}: FixedCollaborationCardProps) {
  const style = {
    left: `${positionX}px`,
    top: `${positionY}px`,
    backgroundColor: color,
  };

  return (
    <div
      id={id}
      style={style}
      className="absolute w-64 p-4 rounded-lg shadow-lg select-none"
      data-card="true"
    >
      <div className="space-y-2">
        {/* Card Content */}
        <div className="text-sm text-gray-800 whitespace-pre-wrap wrap-break-word min-h-20 max-h-[150px] overflow-y-auto">
          {content}
        </div>

        {/* Author Info */}
        <div className="border-t border-gray-200 pt-2 mt-2">
          <div className="flex items-center gap-2">
            {teamLogo && (
              <div className="relative w-5 h-5 rounded-full overflow-hidden">
                <Image 
                  src={teamLogo} 
                  alt={teamName || 'Team'} 
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="text-xs">
              <div className="font-semibold text-gray-700">{authorName}</div>
              {teamName && (
                <div className="text-gray-500">{teamName}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
