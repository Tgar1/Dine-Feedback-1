import { createInsertSchema } from "drizzle-zod";
import { pgTable, text, timestamp, integer, uuid } from "drizzle-orm/pg-core";

export const feedbackTable = pgTable("feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  rating: integer("rating").notNull(),
  painPoint: text("pain_point").notNull(),
  comment: text("comment"),
  location: text("location"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertFeedbackSchema = createInsertSchema(feedbackTable).omit({
  id: true,
  createdAt: true,
});

export type InsertFeedback = typeof feedbackTable.$inferInsert;
export type Feedback = typeof feedbackTable.$inferSelect;