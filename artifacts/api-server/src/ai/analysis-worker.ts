import { supabase } from "../lib/supabase";
import { analyzeAndStoreFeedback } from "./analyze-and-store";

const retryIntervalMs = 60_000;
const inFlightSubmissionIds = new Set<string>();

type FeedbackForAnalysis = {
  id: string;
  overall_rating: number | null;
  pain_point: string | null;
  positive_note: string | null;
  primary_issue: string | null;
  secondary_issue: string | null;
  root_cause: string | null;
  waiting_time: string | null;
  additional_comments: string | null;
  feedback_type: string | null;
  dish: string | null;
};

async function processAnalysis(input: FeedbackForAnalysis) {
  if (inFlightSubmissionIds.has(input.id)) return;

  inFlightSubmissionIds.add(input.id);

  try {
    await analyzeAndStoreFeedback({
      submissionId: input.id,
      rating: Number(input.overall_rating),
      painPoint: input.pain_point ?? "none",
      comment: input.positive_note,
      primaryIssue: input.primary_issue,
      secondaryIssue: input.secondary_issue,
      rootCause: input.root_cause,
      waitingTime: input.waiting_time,
      additionalComments: input.additional_comments,
      feedbackType: input.feedback_type,
      dish: input.dish,
    });
  } finally {
    inFlightSubmissionIds.delete(input.id);
  }
}

export function queueFeedbackAnalysis(input: FeedbackForAnalysis) {
  void processAnalysis(input).catch((error) => {
    console.error("Unable to analyze feedback in the background:", {
      submissionId: input.id,
      error,
    });
  });
}

async function retryMissingAnalyses() {
  const { data: feedback, error: feedbackError } = await supabase
    .from("feedback_submissions")
    .select("id, overall_rating, pain_point, positive_note, primary_issue, secondary_issue, root_cause, waiting_time, additional_comments, feedback_type, dish")
    .order("created_at", { ascending: true })
    .limit(100);

  if (feedbackError) {
    console.error("Unable to load feedback for AI-analysis retry:", feedbackError);
    return;
  }

  const submissions = (feedback ?? []) as FeedbackForAnalysis[];
  if (submissions.length === 0) return;

  const { data: analyses, error: analysisError } = await supabase
    .from("feedback_analysis")
    .select("submission_id")
    .in(
      "submission_id",
      submissions.map((submission) => submission.id),
    );

  if (analysisError) {
    console.error("Unable to load existing AI analyses for retry:", analysisError);
    return;
  }

  const analysedIds = new Set(
    (analyses ?? []).map((analysis) => analysis.submission_id),
  );

  for (const submission of submissions) {
    if (!analysedIds.has(submission.id)) {
      await processAnalysis(submission);
    }
  }
}

export function startAnalysisRetryWorker() {
  void retryMissingAnalyses();

  const timer = setInterval(() => {
    void retryMissingAnalyses();
  }, retryIntervalMs);

  timer.unref();
}
