import { prisma } from './prisma';

// Calculate Levenshtein distance between two words
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Filter out words that are too similar to each other
function filterSimilarWords(words: string[]): string[] {
  const filtered: string[] = [];
  const threshold = 1; // Only filter words that differ by exactly 1 character (too similar)

  for (const word of words) {
    let isSimilar = false;
    
    for (const existing of filtered) {
      const distance = levenshteinDistance(word, existing);
      
      // If words differ by only 1 character or are identical, skip this word
      if (distance <= threshold) {
        isSimilar = true;
        break;
      }
    }
    
    if (!isSimilar) {
      filtered.push(word);
    }
  }

  return filtered;
}

export async function generateWordlePoolFromScripture(
  bookId: number, 
  fromChapter: number, 
  fromVerse: number, 
  toChapter: number, 
  toVerse: number,
  poolSize: number = 50
): Promise<string[]> {
  
  try {
    // Get scripture text from database
    const verses = await prisma.bibleVerse.findMany({
      where: {
        BibleChapter: {
          bookId,
          number: { gte: fromChapter, lte: toChapter }
        },
        number: { 
          gte: fromChapter === toChapter ? fromVerse : 1,
          lte: fromChapter === toChapter ? toVerse : 999
        }
      },
      include: { BibleChapter: { include: { BibleBook: true } } },
      orderBy: [
        { BibleChapter: { number: 'asc' } },
        { number: 'asc' }
      ]
    });
    
    if (verses.length === 0) {
      throw new Error('No verses found for the specified range');
    }
    
    const passageText = verses.map(v => v.text).join(' ');
    const bookName = verses[0].BibleChapter.BibleBook.name;
    
    // Extract ALL 5-letter words from the passage (only alphabetic characters)
    const allWords = passageText.match(/\b[A-Za-z]{5}\b/g) || [];
    
    if (allWords.length === 0) {
      throw new Error('No 5-letter words found in the specified passage. Please select a longer passage.');
    }
    
    // Get unique words (case-insensitive)
    const uniqueWords = [...new Set(allWords.map(w => w.toUpperCase()))];
    
    console.log(`Found ${uniqueWords.length} unique 5-letter words in passage:`, uniqueWords.join(', '));
    
    // Filter out generic words immediately
    const genericWords = new Set([
      'THESE', 'THOSE', 'THERE', 'WHERE', 'WHICH', 'THEIR', 'WOULD', 
      'COULD', 'SHOULD', 'ABOUT', 'AFTER', 'BEING', 'EVERY', 'THING',
      'STILL', 'OTHER', 'WHILE', 'AMONG', 'PLACE', 'SHALL', 'THROUGH',
      'FIRST', 'BEFORE', 'AGAIN', 'SINCE', 'UNDER', 'NEVER', 'MIGHT',
      'THREE', 'SEVEN', 'EIGHT', 'FORTY', 'FIFTY', 'WHOSE', 'UNTIL',
      'OFTEN', 'DURING', 'WITHOUT', 'HAVING', 'GIVEN', 'TAKEN', 'MAKES',
      'GOING', 'DOING', 'COMES', 'BEGAN', 'HEARD', 'ASKED', 'SPOKE',
      // Very common biblical terms that would be overused
      'JESUS', 'CHRIST', 'MOSES', 'DAVID', 'ANGEL', 'SATAN'
    ]);
    
    const meaningfulWords = uniqueWords.filter(w => !genericWords.has(w));
    
    console.log(`After filtering generic words: ${meaningfulWords.length} words remaining`);
    
    // Always use only meaningful words - never include generic ones
    if (meaningfulWords.length < poolSize) {
      console.warn(`Only ${meaningfulWords.length} meaningful words available, requested ${poolSize}`);
      return shuffleArray(meaningfulWords);
    }
    
    // Use AI to intelligently select the best words for Wordle
    const selectedWords = await selectBestWordleWordsWithAI(
      meaningfulWords,
      passageText,
      bookName,
      fromChapter,
      fromVerse,
      toChapter,
      toVerse,
      poolSize
    );
    
    return selectedWords;
    
  } catch (error) {
    console.error('Error generating Wordle word pool:', error);
    throw error; // NO FALLBACK - let the caller handle this error
  }
}

async function selectBestWordleWordsWithAI(
  availableWords: string[],
  passageText: string,
  bookName: string,
  fromChapter: number,
  fromVerse: number,
  toChapter: number,
  toVerse: number,
  poolSize: number
): Promise<string[]> {
  
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        stream: false,
        prompt: `
You are selecting words for a Bible Wordle game. You MUST choose EXACTLY ${poolSize} words from the list below.

PASSAGE: ${bookName} ${fromChapter}:${fromVerse}-${toChapter}:${toVerse}
PASSAGE PREVIEW: ${passageText.substring(0, 600)}${passageText.length > 600 ? '...' : ''}

AVAILABLE WORDS (ALL from this passage - you MUST choose ONLY from this list):
${availableWords.join(', ')}

CRITICAL RULES:
1. Select EXACTLY ${poolSize} words from the available list above
2. DO NOT invent or suggest words not in the list
3. DO NOT use words from other Bible passages
4. ONLY choose from the words provided above

SELECTION PRIORITIES (in order):
1. **Biblical/Theological significance** - Words with strong biblical meaning (e.g., GRACE, FAITH, GLORY, HEART, BLOOD)
2. **Thematic relevance** - Words central to THIS specific passage's message  
3. **Wordle playability** - Words with good letter variety (mix of vowels/consonants)
4. **Difficulty variety** - Mix of easier and harder words for gameplay
5. **Recognizability** - Words that are meaningful and memorable

WORD VARIETY:
- Choose words with DIFFERENT letter patterns (don't pick HEART, HEARD, BEARD together)
- Mix vowel-heavy (PEACE, AUDIO) and consonant-heavy (CHRIST, TRUTH) words
- Avoid words that are too similar to each other
- Include mix of common biblical terms and unique passage-specific words

IMPORTANT: 
- Count your selected words - must be EXACTLY ${poolSize}
- Double-check every word is from the available list
- If you're unsure, prioritize words that appear meaningful to the passage

OUTPUT FORMAT (JSON only, no explanations before or after):
{
  "selectedWords": ["WORD1", "WORD2", "WORD3", "WORD4", "WORD5", ...],
  "reasoning": "Brief 1-2 sentence explanation of selection strategy"
}

Select ${poolSize} words now (JSON only):
        `.trim(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.response?.trim() || '';
    
    console.log('Raw AI response:', text.substring(0, 300));

    // Extract JSON from response
    let jsonText = '';
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      jsonText = text.slice(startIndex, endIndex + 1);
    } else {
      throw new Error('No JSON found in AI response');
    }

    // Clean up common JSON issues
    jsonText = jsonText
      .replace(/\n/g, ' ')
      .replace(/\t/g, ' ')
      .replace(/\s+/g, ' ');

    const parsed = JSON.parse(jsonText);
    
    if (!parsed.selectedWords || !Array.isArray(parsed.selectedWords)) {
      throw new Error('AI response missing selectedWords array');
    }

    // STRICT VALIDATION: Ensure ALL words are from available list and remove duplicates
    const selectedWordsRaw = (parsed.selectedWords as unknown[])
      .map((w: unknown) => String(w).toUpperCase().trim())
      .filter((word: string) => availableWords.includes(word));
    
    // Remove exact duplicates first
    const uniqueSelected = [...new Set(selectedWordsRaw)];
    
    // Remove words that are too similar to each other
    const selectedWords = filterSimilarWords(uniqueSelected);

    console.log(`AI selected ${selectedWords.length}/${poolSize} valid unique words:`, selectedWords);
    console.log('AI reasoning:', parsed.reasoning);

    // If AI didn't give us enough valid words, throw error
    if (selectedWords.length < poolSize * 0.7) {
      throw new Error(`AI only selected ${selectedWords.length} valid unique words, need ${poolSize}`);
    }

    // If we got fewer than requested, fill with random selection from available
    if (selectedWords.length < poolSize) {
      console.warn(`AI gave ${selectedWords.length} words, filling remainder with random selection`);
      const remaining = availableWords.filter(w => !selectedWords.includes(w));
      const shuffledRemaining = shuffleArray(remaining);
      
      // Use similarity filtering when adding more words
      const additional: string[] = [];
      for (const word of shuffledRemaining) {
        if (additional.length >= poolSize - selectedWords.length) break;
        
        // Check if this word is too similar to any already selected
        let isSimilar = false;
        for (const existing of [...selectedWords, ...additional]) {
          if (levenshteinDistance(word, existing) <= 1) {
            isSimilar = true;
            break;
          }
        }
        
        if (!isSimilar) {
          additional.push(word);
        }
      }
      
      return shuffleArray([...selectedWords, ...additional]);
    }

    // Return exactly poolSize words
    return shuffleArray(selectedWords.slice(0, poolSize));

  } catch (error) {
    console.error('AI word selection failed:', error);
    // Fallback: randomly select from available words (still only from passage!)
    console.log('Using random selection fallback from available words');
    
    const shuffled = shuffleArray(availableWords);
    const selected: string[] = [];
    
    // Select words ensuring they're not too similar
    for (const word of shuffled) {
      if (selected.length >= poolSize) break;
      
      let isSimilar = false;
      for (const existing of selected) {
        if (levenshteinDistance(word, existing) <= 1) {
          isSimilar = true;
          break;
        }
      }
      
      if (!isSimilar) {
        selected.push(word);
      }
    }
    
    return shuffleArray(selected);
  }
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function assignWordToMember(
  wordPool: string[],
  teamId: number,
  memberId: number,
  existingAssignments: Map<number, { word: string; teamId: number }>
): string {
  
  if (wordPool.length === 0) {
    throw new Error('Word pool is empty - cannot assign word to member');
  }
  
  // Get words already assigned to THIS SPECIFIC TEAM ONLY
  const teamAssignedWords = new Set<string>();
  for (const [memberId, assignment] of existingAssignments.entries()) {
    if (assignment.teamId === teamId) {
      teamAssignedWords.add(assignment.word);
    }
  }
  
  // Find words not yet used by this team
  const availableWords = wordPool.filter(word => !teamAssignedWords.has(word));
  
  // If we have unused words, pick randomly from them
  if (availableWords.length > 0) {
    return availableWords[Math.floor(Math.random() * availableWords.length)];
  }
  
  // If all words used by team, just pick random from pool
  // (This should rarely happen with 50 words and ~20 members per team)
  return wordPool[Math.floor(Math.random() * wordPool.length)];
}

export function calculateWordleScore(attempts: number, won: boolean): number {
  if (!won) return 2; // Participation points for trying
  
  switch (attempts) {
    case 1: return 10; // Perfect! Maximum points
    case 2: return 10; // Excellent! Maximum points
    case 3: return 9;  // Great!
    case 4: return 8;  // Good!
    case 5: return 7;  // Nice try
    case 6: return 6;  // Got it!
    default: return 2; // Participation
  }
}

// Helper function to validate if a passage has enough words for Wordle
// Note: We try to get the requested poolSize, but will accept whatever is available (minimum 10 words)
export async function validatePassageForWordle(
  bookId: number,
  fromChapter: number,
  fromVerse: number,
  toChapter: number,
  toVerse: number,
  desiredPoolSize: number = 50
): Promise<{ valid: boolean; wordCount: number; message?: string }> {
  
  const ABSOLUTE_MINIMUM = 10; // Minimum words needed to make a valid Wordle game
  
  try {
    const verses = await prisma.bibleVerse.findMany({
      where: {
        BibleChapter: {
          bookId,
          number: { gte: fromChapter, lte: toChapter }
        },
        number: { 
          gte: fromChapter === toChapter ? fromVerse : 1,
          lte: fromChapter === toChapter ? toVerse : 999
        }
      }
    });
    
    if (verses.length === 0) {
      return { valid: false, wordCount: 0, message: 'No verses found in this range' };
    }
    
    const passageText = verses.map(v => v.text).join(' ');
    const allWords = passageText.match(/\b[A-Za-z]{5}\b/g) || [];
    const uniqueWords = new Set(allWords.map(w => w.toUpperCase()));
    
    const wordCount = uniqueWords.size;
    
    // Only fail if we have fewer than the absolute minimum
    if (wordCount < ABSOLUTE_MINIMUM) {
      return { 
        valid: false, 
        wordCount, 
        message: `Only ${wordCount} unique 5-letter words found. Need at least ${ABSOLUTE_MINIMUM}. Please select a longer passage.` 
      };
    }
    
    // Success - we'll use whatever words are available
    return { valid: true, wordCount };
    
  } catch (error) {
    return { 
      valid: false, 
      wordCount: 0, 
      message: 'Error validating passage' 
    };
  }
}