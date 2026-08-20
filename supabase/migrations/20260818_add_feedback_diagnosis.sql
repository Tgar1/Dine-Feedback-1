-- Structured data for the cascading Rodina feedback flow.
-- This migration is additive: existing QR submissions and dashboard queries remain valid.
alter table public.feedback_submissions
  add column if not exists enjoyed_most text,
  add column if not exists improvement_suggestion text,
  add column if not exists primary_issue text,
  add column if not exists secondary_issue text,
  add column if not exists root_cause text,
  add column if not exists waiting_time text,
  add column if not exists additional_comments text,
  add column if not exists customer_sentiment text,
  add column if not exists would_return boolean;

alter table public.feedback_submissions
  add column if not exists feedback_type text,
  add column if not exists feedback_category text,
  add column if not exists feedback_attribute text,
  add column if not exists specific_detail text,
  add column if not exists dish text;

create index if not exists feedback_submissions_restaurant_primary_issue_idx
  on public.feedback_submissions (restaurant_id, primary_issue)
  where primary_issue is not null;

create index if not exists feedback_submissions_restaurant_root_cause_idx
  on public.feedback_submissions (restaurant_id, root_cause)
  where root_cause is not null;
