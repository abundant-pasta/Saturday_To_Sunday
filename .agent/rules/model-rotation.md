### Rule: Quota-Aware Model Routing
**Priority Chain:**
1. **Primary Logic:** `Gemini 3 Pro (High)` (Use for all Supabase migrations and Next.js API logic).
2. **Refactoring/Style:** `GPT-OSS 120B` (Use for Tailwind CSS and UI component boilerplate).
3. **Validation:** `Gemini 3 Flash` (Use for all terminal command verification and file reading).


**Constraints:**
* **The 20% Rule:** If `Claude Sonnet 4.5` or `Claude Opus` quota is < 20%, **DO NOT** use them for this mission unless the user explicitly @mentions the model.
* **Fallback Trigger:** Upon encountering a `429 Rate Limit` or a `Quota Exhausted` warning, immediately rotate to the next available model in the priority chain above.
* **Verification:** Always use `Gemini 3 Flash` for the "Browser Agent" verification steps to preserve High-tier tokens.
