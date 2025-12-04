import { prisma } from './prisma';

export async function generateWordleFromScripture(
  bookId: number, 
  fromChapter: number, 
  fromVerse: number, 
  toChapter: number, 
  toVerse: number
): Promise<string> {
  
  try {
    // Get scripture text from database
    const verses = await prisma.bibleVerse.findMany({
      where: {
        chapter: {
          bookId,
          number: { gte: fromChapter, lte: toChapter }
        },
        number: { 
          gte: fromChapter === toChapter ? fromVerse : 1,
          lte: fromChapter === toChapter ? toVerse : 999
        }
      },
      include: { chapter: { include: { book: true } } }
    });
    
    const allText = verses.map(v => v.text).join(' ');
    
    // Extract 5-letter words (only letters, no numbers or punctuation)
    const words = allText.match(/\b[A-Za-z]{5}\b/g) || [];
    
    // Filter for meaningful Biblical words (not common words)
    const commonWords = ['THESE', 'WHICH', 'THEIR', 'SHALL', 'WOULD', 'WHERE', 'THERE', 'THOSE', 'EVERY', 'AFTER', 'BEING', 'ABOUT', 'THROUGH'];
    
    const biblicalWords = words.filter(word => 
      !commonWords.includes(word.toUpperCase())
    );
    
    // Return random biblical word or fallback
    if (biblicalWords.length > 0) {
      const randomWord = biblicalWords[Math.floor(Math.random() * biblicalWords.length)];
      return randomWord.toUpperCase();
    } else {
      // Fallback words if no good words found
      const fallbackWords = ['GRACE', 'FAITH', 'LIGHT', 'PEACE', 'TRUTH'];
      return fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
    }
    
  } catch (error) {
    console.error('Error generating Wordle word:', error);
    return 'GRACE'; // Ultimate fallback
  }
}

export function calculateWordleScore(attempts: number, won: boolean): number {
  if (!won) return 1; // Participation point
  
  switch (attempts) {
    case 1: return 10; // Perfect!
    case 2: return 9;  // Excellent!
    case 3: return 7;  // Great!
    case 4: return 5;  // Good!
    case 5: return 3;  // Okay
    case 6: return 2;  // Close call
    default: return 1; // Participation
  }
}