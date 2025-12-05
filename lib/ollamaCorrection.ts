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
  verseReference: string
): Promise<CorrectionResult> {
  
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        stream: false,
        prompt: `
You are a STRICT Bible quiz grader. Grade this descriptive answer carefully.

Question: ${questionText}
Verse Reference: ${verseReference}
Expected Answer: ${correctAnswer}
Student Answer: ${memberAnswer}
Maximum Points: ${maxPoints}

GRADING CRITERIA (BE STRICT):
1. Content Accuracy (60%): Does the answer contain the key biblical concepts from the expected answer?
2. Scripture Understanding (30%): Does it show understanding of the passage?
3. Logical Flow (10%): Is the answer well-structured?

SCORING GUIDELINES:
- 90-100% = Excellent, comprehensive answer covering all key points
- 70-89% = Good answer missing 1-2 minor points  
- 50-69% = Adequate answer missing major elements
- 30-49% = Poor answer with minimal understanding
- 10-29% = Very poor answer showing little knowledge
- 0-9% = No understanding or irrelevant answer

IMPORTANT: 
- If student answer is completely off-topic or nonsensical like "lol what?" = 0 points
- If student answer is very short (under 20 characters) = maximum 20% points
- Check for KEY WORDS from expected answer in student response
- Don't give high scores for vague or generic answers

Respond with ONLY this JSON format:
{
  "isCorrect": false,
  "points": 3,
  "feedback": "Answer shows minimal understanding. Missing key biblical concepts.",
  "reasoning": "Student answer lacks specific content from the passage"
}

Grade the answer now:
        `.trim(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.response?.trim() || '';
    
    console.log('Raw Ollama response:', text.substring(0, 200) + '...');

    // Pre-check for obviously bad answers
    const memberLower = memberAnswer.toLowerCase().trim();
    
    // Check for joke/nonsense answers
    if (memberLower.length < 10 || 
        memberLower.includes('lol') || 
        memberLower.includes('what?') ||
        memberLower.includes('idk') ||
        memberLower.includes('dunno') ||
        memberLower.match(/^[a-z]{1,3}$/)) {
      return {
        isCorrect: false,
        points: 0,
        feedback: "Please provide a serious, detailed answer based on the biblical passage.",
        reasoning: "Answer appears to be joke/nonsense or too brief"
      };
    }

    // Extract key words from expected answer for comparison
    const expectedKeywords = correctAnswer
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'they', 'them', 'their', 'there', 'where', 'when', 'what', 'which', 'while', 'will', 'would', 'could', 'should'].includes(word));

    const memberWords = memberAnswer
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/);

    const foundKeywords = expectedKeywords.filter(keyword => 
      memberWords.some(word => word.includes(keyword) || keyword.includes(word))
    );

    const keywordMatch = expectedKeywords.length > 0 ? foundKeywords.length / expectedKeywords.length : 0;

    console.log('Keyword analysis:', { expectedKeywords, foundKeywords, keywordMatch });

    // Try to extract JSON
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
      console.error('JSON parse failed, using strict fallback');
      
      // Strict fallback based on keyword matching and length
      let fallbackPoints = 0;
      
      if (keywordMatch >= 0.7 && memberAnswer.length > 50) {
        fallbackPoints = Math.round(maxPoints * 0.7);
      } else if (keywordMatch >= 0.5 && memberAnswer.length > 30) {
        fallbackPoints = Math.round(maxPoints * 0.5);
      } else if (keywordMatch >= 0.3 && memberAnswer.length > 20) {
        fallbackPoints = Math.round(maxPoints * 0.3);
      } else {
        fallbackPoints = 0;
      }

      return {
        isCorrect: fallbackPoints >= maxPoints * 0.8,
        points: fallbackPoints,
        feedback: fallbackPoints > 0 
          ? `Partial credit given. Answer shows some understanding but missing key concepts. Found ${foundKeywords.length}/${expectedKeywords.length} key elements.`
          : "Answer lacks biblical content from the passage. Please study the verses and provide specific details.",
        reasoning: "Strict fallback scoring based on keyword analysis"
      };
    }

    // Validate and adjust AI result based on our strict checks
    if (keywordMatch < 0.2) {
      // If very few keywords found, cap the points
      result.points = Math.min(result.points, Math.round(maxPoints * 0.2));
      result.feedback += " (Points reduced due to missing key biblical concepts)";
    }

    // Ensure reasonable bounds
    result.points = Math.max(0, Math.min(maxPoints, result.points));
    result.isCorrect = result.points >= maxPoints * 0.8;

    console.log('Final strict result:', result);
    return result;

  } catch (error: any) {
    console.error('Correction error:', error);
    
    // Very conservative fallback
    return {
      isCorrect: false,
      points: Math.round(maxPoints * 0.1), // Very minimal points for effort
      feedback: "Answer could not be properly evaluated. Please ensure your response directly addresses the biblical passage with specific details.",
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