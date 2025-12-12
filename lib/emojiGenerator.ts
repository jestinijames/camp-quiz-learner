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

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            model: 'llama3',
            stream: false,
            prompt: `
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

RESPONSE FORMAT (JSON only, no explanation):
{
  "emojis": "🧑💬🗣️📖✝️💪",
  "hint": "Brief hint about the topic (10-15 words)"
}

Generate emoji puzzle with 5-7 CONCRETE emojis now:
            `.trim(),
          }),
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.error(`  ❌ Ollama error: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const text = data.response?.trim() || '';

        const startIndex = text.indexOf('{');
        const endIndex = text.lastIndexOf('}');
        
        if (startIndex === -1 || endIndex === -1) {
          console.error(`  ❌ No valid JSON in response`);
          continue;
        }

        const jsonText = text.slice(startIndex, endIndex + 1);
        const parsed = JSON.parse(jsonText);

        if (!parsed.emojis) {
          console.error(`  ❌ Missing emojis field`);
          continue;
        }

        // Validate emoji count (should be 5-7 for better guessing)
        const emojiCount = countEmojis(parsed.emojis);
        if (emojiCount < 4) {
          console.warn(`  ⚠️ Only ${emojiCount} emojis generated, might be too hard`);
        }

        puzzles.push({
          emojis: parsed.emojis.trim(),
          verse: `${verse.chapter}:${verse.verse}`,
          hint: parsed.hint || undefined,
          verseText: verse.text
        });

        console.log(`  ✅ Generated: ${parsed.emojis} (${emojiCount} emojis) for ${verse.chapter}:${verse.verse}`);

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