Read `pipeline/strict-rules-spec.md`, `pipeline/rubric.md`, and the existing `app/page.tsx` before editing.

Implement the strict-rules update in the current workspace. This is a substantial behavior change: preserve the visual system, but replace house-rule behavior with the specified official-style solo flow. Keep all card content original and paraphrased; never copy rulebook or official card wording.

Prefer a cohesive state machine rather than bolting on special cases. Keep React state immutable. Add or update focused tests for the required transitions. Do not change unrelated infrastructure.

Run `npm run build`, `npm test`, and `npm run lint`. Fix actual failures. Write the changed files, rule sources used, and exact verification results to `pipeline/strict-result.md`.
