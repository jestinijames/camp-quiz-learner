/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface ActiveCollaborationWallsProps {
  activeWalls: any[];
  closingWall: number | null;
  onCloseWall: (wallId: number, wallTitle: string) => void;
}

export function ActiveCollaborationWalls({ activeWalls, closingWall, onCloseWall }: ActiveCollaborationWallsProps) {
  if (activeWalls.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🟢 Active Collaboration Walls
          <Badge variant="default">{activeWalls.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activeWalls.map((wall: any) => (
            <div key={wall.id} className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <h3 className="font-semibold text-blue-800">{wall.title}</h3>
                <p className="text-sm text-blue-600">
                  {wall.book?.name || 'Unknown Book'} {wall.fromChapter}:{wall.fromVerse} - {wall.toChapter}:{wall.toVerse}
                </p>
                <p className="text-xs text-blue-500">
                  {wall._count?.cards || 0} cards • 
                  Created: {new Date(wall.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => onCloseWall(wall.id, wall.title)}
                  disabled={closingWall === wall.id}
                  size="sm"
                  variant="destructive"
                >
                  {closingWall === wall.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Closing...
                    </>
                  ) : (
                    <>🔒 Close Wall</>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
