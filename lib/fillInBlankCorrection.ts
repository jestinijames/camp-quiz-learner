export function correctFillInBlank(
  expectedAnswer: string,
  memberAnswer: string,
  maxPoints: number
): { isCorrect: boolean; points: number; feedback: string } {
  
  // Normalize both answers for comparison
  const normalizeAnswer = (answer: string) => {
    return answer
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' '); // Normalize spaces
  };

  const expectedNormalized = normalizeAnswer(expectedAnswer);
  const memberNormalized = normalizeAnswer(memberAnswer);

  console.log('Fill-in-blank comparison:', { expectedNormalized, memberNormalized });

  // Check for exact match (after normalization)
  if (expectedNormalized === memberNormalized) {
    return {
      isCorrect: true,
      points: maxPoints,
      feedback: "Correct!"
    };
  }

  // For multiple words (like "Crispus, Gaius"), check if all words are present
  const expectedWords = expectedNormalized.split(/[\s,]+/).filter(w => w.length > 0);
  const memberWords = memberNormalized.split(/[\s,]+/).filter(w => w.length > 0);

  if (expectedWords.length > 1) {
    // Multi-word answer - check each word
    const correctWords = expectedWords.filter(word => 
      memberWords.some(memberWord => 
        memberWord === word || 
        word.includes(memberWord) || 
        memberWord.includes(word)
      )
    );

    const percentage = correctWords.length / expectedWords.length;
    
    if (percentage === 1) {
      return {
        isCorrect: true,
        points: maxPoints,
        feedback: "Correct! All words found."
      };
    } else if (percentage >= 0.5) {
      const partialPoints = Math.round(maxPoints * percentage);
      return {
        isCorrect: false,
        points: partialPoints,
        feedback: `Partial credit: ${correctWords.length}/${expectedWords.length} words correct.`
      };
    } else {
      return {
        isCorrect: false,
        points: 0,
        feedback: `Incorrect. Expected: ${expectedAnswer}`
      };
    }
  } else {
    // Single word answer - use fuzzy matching for typos
    const expectedWord = expectedWords[0];
    const memberWord = memberWords[0] || '';

    // Simple fuzzy matching for typos
    const similarity = calculateStringSimilarity(expectedWord, memberWord);
    
    if (similarity >= 0.8) {
      return {
        isCorrect: true,
        points: maxPoints,
        feedback: "Correct!"
      };
    } else if (similarity >= 0.6) {
      const partialPoints = Math.round(maxPoints * 0.7);
      return {
        isCorrect: false,
        points: partialPoints,
        feedback: `Close! Check spelling. Expected: ${expectedAnswer}`
      };
    } else {
      return {
        isCorrect: false,
        points: 0,
        feedback: `Incorrect. Expected: ${expectedAnswer}`
      };
    }
  }
}

function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}