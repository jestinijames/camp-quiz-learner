'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Lightbulb, Target, Trophy } from 'lucide-react';

type FlipGameRulesModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function FlipGameRulesModal({ isOpen, onClose }: FlipGameRulesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="text-2xl">🃏</span>
              How to Play - Memory Match
            </span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 p-4">
          {/* Game Overview */}
          <div className="bg-linear-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
            <div className="flex items-start gap-3">
              <Trophy className="h-6 w-6 text-purple-600 dark:text-purple-400 shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-lg text-purple-900 dark:text-purple-100 mb-2">
                  BONUS Game Alert!
                </h3>
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  This is a special bonus game where you can earn up to <strong>4 points</strong> by matching scripture verse pairs. No time pressure - take your time and enjoy!
                </p>
              </div>
            </div>
          </div>

          {/* Game Objective */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-5 w-5 text-blue-600" />
              <h3 className="font-bold text-lg">Game Objective</h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Match all 8 pairs of verse fragments to complete the game. Each verse has been split into two parts - a <strong>beginning</strong> and an <strong>ending</strong>. Your goal is to find and match each verse&apos;s beginning with its corresponding ending.
            </p>
          </div>

          {/* How It Works */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              <h3 className="font-bold text-lg">How It Works</h3>
            </div>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                <p className="text-gray-700 dark:text-gray-300 pt-0.5">
                  <strong>Click START</strong> to begin the game. You&apos;ll see a 4×4 grid with 16 face-down cards.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                <p className="text-gray-700 dark:text-gray-300 pt-0.5">
                  <strong>Click any card</strong> to flip it over and reveal the text fragment (either the beginning or ending of a verse).
                </p>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                <p className="text-gray-700 dark:text-gray-300 pt-0.5">
                  <strong>Click a second card</strong> to flip it over. The game will automatically check if the two fragments belong to the same verse.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                <p className="text-gray-700 dark:text-gray-300 pt-0.5">
                  <strong>If they match:</strong> Great! The cards will stay face-up and become slightly dimmed. That pair is complete!
                </p>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
                <p className="text-gray-700 dark:text-gray-300 pt-0.5">
                  <strong>If they don&apos;t match:</strong> Both cards will flip back over after a brief moment. Try to remember where each fragment is!
                </p>
              </div>
              <div className="flex gap-3">
                <span className="shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">6</span>
                <p className="text-gray-700 dark:text-gray-300 pt-0.5">
                  <strong>Keep matching</strong> until you&apos;ve found all 8 pairs. Once all pairs are matched, you win!
                </p>
              </div>
            </div>
          </div>

          {/* Scoring System */}
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
            <h3 className="font-bold text-lg text-green-900 dark:text-green-100 mb-2">
              📊 Scoring System
            </h3>
            <div className="space-y-2 text-sm text-green-800 dark:text-green-200">
              <p>• You earn <strong>0.5 points for each pair</strong> you successfully match</p>
              <p>• Maximum score: <strong>4 points</strong> (8 pairs × 0.5 points)</p>
              <p>• Your score is based only on how many pairs you match - partial completion still earns points!</p>
              <p>• Points are automatically added to your team&apos;s score when you complete the game</p>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-700">
            <h3 className="font-bold text-lg text-amber-900 dark:text-amber-100 mb-2">
              💡 Pro Tips
            </h3>
            <ul className="space-y-1.5 text-sm text-amber-800 dark:text-amber-200">
              <li>• <strong>Pay attention to keywords</strong> in each fragment to help you remember their locations</li>
              <li>• <strong>Look for context clues</strong> - beginnings often set up what the ending completes</li>
              <li>• <strong>No rush!</strong> This is a bonus game without a timer, so take your time to think</li>
              <li>• <strong>Use your memory!</strong> Try to remember where each fragment is located as you play</li>
              <li>• The game tracks your moves - challenge yourself to match all pairs in the fewest moves possible!</li>
            </ul>
          </div>

          {/* Example */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 rounded-lg">
            <h3 className="font-bold text-lg mb-2">📝 Example</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              If a verse reads: <em>&quot;For God so loved the world that He gave His only begotten Son&quot;</em>
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded border border-blue-300 dark:border-blue-600">
                <strong>Card A:</strong> &quot;For God so loved the world...&quot;
              </div>
              <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded border border-purple-300 dark:border-purple-600">
                <strong>Card B:</strong> &quot;...that He gave His only begotten Son&quot;
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              These two cards form a matching pair!
            </p>
          </div>

          <Button onClick={onClose} className="w-full" size="lg">
            Got It! Let&apos;s Play
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
