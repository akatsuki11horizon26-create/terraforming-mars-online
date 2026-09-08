import { writeFileSync } from 'node:fs';
import { getInitialState, applyCorporation, enabledExpansions, isGameOverCheck } from '../../app/game-logic.js';
import { BOARD_AWARDS, milestonesForBoard, awardsForBoard } from '../../app/board-milestones.js';
import { ALTERNATE_BOARDS } from '../../app/alternate-boards.js';
import { executeGameCommand, COMMAND } from '../../app/game-command.js';

const award = BOARD_AWARDS.utopia.find(item => item.id === 'entrepreneur');
let beginner = getInitialState({ seed: 908 });
beginner.players[0].corporationOptions = ['corp-beginner'];
beginner = applyCorporation(beginner, 'corp-beginner');
const bought = executeGameCommand(beginner, {
  type: COMMAND.BUY_RESEARCH, playerId: beginner.currentPlayerId, cardIds: []
});

let prelude = getInitialState({ prelude: true, seed: 908 });
prelude.players[0].corporationOptions = ['corp-teractor'];
prelude = applyCorporation(prelude, 'corp-teractor');
prelude.players[0].mc = 30;
prelude.players[0].preludeOptions = [
  'prelude-business-empire', 'prelude-galilean-mining',
  'prelude-acquired-space-agency', 'prelude-allied-banks'
];
const reserved = executeGameCommand(prelude, {
  type: COMMAND.BUY_RESEARCH, playerId: prelude.currentPlayerId,
  cardIds: prelude.researchCards.slice(0, 7)
});

const findings = {
  auditedCommit: '6e7fe84c18cde2ae1a30ca19ead18f49e21087e2',
  elysiumAwards: awardsForBoard('elysium').map(item => item.id),
  amazonis: {
    cells: ALTERNATE_BOARDS.amazonis.cells.length,
    milestones: milestonesForBoard('amazonis').map(item => item.id),
    awards: awardsForBoard('amazonis').map(item => item.id),
    sharedEndCheckAtBasicTargets: isGameOverCheck(8, 14, 9)
  },
  utopiaAwardBoundary: [10, 11, 19, 20].map(cost => ({
    cost,
    observedCount: award.getScore({ player: { playedProjects: ['probe'] }, cards: [{ id: 'probe', cost }] })
  })),
  preludeEnabledExpansions: [...enabledExpansions({ prelude: true })],
  beginnerEmptySelection: {
    offered: beginner.researchCards.length, ok: bought.ok,
    phase: bought.state.phase, hand: bought.state.hand.length, mc: bought.state.mc
  },
  preludeUnchosenCostReservation: {
    mc: 30, projectCount: 7, projectCost: 21, remainingMc: 9,
    availableFreePair: ['prelude-acquired-space-agency', 'prelude-allied-banks'],
    ok: reserved.ok, error: reserved.error
  }
};
const output = JSON.stringify(findings, null, 2) + '\n';
console.log(output);
if (process.argv.includes('--save')) writeFileSync(new URL('./reproduction.json', import.meta.url), output);
