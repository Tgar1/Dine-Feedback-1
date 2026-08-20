import OpenAI from "openai";

export type FeedbackAnalysis = {
  sentiment: "positive" | "neutral" | "negative";
  severity: number;
  issue_summary: string;
  recommended_action: string;
  confidence: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeAnalysis(value: unknown): FeedbackAnalysis {
  if (!isRecord(value)) {
    throw new Error("AI returned a non-object analysis.");
  }

  const sentiment = value.sentiment;
  const severity = value.severity;
  const issueSummary = value.issue_summary;
  const recommendedAction = value.recommended_action;
  const confidence = value.confidence;

  if (
    (sentiment !== "positive" &&
      sentiment !== "neutral" &&
      sentiment !== "negative") ||
    typeof severity !== "number" ||
    !Number.isFinite(severity) ||
    typeof issueSummary !== "string" ||
    !issueSummary.trim() ||
    typeof recommendedAction !== "string" ||
    !recommendedAction.trim() ||
    typeof confidence !== "number" ||
    !Number.isFinite(confidence)
  ) {
    throw new Error("AI returned an incomplete analysis.");
  }

  return {
    sentiment,
    severity: Math.min(5, Math.max(1, Math.round(severity))),
    issue_summary: issueSummary.trim(),
    recommended_action: recommendedAction.trim(),
    confidence: Math.min(1, Math.max(0, confidence)),
  };
}

function parseAnalysis(text: string): FeedbackAnalysis {
  const cleaned = text.trim();

  // First try normal JSON.
  try {
    return normalizeAnalysis(JSON.parse(cleaned));
  } catch {
    // Continue to Markdown fallback.
  }

  const extract = (label: string) => {
    const pattern = new RegExp(
      `\\*\\*${label}:\\*\\*\\s*(.+?)(?=\\n\\s*\\*\\*|$)`,
      "is",
    );

    return pattern.exec(cleaned)?.[1]?.trim() ?? "";
  };

  const sentimentText = extract("Sentiment").toLowerCase();
  const severityText = extract("Severity");
  const issueSummary = extract("Issue Summary");
  const recommendedAction = extract("Recommended Action");
  const confidenceText = extract("Confidence");

  let sentiment: FeedbackAnalysis["sentiment"];

  if (sentimentText.includes("negative")) {
    sentiment = "negative";
  } else if (sentimentText.includes("neutral")) {
    sentiment = "neutral";
  } else {
    sentiment = "positive";
  }

  const severity = Number.parseInt(severityText, 10);
  const confidence = Number.parseFloat(confidenceText);

  if (
    !issueSummary ||
    !recommendedAction ||
    Number.isNaN(severity) ||
    Number.isNaN(confidence)
  ) {
    throw new Error(
      `AI returned an unexpected analysis format:\n${cleaned}`,
    );
  }

  return {
    ...normalizeAnalysis({
      sentiment,
      severity,
      issue_summary: issueSummary,
      recommended_action: recommendedAction,
      confidence,
    }),
  };
}

export async function analyzeFeedback(input: {
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
}): Promise<FeedbackAnalysis> {
  const apiKey = globalThis.process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is required for AI feedback analysis.");
  }

  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
  });

  const response = await openai.responses.create({
    model: "openrouter/free",
    input: [
      {
        role: "system",
        content:
          "You analyze structured restaurant customer feedback. Treat the diagnosis fields as high-confidence customer selections and use them to make the issue summary and recommended action specific and operational. Return concise, practical analysis. Format your answer exactly as five Markdown fields: **Sentiment:** positive, neutral, or negative. **Severity:** integer 1 to 5. **Issue Summary:** concise summary. **Recommended Action:** practical action. **Confidence:** number from 0 to 1.",
      },
      {
        role: "user",
        content: JSON.stringify({
          rating: input.rating,
          pain_point: input.painPoint,
          comment: input.comment,
          primary_issue: input.primaryIssue ?? null,
          secondary_issue: input.secondaryIssue ?? null,
          root_cause: input.rootCause ?? null,
          waiting_time: input.waitingTime ?? null,
          additional_comments: input.additionalComments ?? null,
          feedback_type: input.feedbackType ?? null,
          dish: input.dish ?? null,
        }),
      },
    ],
  });

  return parseAnalysis(response.output_text);
}
