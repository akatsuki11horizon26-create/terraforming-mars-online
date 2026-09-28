# MARS Frontier investigation

- Scope one rule or UI flow: expected behavior, observed deviation, acceptance check. Do not keep auditing without a concrete discrepancy.
- Start with `git status --short` and targeted `rg`. Read only relevant callers, mutation path, and renderer; consult board-game references for disputed rules. Reuse current findings.
- For rules, trace legality, payment/choice, mutation, network/persistence when relevant, and UI. Confirm runtime dispatch. For layout, check the affected viewport and interaction only.
- Run focused tests with bounded output. Run `npm run types`, `npm run lint`, and full `npm test` at a milestone or handoff, not per small edit. A build alone does not prove gameplay.
- Report changes and gaps. If no discrepancy is found, stop and ask for the next priority.
- Commit each completed change as a new commit. After validation, publish the commit through the `main` branch Cloudflare Workers workflow to `https://mars-frontier.gameofai.workers.dev`; do not use OpenAI Sites unless the user explicitly asks.
