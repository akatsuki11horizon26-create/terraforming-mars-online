# MARS FRONTIER specification

## Product

Create a polished, browser-playable, single-player terraforming strategy game versus a CPU.
It is an unofficial fan-made prototype inspired by planetary terraforming board games and must not use official art, logos, card text, or copied visual assets.

## Experience

- Japanese UI.
- One responsive route.
- The first viewport is the game board, not a landing page.
- Visual direction: RED CONTROL / Mars science control room.
- Palette: void `#080908`, panel `#121110`, rust `#A83220`, ember `#EF5A32`, gold `#E5B563`, cyan `#72D9D0`, ink `#F2E8DC`.
- Dense but legible command-center layout with a large CSS-rendered Mars in the center.
- No SVG illustrations or external images. CSS shapes and text only.

## Game loop

- Player versus CPU, 12 generations maximum.
- Each generation gives the player two actions, then the CPU resolves one visible action.
- Player resources: MC, steel, titanium, plants, energy, heat, with production values.
- Player state: TR, score, generation, actions remaining.
- Global parameters: temperature from -30°C to +8°C, oxygen from 0% to 14%, oceans from 0 to 9.
- Hand contains five project cards drawn from an original deck.
- Cards have original Japanese names, costs, tags, requirements, effects, and optional tile placement.
- Selecting a card shows affordability and target requirements.
- Playing a card spends resources, applies effects, adds it to played projects, and requests a board hex when placement is required.
- Board has at least 31 keyboard-accessible hex cells. Forest, city, and ocean placements have distinct shapes/colors and update score/resources.
- Standard projects must exist as fallback actions: asteroid heating, greenery, ocean.
- Pass ends the player's actions and triggers CPU action and production.
- Production converts energy to heat, then adds production to resources.
- CPU action is deterministic enough to explain in the log and advances global parameters.
- Game ends immediately when all three global parameters reach their goals, or after generation 12.
- End screen explains win/loss and final score, with restart.

## Usability

- Always-visible event log with newest events.
- Short onboarding overlay on first load and a help button to reopen it.
- Clear selected-card and placement state.
- Disabled actions explain why via visible text.
- Restart requires a deliberate confirmation.
- Persist only the current local game in `localStorage`.
- Touch and keyboard accessible controls with visible focus.
- Responsive desktop, tablet, and mobile layouts.
- Respect `prefers-reduced-motion`.

## Files

- Prefer `app/page.tsx`, `app/globals.css`, and `app/layout.tsx`.
- Client-side state is allowed in a single component.
- Remove starter preview code and dependency if unused.
- Keep the vinext/Sites structure intact.
- No comments unless the reason is non-obvious. No docstrings.

## Metadata

- Title: `MARS FRONTIER — 火星開拓戦略ゲーム`
- Description: `カードと資源を操り、CPUより先に赤い惑星を緑へ変えるブラウザ戦略ゲーム。`
- Japanese document language.
- Clearly label the game as an unofficial fan-made work.

