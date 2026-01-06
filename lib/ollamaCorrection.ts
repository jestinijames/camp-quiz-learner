/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/ollamaCorrection.ts
export type CorrectionResult = {
  isCorrect: boolean;
  points: number;
  feedback: string;
  reasoning: string;
};

export async function correctDescriptiveAnswer(
  questionText: string,
  correctAnswer: string,
  memberAnswer: string,
  maxPoints: number,
  verseReference: string,
  keywords?: string[]  // NEW: Accept keywords from question generation
): Promise<CorrectionResult> {
  
  console.log('🤖 Correcting with ChatGPT (OpenAI)...');
  const result = await correctWithChatGPT(
    questionText, correctAnswer, memberAnswer, maxPoints, verseReference, keywords
  );
  console.log('✅ ChatGPT correction successful');
  return result;
}

async function correctWithChatGPT(
  questionText: string,
  correctAnswer: string,
  memberAnswer: string,
  maxPoints: number,
  verseReference: string,
  keywords?: string[]
): Promise<CorrectionResult> {
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    throw new Error('OPENAI_API_KEY not configured in .env.local');
  }

  const prompt = buildCorrectionPrompt(
    questionText, correctAnswer, memberAnswer, maxPoints, verseReference, keywords
  );

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert Bible quiz grader who values SEMANTIC UNDERSTANDING over exact wording. Evaluate answers based on whether the student grasps the biblical meaning and key concepts. Accept paraphrases, synonyms, and different phrasings if they convey the correct meaning. Be FAIR and ENCOURAGING while maintaining biblical accuracy standards. OUTPUT ONLY VALID JSON with no markdown formatting.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2, // Lower temperature for more consistent grading
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ChatGPT API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim() || '';
  
  if (!text) {
    throw new Error('Empty response from ChatGPT');
  }

  console.log('Raw ChatGPT correction response:', text.substring(0, 200) + '...');

  return parseCorrectionResponse(text, memberAnswer, correctAnswer, maxPoints, keywords);
}

function buildCorrectionPrompt(
  questionText: string,
  correctAnswer: string,
  memberAnswer: string,
  maxPoints: number,
  verseReference: string,
  keywords?: string[]
): string {
  
  return `Question: ${questionText}
Verse Reference: ${verseReference} (NIV - New International Version)
Model Answer: ${correctAnswer}
Student Answer: ${memberAnswer}
Maximum Points: ${maxPoints}
${keywords && keywords.length > 0 ? `Required Keywords: ${keywords.join(', ')}` : ''}

CRITICAL - CONTEXT-AWARE GRADING:
The question may already contain important context and details. Students should NOT be penalized for not repeating information that's already in the question. Focus on whether they answered WHAT WAS ASKED.

Example:
- Question: "What is the nature of God's wisdom that has been hidden and destined for our glory?"
- Answer: "A mystery" or "It's a mystery"
- This is CORRECT because the question already states "God's wisdom that has been hidden and destined for our glory"
- The student is answering "what is the nature" = "a mystery"
- DO NOT penalize for not repeating "hidden" or "destined for our glory" since it's in the question

IMPORTANT - BIBLE VERSION:
All questions and model answers are based on the NIV (New International Version) translation. The student's answer should be evaluated against the NIV text, NOT other translations. The Model Answer provided above is derived from the NIV verse text stored in our database.

GRADING PHILOSOPHY:
This is a SEMANTIC UNDERSTANDING test. The student must demonstrate comprehension of the passage's meaning and key concepts. Accept paraphrases, synonyms, and rewordings that preserve biblical accuracy. Focus on whether they understood the passage, NOT whether they memorized exact wording.

GRADING CRITERIA:
1. Semantic Accuracy (50%): Does the answer convey the correct biblical meaning from the passage?
2. Concept Grasp (35%): Are the core theological/narrative ideas present (even if worded differently)?
3. Reasonable Detail (15%): Does the answer show engagement with the passage (not just generic statements)?

${keywords && keywords.length > 0 ? `
KEYWORD & CONCEPT GUIDANCE:
- Key concepts from the passage: ${keywords.join(', ')}
- Accept synonyms, paraphrases, and related terms freely (e.g., "faithful" = "faithfulness" = "loyalty"; "grace" = "mercy" = "favor")
- One word can represent a whole concept if the meaning is clear
- Focus on whether the IDEA is present, not the exact word
- Missing keywords is OK if the concept is expressed differently
` : ''}

SCORING GUIDELINES (Be generous when meaning is correct):
- 90-100% (${Math.round(maxPoints * 0.9)}-${maxPoints} pts) = Answer conveys the main biblical meaning accurately (even if worded differently)
- 75-89% (${Math.round(maxPoints * 0.75)}-${Math.round(maxPoints * 0.89)} pts) = Good understanding shown, captures most key concepts
- 60-74% (${Math.round(maxPoints * 0.6)}-${Math.round(maxPoints * 0.74)} pts) = Partial understanding, some key ideas present
- 40-59% (${Math.round(maxPoints * 0.4)}-${Math.round(maxPoints * 0.59)} pts) = Limited understanding, major concepts missing
- 20-39% (${Math.round(maxPoints * 0.2)}-${Math.round(maxPoints * 0.39)} pts) = Minimal biblical content from the passage
- 0-19% (0-${Math.round(maxPoints * 0.19)} pts) = No meaningful connection to the passage or completely wrong

RED FLAGS (Score reductions, not automatic caps):
- Joke answers ("lol", "idk", "dunno") = 0%
- Direct contradictions to the passage = 0%
- Completely off-topic (wrong book/passage) = MAX 20%
- Extremely vague/generic (could apply to ANY passage) = MAX 50%
- Very short answers (under 15 characters) may deserve lower scores based on content

COMPARISON APPROACH (Prioritize meaning over wording):
1. What information is ALREADY in the question? (Students don't need to repeat this)
2. What is the question ACTUALLY ASKING for? (Focus on this)
3. Does the student answer convey the CORE IDEA being asked about?
4. Are there any contradictions or factual errors?
5. Is the answer specific enough to show they read the passage (not just guessing)?

CRITICAL GRADING PRINCIPLES:
- Students do NOT need to repeat context already stated in the question
- If the question asks "What is X about Y that has properties Z?", the answer only needs to address "What is X"
- REWARD semantic understanding - if the meaning is right, the wording doesn't matter
- ACCEPT paraphrases, synonyms, and rewordings freely
- ONE accurate word can represent a whole concept (e.g., "grace" alone can be worth full points)
- Concise, direct answers are GOOD if they correctly answer what was asked
- ONLY penalize if the answer is factually wrong, contradicts the passage, or shows no understanding
- Missing specific keywords is FINE if the concept is expressed another way
- Length does NOT equal quality - a short answer can be perfect

OUTPUT FORMAT (JSON only, no other text):
{
  "isCorrect": true,
 

EXAMPLES OF GOOD GRADING:
Question: "What is the nature of God's wisdom that has been hidden and destined for our glory?"
- Answer: "A mystery" → 90-100% (Directly answers "what is the nature", question already has the context)
- Answer: "It's a mystery" → 90-100% (Same as above, just fuller phrasing)
- Answer: "A hidden mystery" → 100% (Perfect, though "hidden" was in question already)

Question: "What did Paul say about love?"
- Answer: "It never fails" → 90-100% (Concise and correct)
- Answer: "Love never fails" → 100% (Perfect)
- Answer: "Love is patient and kind and never fails" → 100% (Comprehensive) "points": 18,
  "feedback": "Excellent answer covering all key points: grace given in Christ, enrichment in speech and knowledge, and testimony confirmed. Specific and accurate to the passage.",
  "reasoning": "Student demonstrates clear understanding with 5/6 keywords present and specific passage details included."
}

Grade this answer now (JSON only).`;
}

function parseCorrectionResponse(
  text: string,
  memberAnswer: string,
  correctAnswer: string,
  maxPoints: number,
  keywords?: string[]
): CorrectionResult {
  
  // Pre-check for obviously bad answers
  const memberLower = memberAnswer.toLowerCase().trim();
  
  // Check for joke/nonsense answers
  if (memberLower.length < 10 || 
      memberLower.includes('lol') || 
      memberLower.includes('what?') ||
      memberLower.includes('idk') ||
      memberLower.includes('i don\'t know') ||
      memberLower.includes('dunno') ||
      memberLower.match(/^[a-z]{1,3}$/)) {
    return {
      isCorrect: false,
      points: 0,
      feedback: "Please provide a serious, detailed answer based on the biblical passage.",
      reasoning: "Answer appears to be joke/nonsense or too brief to evaluate"
    };
  }

  // Try to extract JSON from AI response
  let jsonText = '';
  const jsonMatch = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  } else {
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      jsonText = text.slice(startIndex, endIndex + 1);
    } else {
      // No JSON found - throw error to surface the issue
      console.error('❌ No JSON found in AI response:', text.substring(0, 200));
      throw new Error('AI response did not contain valid JSON. Raw response: ' + text.substring(0, 200));
    }
  }

  // Clean up JSON
  jsonText = jsonText
    .replace(/\n/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .replace(/([{,]\s*)(\w+):/g, '$1"$2":')
    .replace(/:\s*([^",{\[\]}\s]+)(?=\s*[,}])/g, ': "$1"')
    .replace(/:\s*"(\d+)"/g, ': $1')
    .replace(/:\s*"(true|false)"/g, ': $1');

  let result: CorrectionResult;
  
  try {
    result = JSON.parse(jsonText);
  } catch (parseError) {
    console.error('❌ JSON parse failed. Cleaned JSON:', jsonText.substring(0, 200));
    throw new Error('Failed to parse AI response as JSON. Cleaned text: ' + jsonText.substring(0, 200));
  }

  // Validate and adjust AI result using keyword analysis
  const { keywordMatchRatio, foundKeywords, targetKeywords } = analyzeKeywords(
    memberAnswer, correctAnswer, keywords
  );

  let adjustedPoints = result.points;
  let adjustedFeedback = result.feedback;
  
  // Cross-check AI grading with keyword analysis (more lenient approach)
  const aiScoreRatio = result.points / maxPoints;
  const keywordScoreRatio = keywordMatchRatio;
  
  // Only adjust if there's a MAJOR discrepancy and answer is very short
  if (aiScoreRatio > 0.8 && keywordScoreRatio < 0.3 && memberAnswer.length < 25) {
    adjustedPoints = Math.round(maxPoints * 0.7);
    adjustedFeedback += ` (Score adjusted: answer may lack passage-specific details)`;
    console.log('⚠️ AI score slightly reduced due to very short answer with few concepts');
  }
  
  // Boost score if AI was too harsh but keywords are present
  if (aiScoreRatio < 0.5 && keywordScoreRatio > 0.6) {
    adjustedPoints = Math.max(adjustedPoints, Math.round(maxPoints * 0.75));
    adjustedFeedback += ` (Score boosted: strong concept coverage detected)`;
    console.log('✓ AI score boosted due to good keyword match');
  }

  // Only cap extremely short answers that got high scores
  if (memberAnswer.length < 15 && adjustedPoints > maxPoints * 0.5) {
    adjustedPoints = Math.round(maxPoints * 0.5);
    adjustedFeedback += ` (Score capped: answer extremely brief)`;
  }

  // Ensure reasonable bounds
  adjustedPoints = Math.max(0, Math.min(maxPoints, adjustedPoints));
  const isCorrect = adjustedPoints >= maxPoints * 0.8;

  const finalResult: CorrectionResult = {
    isCorrect,
    points: adjustedPoints,
    feedback: adjustedFeedback,
    reasoning: result.reasoning + ` | Keywords: ${foundKeywords.length}/${targetKeywords.length}`
  };

  console.log('Final correction result:', finalResult);
  return finalResult;
}

function analyzeKeywords(
  memberAnswer: string,
  correctAnswer: string,
  keywords?: string[]
): { keywordMatchRatio: number; foundKeywords: string[]; targetKeywords: string[] } {
  
  // Enhanced keyword extraction optimized for NIV biblical text
  const extractKeywords = (text: string): string[] => {
    // Extended stopwords including common biblical filler words
    const stopWords = new Set([
      'this', 'that', 'with', 'from', 'they', 'them', 'their', 'there', 
      'where', 'when', 'what', 'which', 'while', 'will', 'would', 'could', 
      'should', 'have', 'been', 'about', 'into', 'through', 'during', 
      'before', 'after', 'above', 'below', 'between', 'also', 'then',
      'these', 'those', 'were', 'being', 'does', 'said', 'says', 'very',
      'each', 'some', 'such', 'only', 'both', 'more', 'most', 'other',
      'your', 'their', 'there', 'here', 'make', 'made', 'because'
    ]);
    
    // Extract words while preserving important biblical terms
    const words = text
      .toLowerCase()
      .replace(/[^\w\s'-]/g, ' ') // Preserve hyphens and apostrophes for biblical terms
      .split(/\s+/)
      .filter(word => {
        // Keep words that are:
        // 1. At least 3 characters (but allow "God")
        // 2. Not in stopwords
        // 3. Not just numbers
        const cleanWord = word.replace(/['-]/g, '');
        return (
          (cleanWord.length >= 3 || cleanWord === 'god') && 
          !stopWords.has(cleanWord) && 
          !/^\d+$/.test(cleanWord)
        );
      });
    
    // Remove duplicates while preserving order
    return [...new Set(words)];
  };

  // Use provided keywords if available, otherwise extract from correct answer
  const targetKeywords = keywords && keywords.length > 0 
    ? keywords.map(k => k.toLowerCase())
    : extractKeywords(correctAnswer);

  const memberWords = extractKeywords(memberAnswer);

  // Advanced keyword matching with partial matches, word forms, and synonyms
  const foundKeywords = targetKeywords.filter(keyword => 
    memberWords.some(word => {
      const keywordClean = keyword.replace(/['-]/g, '');
      const wordClean = word.replace(/['-]/g, '');
      
      // 1. Exact match
      if (keywordClean === wordClean) return true;
      
      // 2. Substring match (allows for word forms: believe/believed/believing)
      if (wordClean.includes(keywordClean) || keywordClean.includes(wordClean)) {
        // Only count if at least 4 characters match to avoid false positives
        const minLen = Math.min(keywordClean.length, wordClean.length);
        if (minLen >= 4) return true;
      }
      
      // 3. Word stem matching (remove common suffixes)
      const stem = (w: string) => w.replace(/(ing|ed|s|es|ness|ful|ly|tion|sion)$/i, '');
      if (stem(keywordClean) === stem(wordClean)) return true;
      
      // 4. Check for common biblical synonyms and related concepts
      const synonymPairs = [
        ['faithful', 'faithfulness', 'fidelity', 'loyal', 'loyalty', 'devoted', 'devotion'],
        ['grace', 'gracious', 'mercy', 'merciful', 'favor', 'kindness', 'compassion', 'compassionate'],
        ['testimony', 'witness', 'testify', 'testified', 'witnessing'],
        ['establish', 'confirm', 'strengthen', 'established', 'confirmed', 'strengthened'],
        ['sustain', 'uphold', 'maintain', 'keep', 'support', 'sustaining', 'upheld'],
        ['love', 'loved', 'loving', 'affection', 'devotion', 'beloved'],
        ['save', 'saved', 'salvation', 'rescue', 'deliver', 'deliverance', 'redeemed', 'redemption'],
        ['believe', 'faith', 'trust', 'believed', 'believing', 'faithful'],
        ['holy', 'sacred', 'sanctified', 'holiness', 'consecrated', 'sanctify'],
        ['righteous', 'righteousness', 'just', 'justice', 'upright', 'justification'],
        ['praise', 'worship', 'glorify', 'honor', 'exalt', 'glory', 'honored'],
        ['forgive', 'forgiveness', 'pardon', 'forgave', 'pardoned'],
        ['eternal', 'everlasting', 'forever', 'perpetual', 'endless'],
        ['christ', 'jesus', 'lord', 'messiah', 'savior', 'saviour'],
        ['teach', 'taught', 'teaching', 'instruct', 'instruction', 'teacher'],
        ['power', 'powerful', 'mighty', 'strength', 'strong', 'mightily'],
        ['bless', 'blessed', 'blessing', 'blessings', 'blesses'],
        ['spirit', 'spiritual', 'spiritually'],
        ['word', 'words', 'scripture', 'scriptures'],
        ['pray', 'prayer', 'prayers', 'praying', 'prayed']
      ];
      
      for (const synonyms of synonymPairs) {
        const keywordInSet = synonyms.some(syn => keywordClean.includes(syn) || syn.includes(keywordClean));
        const wordInSet = synonyms.some(syn => wordClean.includes(syn) || syn.includes(wordClean));
        if (keywordInSet && wordInSet) return true;
      }
      
      return false;
    })
  );

  const keywordMatchRatio = targetKeywords.length > 0 
    ? foundKeywords.length / targetKeywords.length 
    : 0;

  console.log('Enhanced keyword analysis:', { 
    targetKeywords: targetKeywords.length <= 10 ? targetKeywords : `${targetKeywords.length} keywords`,
    foundKeywords: foundKeywords.length <= 10 ? foundKeywords : `${foundKeywords.length} found`,
    keywordMatchRatio: `${(keywordMatchRatio * 100).toFixed(0)}%`,
    matchDetails: `${foundKeywords.length}/${targetKeywords.length} concepts`,
    answerLength: memberAnswer.length,
    extractedFromNIV: keywords && keywords.length > 0 ? 'Using provided keywords' : 'Auto-extracted from answer'
  });

  return { keywordMatchRatio, foundKeywords, targetKeywords };
}

function createKeywordFallbackCorrection(
  memberAnswer: string,
  correctAnswer: string,
  maxPoints: number,
  keywords?: string[]
): CorrectionResult {
  
  console.error('Using keyword-based fallback correction (AI parsing failed)');
  
  const { keywordMatchRatio, foundKeywords, targetKeywords } = analyzeKeywords(
    memberAnswer, correctAnswer, keywords
  );
  
  let fallbackPoints = 0;
  let feedback = '';
  
  const answerLength = memberAnswer.length;
  
  // Calculate base score from keyword matching (more lenient)
  let keywordScore = keywordMatchRatio;
  
  // Adjust for answer length (but be more forgiving)
  if (answerLength < 15) {
    keywordScore *= 0.4; // Penalize extremely short answers
    feedback = `Answer very brief (${answerLength} characters). `;
  } else if (answerLength < 30) {
    keywordScore *= 0.7; // Mild penalty for short answers
    feedback = `Answer could use more detail. `;
  }
  
  // Calculate points (more generous thresholds)
  if (keywordScore >= 0.7) {
    fallbackPoints = Math.round(maxPoints * 0.9);
    feedback += `Strong answer with ${foundKeywords.length}/${targetKeywords.length} key concepts covered.`;
  } else if (keywordScore >= 0.5) {
    fallbackPoints = Math.round(maxPoints * 0.8);
    feedback += `Good answer covering main concepts. Found ${foundKeywords.length}/${targetKeywords.length} key ideas.`;
  } else if (keywordScore >= 0.3) {
    fallbackPoints = Math.round(maxPoints * 0.65);
    feedback += `Adequate answer showing understanding. Found ${foundKeywords.length}/${targetKeywords.length} key concepts.`;
  } else if (keywordScore >= 0.15) {
    fallbackPoints = Math.round(maxPoints * 0.45);
    feedback += `Partial understanding shown. Found ${foundKeywords.length}/${targetKeywords.length} key concepts.`;
  } else {
    fallbackPoints = Math.round(maxPoints * 0.2);
    feedback += `Answer lacks specific details from the passage. Found ${foundKeywords.length}/${targetKeywords.length} key concepts.`;
  }

  return {
    isCorrect: fallbackPoints >= maxPoints * 0.8,
    points: fallbackPoints,
    feedback: feedback,
    reasoning: `Keyword-based scoring: ${(keywordMatchRatio * 100).toFixed(0)}% concept coverage, ${answerLength} characters`
  };
}

// Batch correction for all descriptive answers in a quiz
export async function correctAllDescriptiveAnswers(
  quizId: number
): Promise<{ corrected: number; errors: string[] }> {
  
  try {
    const response = await fetch(`/api/admin/quiz/${quizId}/correct-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Correction API failed');
    }

    return await response.json();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return { corrected: 0, errors: [message] };
  }
}