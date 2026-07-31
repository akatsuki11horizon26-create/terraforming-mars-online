# MARS FRONTIER rubric

PASS requires every item below.

## Build

- `npm run build` exits 0.
- TypeScript compilation has no errors.
- Starter skeleton and `codex-preview` metadata are absent.

## Gameplay

- New game starts with coherent resources, five cards, generation 1, and two actions.
- At least one affordable project can be played immediately.
- Card cost and requirement enforcement works.
- At least three distinct project effect types work.
- Tile placement mode is visible and updates a board cell.
- Standard projects work.
- Pass triggers CPU action and production.
- Generation, resources, global parameters, TR, and score visibly update.
- A reachable end-game condition and restart exist.
- Reload restores the local game without crashing.

## Interface

- RED CONTROL visual brief is recognizably implemented.
- Large Mars board, global telemetry, resources, cards, CPU status, and log are simultaneously understandable at desktop width.
- Layout reflows without horizontal clipping at mobile width.
- Interactive controls are buttons and board cells are keyboard accessible.
- Visible focus and reduced-motion handling exist.
- No official art, logos, copied card text, model-authored SVG, or external images.

## Quality

- No impossible-scenario error handling or unnecessary abstractions.
- No broad unrelated changes.
- Original Japanese copy is concise and consistent.
- Game state transitions do not mutate React state objects in place.

