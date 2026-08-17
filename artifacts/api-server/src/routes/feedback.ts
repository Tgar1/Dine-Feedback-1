import { Router, type IRouter } from "express";
import { CreateFeedbackBody, CreateFeedbackResponse } from "@workspace/api-zod";
import { db, feedbackTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/feedback", async (req, res) => {
  const parsed = CreateFeedbackBody.safeParse(req.body);

  if (!parsed.success || !Number.isInteger(parsed.data?.rating)) {
    res.status(400).json({ error: "Please provide a valid rating and pain point." });
    return;
  }

  const comment = parsed.data.comment?.trim() || null;
  const location = parsed.data.location?.trim() || null;

  try {
    const [saved] = await db
      .insert(feedbackTable)
      .values({
        rating: parsed.data.rating,
        painPoint: parsed.data.painPoint,
        comment,
        location,
      })
      .returning({ id: feedbackTable.id });

    const response = CreateFeedbackResponse.parse({
      id: saved.id,
      message: "Thanks for helping us improve.",
    });

    res.status(201).json(response);
  } catch (error) {
    req.log.error({ err: error }, "Unable to save customer feedback");
    res.status(500).json({ error: "We couldn't save your feedback. Please try again." });
  }
});

export default router;