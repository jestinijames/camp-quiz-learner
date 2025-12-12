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
  
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        stream: false,
        prompt: `
You are a STRICT but FAIR Bible quiz grader. Your job is to evaluate biblical understanding and accuracy.

Question: ${questionText}
Verse Reference: ${verseReference}
Model Answer: ${correctAnswer}
Student Answer: ${memberAnswer}
Maximum Points: ${maxPoints}
${keywords && keywords.length > 0 ? `Required Keywords: ${keywords.join(', ')}` : ''}

GRADING PHILOSOPHY:
This is a BIBLICAL ACCURACY test. The student must demonstrate understanding of the specific passage content, not general Bible knowledge.

GRADING CRITERIA:
1. Biblical Accuracy (50%): Does the answer accurately reflect what the passage says?
2. Key Concept Coverage (30%): Are the essential theological/narrative points addressed?
3. Specificity (20%): Does the answer include specific details from the passage (names, actions, sequences)?

${keywords && keywords.length > 0 ? `
KEYWORD SCORING (Use this as a foundation):
- The question generator identified these critical keywords: ${keywords.join(', ')}
- Count how many keywords appear in the student's answer
- Keywords found: Award base points (${keywords.length} keywords = 100% keyword score)
- Missing keywords significantly reduce the score
- Synonyms or closely related terms can count (e.g., "faithful" for "faithfulness")
` : ''}

SCORING GUIDELINES:
- 90-100% (${Math.round(maxPoints * 0.9)}-${maxPoints} pts) = Comprehensive answer with all key biblical points, specific details, accurate understanding
- 70-89% (${Math.round(maxPoints * 0.7)}-${Math.round(maxPoints * 0.89)} pts) = Good answer covering most key points with minor gaps
- 50-69% (${Math.round(maxPoints * 0.5)}-${Math.round(maxPoints * 0.69)} pts) = Adequate answer missing significant concepts or lacking specificity
- 30-49% (${Math.round(maxPoints * 0.3)}-${Math.round(maxPoints * 0.49)} pts) = Poor answer showing limited understanding
- 10-29% (${Math.round(maxPoints * 0.1)}-${Math.round(maxPoints * 0.29)} pts) = Minimal biblical content, mostly generic or vague
- 0-9% (0-${Math.round(maxPoints * 0.09)} pts) = No meaningful biblical content or completely off-topic

RED FLAGS (Automatic score caps):
- Generic/vague answers without specific passage details = MAX 40%
- Answer length under 30 characters = MAX 20%
- Joke answers ("lol", "idk", "dunno") = 0%
- Answers that contradict the passage = 0%
- Answers about wrong passage/book = MAX 10%

COMPARISON APPROACH:
1. Check if student answer contains the same biblical facts as model answer
2. Check for keyword presence (both exact and synonyms)
3. Verify no contradictions with the passage
4. Assess level of detail and specificity
5. Determine if student truly understood the passage or guessed/generalized

IMPORTANT:
- Don't penalize different wording if meaning is preserved
- DO penalize vague, generic statements that could apply to any Bible passage
- High scores require SPECIFIC details from THIS passage
- Missing ${keywords && keywords.length > 0 ? 'required keywords' : 'key concepts'} = significant point deduction

OUTPUT FORMAT (JSON only, no other text):
{
  "isCorrect": true,
  "points": 18,
  "feedback": "Excellent answer covering all key points: grace given in Christ, enrichment in speech and knowledge, and testimony confirmed. Specific and accurate to the passage.",
  "reasoning": "Student demonstrates clear understanding with 5/6 keywords present and specific passage details included."
}

Grade this answer now (JSON only):
        `.trim(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.response?.trim() || '';
    
    console.log('Raw Ollama correction response:', text.substring(0, 200) + '...');

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

    // Enhanced keyword extraction and matching
    const extractKeywords = (text: string): string[] => {
      const stopWords = new Set([
        'this', 'that', 'with', 'from', 'they', 'them', 'their', 'there', 
        'where', 'when', 'what', 'which', 'while', 'will', 'would', 'could', 
        'should', 'have', 'been', 'about', 'into', 'through', 'during', 
        'before', 'after', 'above', 'below', 'between', 'also', 'then'
      ]);
      
      return text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word));
    };

    // Use provided keywords if available, otherwise extract from correct answer
    const targetKeywords = keywords && keywords.length > 0 
      ? keywords.map(k => k.toLowerCase())
      : extractKeywords(correctAnswer);

    const memberWords = extractKeywords(memberAnswer);

    // More sophisticated keyword matching (handles partial matches and synonyms)
    const foundKeywords = targetKeywords.filter(keyword => 
      memberWords.some(word => {
        // Exact match or substring match
        if (word.includes(keyword) || keyword.includes(word)) return true;
        
        // Check for common biblical synonyms
        const synonymPairs = [
          ['faithful', 'faithfulness', 'fidelity'],
          ['grace', 'gracious', 'mercy'],
          ['testimony', 'witness', 'testify'],
          ['establish', 'confirm', 'strengthen'],
          ['sustain', 'uphold', 'maintain', 'keep']
        ];
        
        for (const synonyms of synonymPairs) {
          if (synonyms.includes(keyword) && synonyms.some(syn => word.includes(syn))) {
            return true;
          }
        }
        
        return false;
      })
    );

    const keywordMatchRatio = targetKeywords.length > 0 
      ? foundKeywords.length / targetKeywords.length 
      : 0;

    console.log('Enhanced keyword analysis:', { 
      targetKeywords, 
      foundKeywords, 
      keywordMatchRatio,
      answerLength: memberAnswer.length 
    });

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
        throw new Error('No JSON found in response');
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
      console.error('JSON parse failed, using intelligent fallback');
      
      // Intelligent fallback based on keyword matching, length, and content quality
      let fallbackPoints = 0;
      let feedback = '';
      
      const answerLength = memberAnswer.length;
      
      // Calculate base score from keyword matching
      let keywordScore = keywordMatchRatio;
      
      // Adjust for answer length and detail
      if (answerLength < 30) {
        keywordScore *= 0.3; // Penalize very short answers
        feedback = `Answer too brief (${answerLength} characters). Need more specific biblical details. `;
      } else if (answerLength < 60) {
        keywordScore *= 0.6; // Penalize short answers
        feedback = `Answer lacks detail. `;
      }
      
      // Calculate points
      if (keywordScore >= 0.8 && answerLength >= 60) {
        fallbackPoints = Math.round(maxPoints * 0.85);
        feedback += `Strong answer with ${foundKeywords.length}/${targetKeywords.length} key concepts covered.`;
      } else if (keywordScore >= 0.6 && answerLength >= 50) {
        fallbackPoints = Math.round(maxPoints * 0.7);
        feedback += `Good answer but missing some key points. Found ${foundKeywords.length}/${targetKeywords.length} key concepts.`;
      } else if (keywordScore >= 0.4 && answerLength >= 30) {
        fallbackPoints = Math.round(maxPoints * 0.5);
        feedback += `Adequate answer showing partial understanding. Found ${foundKeywords.length}/${targetKeywords.length} key concepts.`;
      } else if (keywordScore >= 0.2) {
        fallbackPoints = Math.round(maxPoints * 0.3);
        feedback += `Limited understanding shown. Only ${foundKeywords.length}/${targetKeywords.length} key concepts present.`;
      } else {
        fallbackPoints = Math.round(maxPoints * 0.1);
        feedback += `Answer lacks biblical specifics from the passage. Found ${foundKeywords.length}/${targetKeywords.length} key concepts.`;
      }

      return {
        isCorrect: fallbackPoints >= maxPoints * 0.8,
        points: fallbackPoints,
        feedback: feedback,
        reasoning: `Keyword-based scoring: ${(keywordMatchRatio * 100).toFixed(0)}% concept coverage, ${answerLength} characters`
      };
    }

    // Validate and adjust AI result using our keyword analysis
    let adjustedPoints = result.points;
    let adjustedFeedback = result.feedback;
    
    // Cross-check AI grading with keyword analysis
    const aiScoreRatio = result.points / maxPoints;
    const keywordScoreRatio = keywordMatchRatio;
    
    // If AI gave high score but keywords are missing, cap the score
    if (aiScoreRatio > 0.7 && keywordScoreRatio < 0.5) {
      adjustedPoints = Math.round(maxPoints * 0.6);
      adjustedFeedback += ` (Score adjusted: missing key biblical concepts from passage)`;
      console.log('⚠️ AI score reduced due to low keyword match');
    }
    
    // If AI gave low score but keywords are present, boost slightly
    if (aiScoreRatio < 0.4 && keywordScoreRatio > 0.7 && memberAnswer.length > 50) {
      adjustedPoints = Math.max(adjustedPoints, Math.round(maxPoints * 0.6));
      adjustedFeedback += ` (Score adjusted: good keyword coverage detected)`;
      console.log('✓ AI score boosted due to good keyword match');
    }

    // Very short answers should be capped
    if (memberAnswer.length < 30 && adjustedPoints > maxPoints * 0.3) {
      adjustedPoints = Math.round(maxPoints * 0.3);
      adjustedFeedback += ` (Score capped: answer too brief for full credit)`;
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

  } catch (error: any) {
    console.error('Correction error:', error);
    
    // Very conservative fallback
    return {
      isCorrect: false,
      points: Math.round(maxPoints * 0.15), // Minimal points for effort
      feedback: "Answer could not be properly evaluated due to system error. Please ensure your response directly addresses the biblical passage with specific details from the verses.",
      reasoning: `System error during correction: ${error.message}`
    };
  }
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