import { createInsertSchema } from "drizzle-zod";
import { pgTable, text, timestamp, integer, uuid, boolean } from "drizzle-orm/pg-core";

export const feedbackTable = pgTable("feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  rating: integer("rating").notNull(),
  painPoint: text("pain_point").notNull(),
  comment: text("comment"),
  location: text("location"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

  // Good experience flow
  enjoyed_most: text("enjoyed_most"),
  improvement_suggestion: text("improvement_suggestion"),

  // Cascading issue fields
  primary_issue: text("primary_issue"),
  secondary_issue: text("secondary_issue"),
  root_cause: text("root_cause"),

  // Specific follow-up answers
  waiting_time: text("waiting_time"),

  // Final catch-all comment
  final_comment: text("final_comment"),
  additional_comments: text("additional_comments"),

  // AI-enriched or derived fields
  customer_sentiment: text("customer_sentiment"),
  would_return: text("would_return"),
});

export const insertFeedbackSchema = createInsertSchema(feedbackTable).omit({
  id: true,
  createdAt: true,
});

export type InsertFeedback = typeof feedbackTable.$inferInsert;
export type Feedback = typeof feedbackTable.$inferSelect;
