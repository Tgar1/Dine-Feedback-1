---
name: OpenAPI integer compatibility
description: Orval-generated Zod schemas in this workspace target Zod 3.
---

When adding OpenAPI request fields that are whole-number values, prefer a bounded numeric schema and enforce whole-number validation at the server boundary rather than relying on an emitted `z.int()` helper.

**Why:** The current generated Zod runtime is Zod 3, which does not expose `z.int()`. An OpenAPI `integer` field caused the generated library typecheck to fail.

**How to apply:** After every OpenAPI change, run codegen and the library typecheck before implementing routes that import the generated schemas.