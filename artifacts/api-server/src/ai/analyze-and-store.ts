import { supabase } from "../lib/supabase";
import { analyzeFeedback } from "./analyze-feedback";

export async function analyzeAndStoreFeedback(input: {
  submissionId: string;
  rating: number;
  painPoint: string;
  comment: string | null;
  primaryIssue?: string | null;
  secondaryIssue?: string | null;
  rootCause?: string | null;
  waitingTime?: string | null;
  additionalComments?: string | null;
  feedbackType?: string | null;
  dish?: string | null;
}) {
  const analysis = await analyzeFeedback({
    rating: input.rating,
    painPoint: input.painPoint,
    comment: input.comment,
    primaryIssue: input.primaryIssue,
    secondaryIssue: input.secondaryIssue,
    rootCause: input.rootCause,
    waitingTime: input.waitingTime,
    additionalComments: input.additionalComments,
    feedbackType: input.feedbackType,
    dish: input.dish,
  });

  const { error } = await supabase.from("feedback_analysis").upsert(
    {
      submission_id: input.submissionId,
      sentiment: analysis.sentiment,
      severity: analysis.severity,
      issue_summary: analysis.issue_summary,
      recommended_action: analysis.recommended_action,
      confidence: analysis.confidence,
      model: "openrouter/free",
    },
    { onConflict: "submission_id" },
  );

  if (error) {
    throw new Error(`Could not save AI analysis: ${error.message}`);
  }

  return analysis;
}
