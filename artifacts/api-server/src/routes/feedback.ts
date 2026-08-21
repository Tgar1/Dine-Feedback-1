import { Router, type IRouter } from "express";
import {
  CreateFeedbackBody,
  CreateFeedbackResponse,
} from "@workspace/api-zod";
import { queueFeedbackAnalysis } from "../ai/analysis-worker";
import { supabase } from "../lib/supabase";


const router: IRouter = Router();

const categoryAliases: Record<string, string[]> = {
  food: ["food"],
  service: ["service", "service/staff", "staff"],
  waiting: ["waiting", "waiting time"],
  cleanliness: ["cleanliness"],
  ambience: ["ambience", "ambience/music", "atmosphere"],
  value: ["value"],
  delivery: ["delivery", "delivery/order", "order experience"],
};

type IdRow = { id: string };
type DashboardFeedback = {
  id: string;
  overall_rating: number;
  pain_point: string | null;
  positive_note: string | null;
  source: string | null;
  created_at: string;
  meal_period: string | null;
  order_type: string | null;
};
type FeedbackDiagnosis = {
  id: string;
  enjoyed_most: string | null;
  improvement_suggestion: string | null;
  primary_issue: string | null;
  secondary_issue: string | null;
  root_cause: string | null;
  waiting_time: string | null;
  additional_comments: string | null;
  customer_sentiment: string | null;
  would_return: boolean | null;
};
type DashboardAnalysis = {
  submission_id: string;
  sentiment: "positive" | "neutral" | "negative";
  severity: number | null;
  issue_summary: string | null;
  recommended_action: string | null;
  confidence: number | null;
  model: string | null;
};

async function findIdByColumn(
  table: "restaurants" | "feedback_categories",
  column: string,
  value: string,
  restaurantId?: string,
) {
  let query = supabase.from(table).select("id").eq(column, value).limit(1);

  if (restaurantId) {
    query = query.eq("restaurant_id", restaurantId);
  }

  const result = await query.maybeSingle<IdRow>();

  if (result.error) {
    console.error("SUPABASE LOOKUP ERROR:", {
      table,
      column,
      value,
      restaurantId,
      error: result.error,
    });
    return null;
  }

  return result.data?.id ?? null;
}

async function findRestaurantId(identifier: string) {
  for (const column of ["location", "name"]) {
    const id = await findIdByColumn("restaurants", column, identifier);

    if (id) {
      return id;
    }
  }

  return null;
}

async function findCategoryId(restaurantId: string, painPoint: string) {
  if (painPoint === "none") return null;

  const aliases = categoryAliases[painPoint] ?? [painPoint];
  const result = await supabase
    .from("feedback_categories")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .in("name", aliases)
    .limit(1)
    .maybeSingle<IdRow>();

  if (result.error) {
    console.error("SUPABASE CATEGORY LOOKUP ERROR:", {
      restaurantId,
      aliases,
      error: result.error,
    });
    return null;
  }

  return result.data?.id ?? null;
}

router.post("/feedback", async (req, res) => {
  const parsed = CreateFeedbackBody.safeParse(req.body);

  if (!parsed.success || !Number.isInteger(parsed.data?.rating)) {
    res.status(400).json({ error: "Please provide a valid rating and pain point." });
    return;
  }

  const restaurantIdentifier = parsed.data.location?.trim() || null;

  if (!restaurantIdentifier) {
    res.status(400).json({ error: "This feedback link is missing its restaurant location." });
    return;
  }

  try {
    const restaurantId = await findRestaurantId(restaurantIdentifier);

    if (!restaurantId) {
      res.status(400).json({ error: "We couldn't identify this restaurant location." });
      return;
    }

    const painPoint = parsed.data.painPoint ?? "none";
    const categoryId = await findCategoryId(restaurantId, painPoint);
    const finalComment = parsed.data.finalComment?.trim() || null;
    const improvementSuggestion =
      parsed.data.improvementSuggestion?.trim() || null;
    const rootCause = parsed.data.rootCause?.trim() || parsed.data.secondaryIssue?.trim() || null;
    const customerSentiment =
      parsed.data.rating >= 4 ? "positive" : parsed.data.rating === 3 ? "neutral" : "negative";

    const { data: submission, error } = await supabase
      .from("feedback_submissions")
      .insert({
        restaurant_id: restaurantId,
        category_id: categoryId,
        overall_rating: parsed.data.rating,
        pain_point: painPoint,
        // Keep the existing dashboard comment field populated for old views.
        positive_note: finalComment || improvementSuggestion,
        source: "qr",
        enjoyed_most: parsed.data.enjoyedMost?.trim() || null,
        improvement_suggestion: improvementSuggestion,

        customer_sentiment: customerSentiment,
        would_return: parsed.data.rating >= 4,
      })
      .select("id")
      .single();

    if (error || !submission) {
      req.log.error({ err: error }, "Supabase rejected customer feedback");
      res.status(502).json({ error: "We couldn't save your feedback. Please try again." });
      return;
    }

    const response = CreateFeedbackResponse.parse({
      id: submission.id,
      message: "Thanks for helping us improve.",
    });

    res.status(201).json(response);

    queueFeedbackAnalysis({
      id: submission.id,
      overall_rating: parsed.data.rating,
      pain_point: painPoint,
      positive_note: finalComment || improvementSuggestion,
      primary_issue: null,
      secondary_issue: null,
      root_cause: null,
      waiting_time: null,
      additional_comments: null,
      feedback_type: null,
      dish: null,
    });

  } catch (error) {
    req.log.error({ err: error }, "Unable to submit customer feedback");
    res.status(502).json({ error: "We couldn't connect to feedback storage. Please try again." });
  }
});

router.get("/dashboard", async (req, res) => {
  const restaurantIdentifier =
    typeof req.query.location === "string"
      ? req.query.location.trim()
      : "";

  if (!restaurantIdentifier) {
    res.status(400).json({
      error: "Dashboard link is missing its restaurant location.",
    });
    return;
  }

  try {
    const restaurantId = await findRestaurantId(restaurantIdentifier);

    if (!restaurantId) {
      res.status(400).json({
        error: "We couldn't identify this restaurant location.",
      });
      return;
    }

    const { data, error } = await supabase.rpc(
      "get_restaurant_feedback",
      {
        p_restaurant_id: restaurantId,
      },
    );

    if (error) {
      req.log.error(
        { err: error },
        "Unable to load dashboard feedback",
      );

      res.status(502).json({
        error: "We couldn't load the dashboard data.",
      });
      return;
    }

    const feedback = (data ?? []) as DashboardFeedback[];

    const submissionIds = feedback.map((item) => item.id);

    let diagnosesBySubmissionId = new Map<string, FeedbackDiagnosis>();
    if (submissionIds.length > 0) {
      const result = await supabase
        .from("feedback_submissions")
        .select("id, enjoyed_most, improvement_suggestion, primary_issue, secondary_issue, root_cause, waiting_time, additional_comments, customer_sentiment, would_return")
        .in("id", submissionIds);

      if (result.error) {
        req.log.error({ err: result.error }, "Unable to load feedback diagnoses");
        res.status(502).json({ error: "We couldn't load the feedback diagnoses." });
        return;
      }

      diagnosesBySubmissionId = new Map(
        ((result.data ?? []) as FeedbackDiagnosis[]).map((item) => [item.id, item]),
      );
    }

    let analyses: DashboardAnalysis[] = [];

    if (submissionIds.length > 0) {
      const result = await supabase
        .from("feedback_analysis")
        .select(
          "submission_id, sentiment, severity, issue_summary, recommended_action, confidence, model",
        )
        .in("submission_id", submissionIds);

      console.log("DASHBOARD ANALYSIS QUERY:", result);

      if (result.error) {
        req.log.error(
          { err: result.error },
          "Unable to load AI feedback analysis",
        );

        res.status(502).json({
          error: "We couldn't load the AI feedback analysis.",
        });
        return;
      }

      analyses = (result.data ?? []) as DashboardAnalysis[];
    }

    const analysisBySubmissionId = new Map(
      analyses.map((item) => [item.submission_id, item]),
    );
    console.log("ANALYSES FROM SUPABASE:", analyses);
    console.log("SUBMISSION IDS:", submissionIds);
    console.log(
      "ANALYSIS MAP:",
      Array.from(analysisBySubmissionId.entries()),
    );

    const totalFeedback = feedback.length;

    const averageRating =
      totalFeedback > 0
        ? feedback.reduce(
          (sum: number, item: DashboardFeedback) =>
            sum + Number(item.overall_rating),
          0,
        ) / totalFeedback
        : 0;

    const ratingDistribution = {
      1: feedback.filter((item) => item.overall_rating === 1).length,
      2: feedback.filter((item) => item.overall_rating === 2).length,
      3: feedback.filter((item) => item.overall_rating === 3).length,
      4: feedback.filter((item) => item.overall_rating === 4).length,
      5: feedback.filter((item) => item.overall_rating === 5).length,
    };

    const painPointDistribution = {
      food: feedback.filter((item) => item.pain_point === "food").length,
      service: feedback.filter((item) => item.pain_point === "service").length,
      waiting: feedback.filter((item) => item.pain_point === "waiting").length,
      cleanliness: feedback.filter(
        (item) => item.pain_point === "cleanliness",
      ).length,
      ambience: feedback.filter(
        (item) =>
          item.pain_point === "ambience" || item.pain_point === "atmosphere",
      ).length,
      value: feedback.filter((item) => item.pain_point === "value").length,
    };

    const diagnosisRows = Array.from(diagnosesBySubmissionId.values());
    const countBy = (field: keyof Pick<FeedbackDiagnosis, "primary_issue" | "root_cause">) =>
      Object.entries(
        diagnosisRows.reduce<Record<string, number>>((counts, item) => {
          const value = item[field];
          if (value) counts[value] = (counts[value] ?? 0) + 1;
          return counts;
        }, {}),
      )
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    res.json({
      restaurant: {
        id: restaurantId,
        identifier: restaurantIdentifier,
      },

      summary: {
        totalFeedback,
        averageRating: Number(averageRating.toFixed(1)),
      },

      ratingDistribution,

      painPointDistribution,

      diagnosisInsights: {
        primaryIssues: countBy("primary_issue"),
        rootCauses: countBy("root_cause"),
      },

      recentFeedback: feedback.slice(0, 20).map((item) => {
        const analysis = analysisBySubmissionId.get(item.id);

        console.log("ATTACHING ANALYSIS:", {
          feedbackId: item.id,
          analysis,
        });

        return {
          ...item,
          diagnosis: diagnosesBySubmissionId.get(item.id) ?? null,
          ai_analysis: analysis ?? null,
        };
      }),
    });
  } catch (error) {
    req.log.error(
      { err: error },
      "Unable to load dashboard",
    );

    res.status(502).json({
      error: "We couldn't connect to dashboard storage.",
    });
  }
});

export default router;
