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

    // Select 5-6 strategic verses for puzzles
    const selectedVerses = selectStrategicVerses(verseTexts, 6);
    
    const puzzles: EmojiPuzzle[] = [];

    for (const verse of selectedVerses) {
      try {
        console.log(`  Generating puzzle for ${verse.chapter}:${verse.verse}...`);
        
        // Try ChatGPT first, fallback to Ollama
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
  
  // Try ChatGPT first (primary service)
  try {
    console.log('  🤖 Attempting with ChatGPT...');
    const puzzle = await generateWithChatGPT(bookName, verse);
    console.log('  ✅ ChatGPT generation successful');
    return puzzle;
  } catch (chatgptError: any) {
    console.warn('  ⚠️ ChatGPT failed, falling back to Ollama:', chatgptError.message);
    
    // Fallback to Ollama
    try {
      console.log('  🦙 Attempting with Ollama...');
      const puzzle = await generateWithOllama(bookName, verse);
      console.log('  ✅ Ollama generation successful');
      return puzzle;
    } catch (ollamaError: any) {
      console.error('  ❌ Both ChatGPT and Ollama failed');
      throw new Error(`All AI services failed. ChatGPT: ${chatgptError.message}, Ollama: ${ollamaError.message}`);
    }
  }
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

async function generateWithOllama(
  bookName: string,
  verse: { chapter: number; verse: number; text: string }
): Promise<EmojiPuzzle> {
  
  const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3';

  const prompt = buildEmojiPrompt(bookName, verse);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: ollamaModel,
        stream: false,
        prompt: prompt
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ollama service unavailable: ${response.status}`);
    }

    const data = await response.json();
    const text = data.response?.trim() || '';
    
    if (!text) {
      throw new Error('Empty response from Ollama');
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
You are creating an emoji puzzle game for Bible learning. Players need to GUESS the verse from emojis.

VERSE: ${bookName} ${verse.chapter}:${verse.verse}
TEXT: "${verse.text}"

CRITICAL RULES FOR EMOJI SELECTION:
1. Use 5-7 emojis (more emojis = easier to guess = better)
2. Choose CONCRETE, VISUAL concepts from the verse (not abstract ideas)
3. Use LITERAL representations when possible
4. Include KEY NOUNS (people, objects, places, animals)
5. Include KEY ACTIONS (verbs as emojis)
6. Avoid overly abstract emojis like 🔮 (mystery), 💭 (thoughts), 🕊️ (spirit) unless the verse explicitly mentions these physical things

GOOD EMOJI CHOICES:
✅ God/Jesus → ✝️, 🙏
✅ Love → ❤️, 💕
✅ World → 🌍, 🌎
✅ Light → 💡, ✨, 🌟
✅ Shepherd → 👨‍🌾, 🐑
✅ Water → 💧, 🌊
✅ Bread → 🍞
✅ Cross → ✝️
✅ People/Person → 👤, 👥, 🧑
✅ Speaking/Words → 🗣️, 💬
✅ Power/Strength → 💪
✅ Wisdom/Knowledge → 📖, 📚, 🧠

BAD EMOJI CHOICES (too abstract):
❌ Mystery → 🔮 (unless verse says "mystery")
❌ Spirit → 🕊️ (unless Holy Spirit is explicitly mentioned)
❌ Thoughts → 💭 (too vague)
❌ Time → 🕰️ (too abstract)
❌ Faith → Use ✝️ or 🙏 instead

STRATEGY:
- If verse mentions a PERSON (Paul, disciples, etc) → use 🧑, 👤, 👥
- If verse mentions SPEAKING/WORDS → use 🗣️, 💬, 📢
- If verse mentions GOD'S POWER → use ✝️, 💪, ⚡
- If verse mentions WISDOM → use 📖, 📚, 🧠
- If verse mentions FEAR → use 😰, 😨
- If verse mentions JOY/GLORY → use 🎉, ✨, 👑
- If verse mentions LOVE → use ❤️, 💕
- If verse is about FAITH → use ✝️, 🙏

EXAMPLES OF GOOD PUZZLES:
❌ BAD: "💪🕊️🗣️" (too abstract, only 3 emojis)
✅ GOOD: "🧑💬🗣️📖✝️💪" (person speaking about scripture with God's power - 6 emojis, concrete)

❌ BAD: "🔮🕰️💡📚" (mystery/time are too abstract)
✅ GOOD: "✝️🧠📖🙏💡✨" (God's wisdom from scripture brings light - 6 emojis)

❌ BAD: "🔍💭🕊️" (search, thoughts, spirit - all abstract)
✅ GOOD: "✝️❤️👥🎁🌍💕" (God's love giving to people/world - 6 emojis)

FOR THIS SPECIFIC VERSE "${verse.text}":
- What are the CONCRETE nouns? (people, places, things mentioned)
- What are the ACTIONS? (verbs that can be shown visually)
- What are the KEY themes that can be shown literally?
- Use 5-7 emojis to make it easier to guess

RESPONSE FORMAT (JSON only, no markdown, no explanation):
{
  "emojis": "🧑💬🗣️📖✝️💪",
  "hint": "Brief hint about the topic (10-15 words)"
}

Generate emoji puzzle with 5-7 CONCRETE emojis now:
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