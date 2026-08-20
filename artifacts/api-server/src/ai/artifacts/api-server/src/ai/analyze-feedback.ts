import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: globalThis.process.env.OPENAI_API_KEY,
});

if (!globalThis.process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required for AI feedback analysis.");
}

export type FeedbackAnalysis = {
  sentiment: "positive" | "neutral" | "negative";
  severity: number;
  issue_summary: string;
  recommended_action: string;
  confidence: number;
};

export async function analyzeFeedback(input: {
  rating: number;
  painPoint: string;
  comment: string | null;
}): Promise<FeedbackAnalysis> {
  const response = await openai.responses.create({
    model: "gpt-5-mini",
    input: [
      {
        role: "system",
        content:
          "You analyze restaurant customer feedback. Return concise, practical analysis. Severity must be an integer from 1 to 5. Confidence must be a number from 0 to 1. If the feedback is positive and contains no actionable complaint, issue_summary should briefly state that no significant issue was identified.",
      },
      {
        role: "user",
        content: JSON.stringify({
          rating: input.rating,
          pain_point: input.painPoint,
          comment: input.comment,
        }),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "feedback_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            sentiment: {
              type: "string",
              enum: ["positive", "neutral", "negative"],
            },
            severity: {
              type: "integer",
              minimum: 1,
              maximum: 5,
            },
            issue_summary: {
              type: "string",
            },
            recommended_action: {
              type: "string",
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
            },
          },
          required: [
            "sentiment",
            "severity",
            "issue_summary",
            "recommended_action",
            "confidence",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  return JSON.parse(response.output_text) as FeedbackAnalysis;
}