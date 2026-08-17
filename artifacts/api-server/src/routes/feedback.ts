import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { CreateFeedbackBody, CreateFeedbackResponse } from "@workspace/api-zod";
import { supabase } from "../lib/supabase";

const router: IRouter = Router();

const categoryAliases: Record<string, string[]> = {
  food: ["food"],
  service: ["service", "service/staff", "staff"],
  waiting: ["waiting", "waiting time"],
  cleanliness: ["cleanliness"],
  ambience: ["ambience", "ambience/music", "atmosphere"],
  value: ["value"],
};

type IdRow = { id: string };

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
  return result.error ? null : result.data?.id ?? null;
}

async function findRestaurantId(identifier: string) {
  for (const column of ["id", "slug", "code"]) {
    const id = await findIdByColumn("restaurants", column, identifier);
    if (id) return id;
  }

  return null;
}

async function findCategoryId(restaurantId: string, painPoint: string) {
  if (painPoint === "none") return null;

  const aliases = categoryAliases[painPoint] ?? [painPoint];
  for (const alias of aliases) {
    for (const column of ["slug", "name", "key", "code"]) {
      const id = await findIdByColumn(
        "feedback_categories",
        column,
        alias,
        restaurantId,
      );
      if (id) return id;
    }
  }

  return null;
}

router.post("/feedback", async (req, res) => {
  const parsed = CreateFeedbackBody.safeParse(req.body);

  if (!parsed.success || !Number.isInteger(parsed.data?.rating)) {
    res.status(400).json({ error: "Please provide a valid rating and pain point." });
    return;
  }

  const restaurantIdentifier = parsed.data.location?.trim() || null;
  const comment = parsed.data.comment?.trim() || null;

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

    const categoryId = await findCategoryId(
      restaurantId,
      parsed.data.painPoint,
    );

    const { error } = await supabase.from("feedback_submissions").insert({
      restaurant_id: restaurantId,
      category_id: categoryId,
      overall_rating: parsed.data.rating,
      pain_point: parsed.data.painPoint,
      positive_note: comment,
      source: "qr",
    });

    if (error) {
      req.log.error({ err: error }, "Supabase rejected customer feedback");
      res.status(502).json({ error: "We couldn't save your feedback. Please try again." });
      return;
    }

    const response = CreateFeedbackResponse.parse({
      id: randomUUID(),
      message: "Thanks for helping us improve.",
    });

    res.status(201).json(response);
  } catch (error) {
    req.log.error({ err: error }, "Unable to submit customer feedback");
    res.status(502).json({ error: "We couldn't connect to feedback storage. Please try again." });
  }
});

export default router;