// The bonuses printed part-way up the global tracks, as data rather than as
// strings scattered through the UI. checkParameterThresholds in game-logic.js
// pays these out; this file only describes them, so the two must be kept in
// step -- a test asserts they match.
//
// Temperature moves in 2 degree steps, oxygen and Venus in 1% and 2% steps.
// Distance is reported in STEPS as well as raw units because a player buys
// steps, not degrees: "2 steps away" is the number that decides whether an
// asteroid gets there this turn.

export const TEMPERATURE_STEP = 2;
export const OXYGEN_STEP = 1;
export const VENUS_STEP = 2;

export const PARAMETER_THRESHOLDS = Object.freeze({
  temperature: [
    { at: -24, reward: "熱生産+1" },
    { at: -20, reward: "熱生産+1" },
    { at: 0, reward: "海洋タイル1枚" },
    { at: 8, reward: "上限（TR停止）" }
  ],
  oxygen: [
    { at: 8, reward: "気温+2℃（TR+1）" },
    { at: 14, reward: "上限（TR停止）" }
  ],
  venus: [
    { at: 8, reward: "カード1枚" },
    { at: 16, reward: "TR+1" },
    { at: 30, reward: "上限（TR停止）" }
  ]
});

const STEP_FOR = {
  temperature: TEMPERATURE_STEP,
  oxygen: OXYGEN_STEP,
  venus: VENUS_STEP
};

// The next unreached bonus on a track, with how far away it is. Returns null
// once every threshold is behind us, which is the caller's cue to say nothing
// rather than to print a zero.
export function nextThreshold(key, value) {
  const list = PARAMETER_THRESHOLDS[key];
  if (!list) return null;
  const step = STEP_FOR[key] ?? 1;
  const upcoming = list.find(entry => value < entry.at);
  if (!upcoming) return null;
  const gap = upcoming.at - value;
  return {
    at: upcoming.at,
    reward: upcoming.reward,
    gap,
    steps: Math.ceil(gap / step)
  };
}

const UNIT = { temperature: "℃", oxygen: "%", venus: "%" };

// One short line for the UI: how far, and what it pays. Kept here so the HUD
// chip and the drawer track cannot drift apart.
export function nextThresholdLabel(key, value) {
  const next = nextThreshold(key, value);
  if (!next) return "";
  const unit = UNIT[key] ?? "";
  return `あと${next.steps}段階(${next.gap}${unit}) → ${next.reward}`;
}
