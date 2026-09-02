// Finished games, built by the engine and written through the real save
// serialiser, so the end screen is reached the way a returning player reaches
// it -- not by a test-only back door wired into the shipped bundle.
import { getInitialState } from "../../../app/game-logic.js";
import { serializeSavedState } from "../../../app/save-migration.js";

function finish(state, patch) {
  const next = { ...state, isGameOver: true, phase: "game_over", ...patch };
  return serializeSavedState(next);
}

// The human is beaten 68 to 20. This is the case that shipped broken: the end
// screen read the planet's tracks instead of the scores, so the player who had
// been outscored was congratulated.
export function humanLoses() {
  return finish(getInitialState({ playerCount: 2, mode: "hotseat" }), {
    standings: [
      { playerId: "player2", name: "プレイヤー2", score: 68, mc: 12 },
      { playerId: "player", name: "プレイヤー1", score: 20, mc: 5 }
    ],
    winnerPlayerIds: ["player2"],
    gameResult: "loss"
  });
}

export function humanWins() {
  return finish(getInitialState({ playerCount: 2, mode: "hotseat" }), {
    standings: [
      { playerId: "player", name: "プレイヤー1", score: 71, mc: 9 },
      { playerId: "player2", name: "プレイヤー2", score: 44, mc: 30 }
    ],
    winnerPlayerIds: ["player"],
    gameResult: "win"
  });
}

// Equal on score AND on MC is a shared win, not an arbitrary pick.
export function tied() {
  return finish(getInitialState({ playerCount: 2, mode: "hotseat" }), {
    standings: [
      { playerId: "player", name: "プレイヤー1", score: 55, mc: 14 },
      { playerId: "player2", name: "プレイヤー2", score: 55, mc: 14 }
    ],
    winnerPlayerIds: ["player", "player2"],
    gameResult: "win"
  });
}

// Solo is a mission against the planet, so it has no ranking -- and must keep
// its own wording rather than borrowing the multiplayer verdict.
export function soloSuccess() {
  return finish(getInitialState({ playerCount: 1 }), {
    standings: null,
    winnerPlayerIds: null,
    gameResult: "win"
  });
}
