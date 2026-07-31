# Strict rules update

## Source grounding

Implement the base Terraforming Mars rules from the FryxGames rulebook and the publisher-verified rules summary. Use mechanics and numeric rules, but keep all project names, effects, flavor text, and UI copy original and paraphrased. Do not copy official card text, illustrations, logos, or rulebook prose.

Primary references checked on 2026-07-31:

- FryxGames rulebook: `https://fryxgames.se/wp-content/uploads/2023/04/TMRULESFINAL.pdf`
- Publisher-verified summary: `https://rules.dized.com/game/Y2e4M8-fRH-fyWwjwVHsbw/terraforming-mars`
- Readable rulebook transcription used for cross-checking: `https://www.rulespal.com/terraforming-mars/rulebook`

## Mode

Replace the current house-rule CPU race with an official-style single-player mode:

- The user plays one corporation against time and two neutral city/greenery pairs.
- Label it clearly as `公式ソロルール準拠・非公式ファンメイド`.
- No awards or milestones in solo mode.
- Solo starts at TR 14, lasts 14 generations, and has no standard-game starting production bonus.
- The neutral tiles do not belong to the player and do not raise oxygen when placed during setup.
- The win check is completing all three global parameters by the end of generation 14; after the final production, allow the official extra greenery conversion before final scoring.

## Setup

- Global parameters start at temperature -30°C, oxygen 0%, and 0 ocean tiles.
- Put all 9 ocean spaces on the board as reserved spaces.
- Set the player to 42 MC, TR 14, and zero production for MC, steel, titanium, plants, energy, and heat.
- Deal 10 original project cards for initial selection. The player may buy any number for 3 MC each; unbought cards are discarded.
- Do not show a fixed hand before this setup selection is complete.
- Place two neutral cities and one neutral greenery adjacent to each city, using deterministic legal spaces. Neutral greenery does not raise oxygen during setup.

## Generation flow

- Generation 1 skips player-order and research because setup already happened.
- Every later generation runs a research phase: reveal 4 original project cards, let the player select 0-4, charge 3 MC per selected card, discard the rest, and never impose a hand limit.
- Action phase continues until the player passes. A turn can contain exactly 1 or 2 actions; after one action show `ターン終了` and `もう1アクション` choices. Taking a second action ends that turn. The player may begin another turn or pass the generation.
- Do not auto-end a generation after two total actions.
- Production phase: first convert all energy resources to heat; then add MC equal to TR plus MC production (MC production may be negative, but never below -5), then add other resources according to production. Do not draw cards during production.
- When the player passes, lock the action phase and resolve production, then advance the generation unless game end is pending.

## Legal actions

All seven base actions must be available and count as one action:

1. Play an original project card from hand.
2. Sell patents: discard one or more cards and gain 1 MC per card.
3. Power plant: pay 11 MC, raise energy production 1.
4. Asteroid: pay 14 MC, raise temperature 1 step and TR if the track was not complete.
5. Aquifer: pay 18 MC, place an ocean and gain TR/bonuses.
6. Greenery: pay 23 MC, place a greenery and raise oxygen/TR if possible.
7. City: pay 25 MC, place a city, raise MC production 1, and take placement bonuses.
8. Convert 8 plants into greenery and 8 heat into temperature as board actions.

## Parameter and placement rules

- Temperature is -30 to +8 in 2°C increments; oxygen is 0 to 14 in 1% increments; ocean goal is 9 tiles.
- Every successful global-parameter step raises TR by the number of steps, but raising a completed parameter grants no TR.
- Apply the base board bonus steps: oxygen at 8% gives temperature +1; temperature bonuses at -24°C and -20°C give heat production +1; the 0°C step places one ocean tile if an ocean remains.
- Ocean tiles can only be placed on reserved ocean spaces and are not owned.
- Any player-owned tile placed adjacent to an ocean gives 2 MC per adjacent ocean, in addition to printed placement bonuses.
- Greenery must be adjacent to one of the player’s own tiles when a legal owned-adjacent space exists; if none exists, any legal non-reserved empty space is valid. A greenery raises oxygen/TR only when oxygen can still rise.
- City may not be adjacent to any other city, including neutral cities.
- Cities score 1 VP per adjacent greenery regardless of ownership. Each player greenery scores 1 VP.
- Apply printed placement bonuses exactly once, including card draws.

## Cards and payment

- Keep the existing 20 original project cards, but classify them as event/automated/active for UI and enforce their requirements and effects without using official card names/text.
- Events go to a played/discard pile; automated cards remain active for tags; active cards expose a once-per-generation action and reset usage during production. It is acceptable for the existing original deck to contain only automated/event effects if the UI states that active-card actions are not included in this compact deck.
- A player may use steel only for building-tag cards at 2 MC per steel, and titanium only for space-tag cards at 3 MC per titanium. Never refund overpayment.
- Research purchase cost is separate from card play cost.

## Scoring and end state

- Final score starts at TR.
- Add 1 VP per player greenery.
- Add 1 VP per adjacent greenery for each player city.
- Add each card’s original VP value.
- In solo, do not score awards or milestones.
- Show a final score breakdown and whether the terraforming deadline was met.

## UI and persistence

- Keep RED CONTROL visual direction and responsive layout.
- Add a clear phase indicator: setup, research, action, production, final greenery, game over.
- Research selection, action count for the current turn, and pass controls must be obvious.
- Save all new phase/setup/research state to localStorage and restore it safely.
- Update the manual modal so it describes the strict solo flow accurately.
- Add focused tests for research purchase, one-vs-two-action turns, pass-to-production, standard-project costs, greenery adjacency, ocean adjacency MC, and final scoring.

