import { createClient } from "@supabase/supabase-js";

type StrengthLabel =
  | "Very Weak"
  | "Weak"
  | "Fair"
  | "Strong"
  | "Very Strong";
type LengthLabel = "1-7" | "8-11" | "12-15" | "16+";

export interface PasswordEvaluationInput {
  strength: StrengthLabel;
  length_category: LengthLabel;
  has_uppercase: boolean;
  has_lowercase: boolean;
  has_number: boolean;
  has_special: boolean;
  has_sequence: boolean;
}

export interface QuizResultInput {
  score: number;
  total_questions: number;
}

export interface ChecklistInput {
  strong_unique_passwords: boolean;
  avoids_personal_information: boolean;
  password_manager: boolean;
  multi_factor_authentication: boolean;
  avoids_password_sharing: boolean;
  recognizes_phishing: boolean;
  avoids_predictable_patterns: boolean;
  reviews_security_settings: boolean;
}

export interface AggregateBucket {
  label: string;
  count: number;
}

export interface SecurityAggregates {
  strength: AggregateBucket[];
  length: AggregateBucket[];
  characterTypes: AggregateBucket[];
  totals: {
    evaluations: number;
    quizzes: number;
    checklists: number;
  };
}

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
const supabasePublishableKey =
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabaseClient =
  supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null;

export const supabaseEnabled = supabaseClient !== null;

function requireSupabaseClient() {
  if (!supabaseClient) {
    throw new Error(
      "Anonymous saving is unavailable because Supabase is not configured.",
    );
  }
  return supabaseClient;
}

async function insertAnonymousRecord(
  table: "password_evaluations" | "quiz_results" | "security_checklists",
  payload: Record<string, unknown>,
): Promise<void> {
  const client = requireSupabaseClient();
  try {
    const { error } = await client.from(table).insert(payload);
    if (error) {
      throw new Error(
        "The anonymous result could not be saved. Check the Supabase setup.",
      );
    }
  } catch {
    throw new Error("The anonymous result could not be saved.");
  }
}

export function savePasswordEvaluation(
  evaluation: PasswordEvaluationInput,
): Promise<void> {
  return insertAnonymousRecord("password_evaluations", {
    strength: evaluation.strength,
    length_category: evaluation.length_category,
    has_uppercase: evaluation.has_uppercase,
    has_lowercase: evaluation.has_lowercase,
    has_number: evaluation.has_number,
    has_special: evaluation.has_special,
    has_sequence: evaluation.has_sequence,
  });
}

export function saveQuizResult(result: QuizResultInput): Promise<void> {
  if (
    !Number.isInteger(result.score) ||
    !Number.isInteger(result.total_questions) ||
    result.total_questions < 1 ||
    result.score < 0 ||
    result.score > result.total_questions
  ) {
    throw new Error("The quiz result is not valid.");
  }
  return insertAnonymousRecord("quiz_results", {
    score: result.score,
    total_questions: result.total_questions,
  });
}

export function saveChecklist(checklist: ChecklistInput): Promise<void> {
  return insertAnonymousRecord("security_checklists", {
    strong_unique_passwords: checklist.strong_unique_passwords,
    avoids_personal_information: checklist.avoids_personal_information,
    password_manager: checklist.password_manager,
    multi_factor_authentication: checklist.multi_factor_authentication,
    avoids_password_sharing: checklist.avoids_password_sharing,
    recognizes_phishing: checklist.recognizes_phishing,
    avoids_predictable_patterns: checklist.avoids_predictable_patterns,
    reviews_security_settings: checklist.reviews_security_settings,
  });
}

export async function loadSecurityAggregates(): Promise<SecurityAggregates> {
  const client = requireSupabaseClient();
  let data: unknown;
  try {
    const { data: aggregateData, error } = await client.rpc(
      "get_securepass_aggregates",
    );
    if (error) throw new Error("Aggregate request failed.");
    data = aggregateData;
  } catch {
    throw new Error("Could not reach the anonymous insights service.");
  }

  if (!isSecurityAggregates(data)) {
    throw new Error("The anonymous insights response was not valid.");
  }
  return data;
}

function isSecurityAggregates(value: unknown): value is SecurityAggregates {
  if (!value || typeof value !== "object") return false;
  const aggregates = value as Partial<SecurityAggregates>;
  const isBucketList = (buckets: unknown): buckets is AggregateBucket[] =>
    Array.isArray(buckets) &&
    buckets.every(
      (bucket) =>
        typeof bucket === "object" &&
        bucket !== null &&
        typeof (bucket as AggregateBucket).label === "string" &&
        Number.isFinite((bucket as AggregateBucket).count),
    );
  const totals = aggregates.totals;
  return (
    isBucketList(aggregates.strength) &&
    isBucketList(aggregates.length) &&
    isBucketList(aggregates.characterTypes) &&
    typeof totals === "object" &&
    totals !== null &&
    Number.isFinite(totals.evaluations) &&
    Number.isFinite(totals.quizzes) &&
    Number.isFinite(totals.checklists)
  );
}
