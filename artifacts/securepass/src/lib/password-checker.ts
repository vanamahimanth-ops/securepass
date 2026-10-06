export type PasswordStrength =
  | "Very Weak"
  | "Weak"
  | "Fair"
  | "Strong"
  | "Very Strong";

export type LengthCategory = "1-7" | "8-11" | "12-15" | "16+";

export interface PasswordAnalysis {
  score: number;
  strength: PasswordStrength;
  lengthCategory: LengthCategory;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  hasSequence: boolean;
  hasRepeatedCharacters: boolean;
  suggestions: string[];
}

const commonWeakPatterns = [
  "password",
  "123456",
  "123456789",
  "qwerty",
  "admin",
  "welcome",
  "letmein",
  "iloveyou",
  "monkey",
  "dragon",
];

const predictableSequences = [
  "0123",
  "1234",
  "2345",
  "3456",
  "4567",
  "5678",
  "6789",
  "abcd",
  "bcde",
  "cdef",
  "defg",
  "efgh",
  "qwer",
  "wert",
  "erty",
  "asdf",
  "sdfg",
  "zxcv",
];

function containsPredictableSequence(value: string): boolean {
  const normalized = value.toLowerCase();
  return predictableSequences.some((sequence) => {
    const reversed = [...sequence].reverse().join("");
    return normalized.includes(sequence) || normalized.includes(reversed);
  });
}

function strengthForScore(score: number): PasswordStrength {
  if (score < 20) return "Very Weak";
  if (score < 40) return "Weak";
  if (score < 60) return "Fair";
  if (score < 80) return "Strong";
  return "Very Strong";
}

/**
 * Provides an educational estimate in browser memory only.
 * The password is never returned, persisted, or sent to another service.
 */
export function analyzePassword(password: string): PasswordAnalysis {
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const hasSequence = containsPredictableSequence(password);
  const hasRepeatedCharacters = /(.)\1{2,}/u.test(password);
  const normalized = password.toLowerCase().trim();
  const isCommonWeakPassword = commonWeakPatterns.some((pattern) =>
    normalized.includes(pattern),
  );

  let lengthCategory: LengthCategory;
  let score = 0;
  if (password.length < 8) {
    lengthCategory = "1-7";
    score = 6;
  } else if (password.length < 12) {
    lengthCategory = "8-11";
    score = 17;
  } else if (password.length < 16) {
    lengthCategory = "12-15";
    score = 30;
  } else {
    lengthCategory = "16+";
    score = 37;
  }

  score +=
    [hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length *
    12;
  if (password.length >= 20) score += 4;
  if (password.length < 8) score -= 18;
  if (hasSequence) score -= 15;
  if (hasRepeatedCharacters) score -= 8;
  if (isCommonWeakPassword) score -= 35;
  score = Math.max(0, Math.min(100, score));

  const suggestions: string[] = [];
  if (password.length < 12) {
    suggestions.push("Try a longer passphrase with at least 12 characters.");
  }
  if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
    suggestions.push("Use a varied mix of letters, numbers, and symbols.");
  }
  if (hasSequence) {
    suggestions.push("Avoid keyboard walks and alphabetical or numeric sequences.");
  }
  if (hasRepeatedCharacters) {
    suggestions.push("Avoid long runs of the same character.");
  }
  if (isCommonWeakPassword) {
    suggestions.push("Avoid common words and widely used password patterns.");
  }
  suggestions.push("Avoid personal information and never reuse a password.");
  suggestions.push("Consider using a password manager to create unique passwords.");

  return {
    score,
    strength: strengthForScore(score),
    lengthCategory,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial,
    hasSequence,
    hasRepeatedCharacters,
    suggestions: [...new Set(suggestions)],
  };
}
