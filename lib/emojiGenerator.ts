/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/emojiGenerator.ts
type EmojiPuzzle = {
  emojis: string;
  verse: string;
  hint?: string;
  verseText?: string;
};

export async function generateEmojiPuzzles(
  bookName: string,
  fromChapter: number,
  fromVerse: number,
  toChapter: number,
  toVerse: number,
  verseTexts: Array<{ chapter: number; verse: number; text: string }>
): Promise<EmojiPuzzle[]> {
  try {
    console.log(`🎨 Generating emoji puzzles for ${bookName} ${fromChapter}:${fromVerse}-${toChapter}:${toVerse}`);

    // Select 20 strategic verses for puzzles
    const selectedVerses = selectStrategicVerses(verseTexts, 20);
    
    const puzzles: EmojiPuzzle[] = [];

    for (const verse of selectedVerses) {
      try {
        console.log(`  Generating puzzle for ${verse.chapter}:${verse.verse}...`);
        
        const puzzle = await generateSingleEmojiPuzzle(bookName, verse);
        
        if (puzzle) {
          puzzles.push(puzzle);
          const emojiCount = countEmojis(puzzle.emojis);
          console.log(`  ✅ Generated: ${puzzle.emojis} (${emojiCount} emojis) for ${verse.chapter}:${verse.verse}`);
        }

      } catch (error: any) {
        console.error(`  ❌ Error generating puzzle for ${verse.chapter}:${verse.verse}:`, error.message);
        continue;
      }
    }

    if (puzzles.length === 0) {
      throw new Error('Failed to generate any emoji puzzles');
    }

    console.log(`🎉 Generated ${puzzles.length} emoji puzzles successfully`);
    return puzzles;

  } catch (error: any) {
    console.error('❌ Fatal error in generateEmojiPuzzles:', error);
    throw error;
  }
}

async function generateSingleEmojiPuzzle(
  bookName: string,
  verse: { chapter: number; verse: number; text: string }
): Promise<EmojiPuzzle | null> {
  
  console.log('  🤖 Generating with ChatGPT...');
  const puzzle = await generateWithChatGPT(bookName, verse);
  console.log('  ✅ ChatGPT generation successful');
  return puzzle;
}

async function generateWithChatGPT(
  bookName: string,
  verse: { chapter: number; verse: number; text: string }
): Promise<EmojiPuzzle> {
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    throw new Error('OPENAI_API_KEY not configured in .env.local');
  }

  const prompt = buildEmojiPrompt(bookName, verse);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at creating engaging emoji puzzles for Bible verses. You select concrete, visual emojis that make verses guessable but not too easy. OUTPUT ONLY VALID JSON with no markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 300,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ChatGPT API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';
    
    if (!text) {
      throw new Error('Empty response from ChatGPT');
    }

    return parseEmojiResponse(text, verse);

  } catch (error: any) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function buildEmojiPrompt(
  bookName: string,
  verse: { chapter: number; verse: number; text: string }
): string {
  return `
You are creating an emoji puzzle game for Bible learning. Players must identify THE EXACT VERSE from emojis.

VERSE: ${bookName} ${verse.chapter}:${verse.verse}
TEXT: "${verse.text}"

⚠️ CRITICAL: This verse is part of a larger passage where MULTIPLE verses may discuss similar themes (love, faith, God, etc).
Your emojis MUST be UNIQUELY IDENTIFIABLE to THIS SPECIFIC VERSE ONLY - not applicable to other verses in the same chapter.

🎯 UNIQUENESS RULES (MOST IMPORTANT):
1. Use UNIQUE, SPECIFIC details from THIS verse that distinguish it from nearby verses
2. If verse has NUMBERS (days, people, things) → MUST include number emojis (1️⃣, 2️⃣, 3️⃣, etc)
3. If verse mentions SPECIFIC PEOPLE/NAMES → include person emoji + context
4. If verse has UNIQUE ACTIONS → show the exact action, not general concepts
5. AVOID generic biblical themes (faith, love, God) that appear in MULTIPLE verses
6. Use 5-7 emojis minimum (more specific details = easier to identify the exact verse)
7. Include the verse's SEQUENTIAL CONTEXT if needed (first/last emoji can be position indicator)

🔍 SPECIFIC EMOJI SELECTION STRATEGY:
- Does this verse mention a SPECIFIC NUMBER? → Add that number emoji (1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣8️⃣9️⃣🔟)
- Does this verse mention a SPECIFIC TIME? → Add time emoji (🌅🌄☀️🌙⭐)
- Does this verse have a QUESTION? → Add ❓
- Does this verse have a COMMAND? → Add ⚡👆📢
- Does this verse mention SPECIFIC OBJECTS? → Show exact objects (🍞💧🐑⛺🏔️)
- Does this verse describe SPECIFIC EMOTIONS? → Show exact emotion (😢😊😰🎉)
- Does this verse mention BODY PARTS? → Show them (👁️👂✋🦶❤️)
- Does this verse describe NATURE ELEMENTS? → Be specific (🌊🔥💨🌍⛰️)

✅ GOOD EXAMPLES (UNIQUE & SPECIFIC):
Example 1: "For God so loved the world..." 
❌ BAD: "✝️❤️🌍" (too generic - "God", "love", "world" appear in many verses)
✅ GOOD: "✝️❤️🌍🎁👤1️⃣☝️" (God's love + world + gift + one person + singular = uniquely identifies John 3:16)

Example 2: "The LORD is my shepherd, I shall not want"
❌ BAD: "✝️🐑" (too vague - many shepherd verses)
✅ GOOD: "✝️👨‍🌾🐑👤❌🛑💭" (LORD + shepherd + sheep + I + not + want = specific to Psalm 23:1)

Example 3: "Be still and know that I am God"
❌ BAD: "🧘✝️" (too simple)
✅ GOOD: "🤫🛑🧘📖✝️👑🌍" (be quiet/still + stop + know + God + reign + world = Psalm 46:10 specific)

Example 4: Verse says "on the third day"
❌ BAD: "📅" (too vague)
✅ GOOD: "3️⃣📅🌅👤⬆️" (third + day + morning + person + rise = very specific)

❌ BAD EXAMPLES (TOO GENERIC):
- "✝️❤️🙏" → Could be 100+ verses about God's love and prayer
- "📖💡✨" → Could be any verse about God's word bringing light
- "💪⚡✝️" → Could be any verse about God's power
- "🕊️❤️😇" → Could be any verse about peace, love, spirit

🎯 FOR THIS SPECIFIC VERSE: "${verse.text}"

STEP-BY-STEP ANALYSIS (think through this):
1. What makes THIS verse different from the verse before it and after it?
2. Are there UNIQUE WORDS that don't appear in surrounding verses? Use those!
3. Are there NUMBERS, NAMES, or SPECIFIC OBJECTS mentioned? MUST include them!
4. What is the verse's UNIQUE MESSAGE that no other verse in this chapter says?
5. Does the verse ask a question, give a command, or make a promise? Show that structure!

CONCRETE ELEMENTS TO EXTRACT:
- Specific nouns (people, places, objects, animals, body parts)
- Specific numbers or quantities
- Specific actions or verbs
- Specific emotions or states
- Unique combinations that won't match other verses

RESPONSE FORMAT (JSON only, no markdown, no explanation):
{
  "emojis": "3️⃣📅✝️🐑👨‍🌾❤️",
  "hint": "Brief hint (10-15 words max)"
}

Generate 5-7 emojis that UNIQUELY identify ONLY this verse (not other verses):
`.trim();
}

function parseEmojiResponse(
  text: string,
  verse: { chapter: number; verse: number; text: string }
): EmojiPuzzle {
  
  // Clean up markdown and common AI formatting
  const cleanedText = text
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/gi, '')
    .replace(/`/g, '')
    .trim();

  const startIndex = cleanedText.indexOf('{');
  const endIndex = cleanedText.lastIndexOf('}');
  
  if (startIndex === -1 || endIndex === -1) {
    throw new Error('No valid JSON in response');
  }

  const jsonText = cleanedText.slice(startIndex, endIndex + 1);
  const parsed = JSON.parse(jsonText);

  if (!parsed.emojis) {
    throw new Error('Missing emojis field in response');
  }

  // Validate emoji count (should be 5-7 for better guessing)
  const emojiCount = countEmojis(parsed.emojis);
  if (emojiCount < 4) {
    console.warn(`  ⚠️ Only ${emojiCount} emojis generated, might be too hard`);
  }

  return {
    emojis: parsed.emojis.trim(),
    verse: `${verse.chapter}:${verse.verse}`,
    hint: parsed.hint || undefined,
    verseText: verse.text
  };
}

// Helper to count actual emojis in a string
function countEmojis(str: string): number {
  // Match emoji unicode ranges
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  const matches = str.match(emojiRegex);
  return matches ? matches.length : 0;
}

function selectStrategicVerses(
  verses: Array<{ chapter: number; verse: number; text: string }>,
  count: number
): Array<{ chapter: number; verse: number; text: string }> {
  if (verses.length <= count) {
    return verses;
  }

  // Prioritize verses with more concrete content (longer verses often have more detail)
  // and distribute across the passage
  const scoredVerses = verses.map((v, index) => ({
    verse: v,
    score: v.text.length, // Longer verses often have more concrete content
    position: index
  }));

  // Sort by score and take top candidates
  scoredVerses.sort((a, b) => b.score - a.score);
  
  // Take top scoring verses but ensure they're distributed
  const selected: typeof verses = [];
  const interval = Math.floor(verses.length / count);
  
  for (let i = 0; i < count; i++) {
    // Try to get verse around position i * interval
    const targetPosition = i * interval;
    
    // Find the highest-scoring verse near this position
    const candidate = scoredVerses.find(sv => 
      !selected.includes(sv.verse) && 
      Math.abs(sv.position - targetPosition) < interval
    );
    
    if (candidate) {
      selected.push(candidate.verse);
    } else {
      // Fallback: just take next unselected verse
      const fallback = scoredVerses.find(sv => !selected.includes(sv.verse));
      if (fallback) {
        selected.push(fallback.verse);
      }
    }
  }

  return selected;
}

export function assignEmojiToMember(
  emojiPool: any[],
  teamId: number,
  memberId: number,
  existingAssignments: Map<number, { emoji: any; teamId: number }>
): any {
  
  if (emojiPool.length === 0) {
    throw new Error('Emoji pool is empty - cannot assign puzzle to member');
  }
  
  // Get emojis already assigned to THIS SPECIFIC TEAM ONLY
  const teamAssignedEmojis = new Set<string>();
  for (const [memberId, assignment] of existingAssignments.entries()) {
    if (assignment.teamId === teamId) {
      // Use the emoji string as identifier for comparison
      const emojiKey = typeof assignment.emoji === 'string' 
        ? assignment.emoji 
        : JSON.stringify(assignment.emoji);
      teamAssignedEmojis.add(emojiKey);
    }
  }
  
  // Find emojis not yet used by this team
  const availableEmojis = emojiPool.filter(emoji => {
    const emojiKey = typeof emoji === 'string' ? emoji : JSON.stringify(emoji);
    return !teamAssignedEmojis.has(emojiKey);
  });
  
  // If we have unused emojis, pick randomly from them
  if (availableEmojis.length > 0) {
    return availableEmojis[Math.floor(Math.random() * availableEmojis.length)];
  }
  
  // If all emojis used by team, just pick random from pool
  // (This should rarely happen with 20 puzzles and ~20 members per team)
  return emojiPool[Math.floor(Math.random() * emojiPool.length)];
}