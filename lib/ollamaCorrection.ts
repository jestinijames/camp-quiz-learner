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
You are a Bible quiz grader. Grade the student's answer and respond with ONLY valid JSON.

Question: ${questionText}
Verse: ${verseReference}
Expected: ${correctAnswer}
Student Answer: ${memberAnswer}
Max Points: ${maxPoints}

IMPORTANT: Respond with ONLY this JSON format, no other text:

{
  "isCorrect": true,
  "points": 8,
  "feedback": "Good understanding of the passage",
  "reasoning": "Student shows biblical knowledge"
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

    // Try to extract JSON more carefully
    let jsonText = '';
    
    // Method 1: Look for complete JSON object
    const jsonMatch = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    } else {
      // Method 2: Find start and end braces
      const startIndex = text.indexOf('{');
      const endIndex = text.lastIndexOf('}');
      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        jsonText = text.slice(startIndex, endIndex + 1);
      } else {
        throw new Error('No JSON found in response');
      }
    }

    console.log('Extracted JSON:', jsonText);

    // Clean up common JSON issues
    jsonText = jsonText
      .replace(/\n/g, ' ')                    // Remove newlines
      .replace(/\t/g, ' ')                    // Remove tabs  
      .replace(/\s+/g, ' ')                   // Normalize spaces
      .replace(/,\s*}/g, '}')                 // Remove trailing commas
      .replace(/,\s*]/g, ']')                 // Remove trailing commas in arrays
      .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Add quotes to unquoted keys
      .replace(/:\s*([^",{\[\]}\s]+)(?=\s*[,}])/g, ': "$1"') // Quote unquoted string values
      .replace(/:\s*"(\d+)"/g, ': $1')        // Unquote numbers
      .replace(/:\s*"(true|false)"/g, ': $1'); // Unquote booleans

    let result: CorrectionResult;
    
    try {
      result = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('JSON parse failed:', parseError);
      console.error('Cleaned JSON:', jsonText);
      
      // Fallback: Create a default result
      const studentEffort = memberAnswer.length > 10;
      return {
        isCorrect: false,
        points: studentEffort ? Math.round(maxPoints * 0.3) : 0,
        feedback: studentEffort 
          ? "Answer shows effort but needs improvement. Review the passage again." 
          : "Please provide a more detailed answer.",
        reasoning: "AI parsing failed, fallback scoring applied"
      };
    }

    // Validate the result
    if (typeof result.isCorrect !== 'boolean') {
      result.isCorrect = false;
    }
    
    if (typeof result.points !== 'number' || result.points < 0 || result.points > maxPoints) {
      result.points = Math.max(0, Math.min(maxPoints, Math.round(maxPoints * 0.5)));
    }
    
    if (typeof result.feedback !== 'string') {
      result.feedback = "Answer reviewed by AI grader.";
    }
    
    if (typeof result.reasoning !== 'string') {
      result.reasoning = "Automated correction applied.";
    }

    console.log('Final result:', result);
    return result;

  } catch (error: any) {
    console.error('Correction error:', error);
    
    // Fallback scoring based on answer length and effort
    const answerLength = memberAnswer.length;
    const hasKeywords = correctAnswer.toLowerCase().split(' ').some(word => 
      word.length > 3 && memberAnswer.toLowerCase().includes(word)
    );
    
    let fallbackPoints = 0;
    if (answerLength > 20 && hasKeywords) {
      fallbackPoints = Math.round(maxPoints * 0.6);
    } else if (answerLength > 10) {
      fallbackPoints = Math.round(maxPoints * 0.3);
    }

    return {
      isCorrect: fallbackPoints >= maxPoints * 0.8,
      points: fallbackPoints,
      feedback: fallbackPoints > 0 
        ? "Partial credit given. Consider reviewing the biblical passage for more accuracy."
        : "Please provide a more complete answer based on the scripture.",
      reasoning: `Fallback correction due to AI error: ${error.message}`
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