---
name: Supabase feedback storage
description: Backend boundary and production data assumptions for customer feedback.
---

Customer submissions should continue through the existing API endpoint. The server resolves the QR restaurant identifier and category, then inserts into `public.feedback_submissions` using the low-privilege Supabase anon key. Never use a service-role key or expose Supabase credentials to the browser.

**Why:** Keeping the browser contract stable avoids disturbing the intentionally fast customer flow while allowing production storage and Row Level Security to remain server-controlled.

**How to apply:** Future changes should preserve the `location` query parameter behavior and map the form to `restaurant_id`, `category_id`, `overall_rating`, `pain_point`, `positive_note`, and `source`. Production must expose the required restaurant/category rows through compatible RLS policies or a QR identifier lookup cannot succeed.