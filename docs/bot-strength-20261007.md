# CPU strength comparison — 2026-10-07

Reference policy: `b7e515a:app/bot-player.js`. Both policies use the same current game engine and legal command API. Two players, Tharsis, Prelude enabled; each seed is played twice with policies swapping seats. Final VP decides the winner, followed by remaining MC for ties. No resource handicap is applied.

| Difficulty | Seeds | Games | Updated wins | Mean VP margin |
|---|---|---:|---:|---:|
| normal | 5000–5011 | 24 | 19 | 11.08 |
| hard | 6000–6007 | 16 | 11 | 8.13 |

These are fixed-seed regression matches against the previous policy, not a rating against human players or a claim about all expansions. Decision times were measured during concurrent local validation: normal mean 15 ms / max 91 ms; hard mean 46 ms / max 414 ms. Slower devices may take longer.

The policy now ranks opening corporations/preludes, values normalized card effects minus purchase/play costs, estimates the multiplayer investment horizon from remaining terraforming steps, and considers all enumerated same-turn replies in hard search.

## Reproduce

Save the reference module in `tmp/bot-before.mjs`, changing its relative imports from `./` to `../app/`, then run:

```powershell
node scripts/bot-benchmark.mjs tmp/bot-before.mjs 12 normal 5000
node scripts/bot-benchmark.mjs tmp/bot-before.mjs 8 hard 6000
```

## Individual games

| Difficulty | Seed | Updated seat | Generation | Updated VP | Reference VP | Result |
|---|---:|---:|---:|---:|---:|---|
| normal | 5000 | 1 | 14 | 107 | 75 | win |
| normal | 5000 | 2 | 13 | 97 | 95 | win |
| normal | 5001 | 1 | 12 | 96 | 65 | win |
| normal | 5001 | 2 | 12 | 90 | 74 | win |
| normal | 5002 | 1 | 12 | 87 | 85 | win |
| normal | 5002 | 2 | 13 | 94 | 84 | win |
| normal | 5003 | 1 | 14 | 85 | 83 | win |
| normal | 5003 | 2 | 15 | 94 | 99 | loss |
| normal | 5004 | 1 | 11 | 86 | 71 | win |
| normal | 5004 | 2 | 12 | 83 | 71 | win |
| normal | 5005 | 1 | 12 | 81 | 88 | loss |
| normal | 5005 | 2 | 13 | 111 | 88 | win |
| normal | 5006 | 1 | 13 | 84 | 77 | win |
| normal | 5006 | 2 | 15 | 98 | 97 | win |
| normal | 5007 | 1 | 13 | 74 | 92 | loss |
| normal | 5007 | 2 | 12 | 91 | 66 | win |
| normal | 5008 | 1 | 11 | 73 | 67 | win |
| normal | 5008 | 2 | 11 | 66 | 68 | loss |
| normal | 5009 | 1 | 11 | 94 | 72 | win |
| normal | 5009 | 2 | 13 | 103 | 58 | win |
| normal | 5010 | 1 | 12 | 86 | 88 | loss |
| normal | 5010 | 2 | 12 | 83 | 75 | win |
| normal | 5011 | 1 | 13 | 97 | 78 | win |
| normal | 5011 | 2 | 15 | 115 | 93 | win |
| hard | 6000 | 1 | 14 | 103 | 87 | win |
| hard | 6000 | 2 | 14 | 107 | 85 | win |
| hard | 6001 | 1 | 12 | 96 | 62 | win |
| hard | 6001 | 2 | 11 | 95 | 66 | win |
| hard | 6002 | 1 | 12 | 92 | 73 | win |
| hard | 6002 | 2 | 12 | 93 | 86 | win |
| hard | 6003 | 1 | 11 | 91 | 91 | loss |
| hard | 6003 | 2 | 10 | 86 | 83 | win |
| hard | 6004 | 1 | 11 | 89 | 81 | win |
| hard | 6004 | 2 | 12 | 94 | 75 | win |
| hard | 6005 | 1 | 11 | 65 | 86 | loss |
| hard | 6005 | 2 | 15 | 111 | 81 | win |
| hard | 6006 | 1 | 13 | 86 | 101 | loss |
| hard | 6006 | 2 | 10 | 71 | 77 | loss |
| hard | 6007 | 1 | 13 | 96 | 80 | win |
| hard | 6007 | 2 | 15 | 83 | 114 | loss |
