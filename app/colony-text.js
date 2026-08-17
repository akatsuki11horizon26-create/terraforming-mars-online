// Colony tile names are localized in colony-tiles.js, but the effect text is not:
// it comes straight from the reference implementation's own English descriptions,
// so the Colonies panel read half Japanese and half English. The tile file is
// generated, so the translation lives here instead of being edited into it.
//
// "n" in the source strings is the amount under the track marker, which the panel
// shows as a row of numbers beside the text. It is kept as n rather than resolved,
// because the same string labels every step of the track.
const COLONY_DESCRIPTION_JP = {
  "Add 1 animal to ANY card": "任意のカードに動物1を追加する。",
  "Add 1 floater to ANY card": "任意のカードにフローター1を追加する。",
  "Add 1 microbe to ANY card": "任意のカードに微生物1を追加する。",
  "Add 3 floaters to ANY card": "任意のカードにフローター3を追加する。",
  "Add 3 microbes to ANY card": "任意のカードに微生物3を追加する。",
  "Add n animals to ANY card": "任意のカードに動物n個を追加する。",
  "Add n floaters to ANY card": "任意のカードにフローターn個を追加する。",
  "Add n microbes to ANY card": "任意のカードに微生物n個を追加する。",
  "Draw 1 card": "カードを1枚引く。",
  "Draw 1 card and then discard 1 card": "カードを1枚引き、その後1枚捨てる。",
  "Draw 2 cards": "カードを2枚引く。",
  "Draw n cards": "カードをn枚引く。",
  "Erode n spaces adjacent to hazard tiles (gaining placement bonuses)":
    "危険タイルに隣接するマスをn個侵食する（配置ボーナスを得る）。",
  "Gain 1 M€": "MCを1獲得する。",
  "Gain 1 M€ per hazard tile on Mars": "火星上の危険タイル1枚につきMCを1獲得する。",
  "Gain 1 energy production": "エネルギー生産量+1。",
  "Gain 1 heat production": "熱生産量+1。",
  "Gain 1 plant": "植物を1獲得する。",
  "Gain 1 plant production": "植物生産量+1。",
  "Gain 1 steel production": "建材生産量+1。",
  "Gain 1 titanium": "チタンを1獲得する。",
  "Gain 1 unit of production of the type under the track marker":
    "トラックのマーカーが示す種類の生産量+1。",
  "Gain 2 M€": "MCを2獲得する。",
  "Gain 2 M€ production": "MC生産量+2。",
  "Gain 2 heat": "熱を2獲得する。",
  "Gain 2 steel": "建材を2獲得する。",
  "Gain 3 energy": "エネルギーを3獲得する。",
  "Gain 3 titanium": "チタンを3獲得する。",
  "Gain n M€": "MCをn獲得する。",
  "Gain n energy": "エネルギーをn獲得する。",
  "Gain n heat": "熱をn獲得する。",
  "Gain n plants": "植物をn獲得する。",
  "Gain n steel": "建材をn獲得する。",
  "Gain n titanium": "チタンをn獲得する。",
  "Place a hazard tile next to no other tile": "他のどのタイルにも隣接しない場所に危険タイルを1枚置く。",
  "Place an ocean tile": "海洋タイルを1枚置く。"
};

// Falls back to the source string so a tile added later shows English rather than
// an empty panel, and so a missed entry is visible instead of silent.
export function colonyDescriptionJP(description) {
  if (!description) return "";
  return COLONY_DESCRIPTION_JP[description] ?? description;
}

export { COLONY_DESCRIPTION_JP };
