"use client";

interface GuidePlayer {
  id: string;
  name: string;
  actionsRemaining?: number;
  passed?: boolean;
  setupStep?: string;
}

export function TurnGuide({ phase, player, turnPlayerName, isMyTurn, solo, choice, choiceOwnerName, researchCount }: {
  phase: string;
  player: GuidePlayer;
  turnPlayerName: string;
  isMyTurn: boolean;
  solo: boolean;
  choice: { ownerPlayerId: string; kind: string; prompt: string } | null;
  choiceOwnerName: string;
  researchCount: number;
}) {
  let title: string;
  let instruction: string;
  let waiting = false;
  const actionsRemaining = player.actionsRemaining ?? 2;

  if (choice) {
    waiting = choice.ownerPlayerId !== player.id;
    const placing = ["tile-placement", "ocean-placement"].includes(choice.kind);
    title = waiting ? `${choiceOwnerName}の選択待ち` : placing ? "盤面の光るマスを選択" : "効果の対象を選択";
    instruction = waiting ? "選択が終わるとゲームが進みます。" : choice.prompt;
  } else if (phase === "setup") {
    waiting = player.setupStep === "complete";
    title = waiting ? "ほかのプレイヤーの準備待ち" : "まずはゲームの準備";
    instruction = waiting ? "全員が確定すると開始します。" : player.setupStep === "projects"
      ? "手札に残すカードを選び、購入を確定。"
      : player.setupStep === "prelude" ? "プレリュードを2枚選んで確定。"
      : "企業と初期カードを選び、最後に確定。";
  } else if (phase === "research") {
    waiting = researchCount === 0;
    title = waiting ? "ほかのプレイヤーの購入待ち" : "カードを購入する";
    instruction = waiting ? "全員の購入後、行動が始まります。" : "1枚3 MCで手札へ。購入しない選択もできます。";
  } else if (phase === "game_over") {
    title = "ゲーム終了";
    instruction = "結果と得点の内訳を確認できます。";
  } else if ((phase === "action" && player.passed) || (["action", "final_greenery"].includes(phase) && !isMyTurn)) {
    waiting = true;
    title = phase === "action" && player.passed ? "この世代の行動は終了" : `${turnPlayerName}の手番`;
    instruction = phase === "action" && player.passed ? "全員がパスすると生産に進みます。" : "ほかのプレイヤーの行動を待っています。";
  } else if (phase === "final_greenery") {
    title = "最後の緑地を配置する";
    instruction = "残った植物を緑地に変えるか、配置を終了。";
  } else if (phase === "action") {
    title = `${solo ? "あなた" : player.name}の手番 · あと${actionsRemaining}回`;
    instruction = actionsRemaining < 2
      ? "もう1回行動するか、ターン終了。後でまた行動できます。"
      : "手札のカードか「基本アクション」を選択。";
  } else {
    title = "資源を生産中";
    instruction = "生産が終わると次の世代へ進みます。";
  }

  return (
    <section className="turn-guide" data-testid="turn-guide" data-waiting={waiting} aria-label="次にすること">
      <strong>{title}</strong>
      <span>{instruction}</span>
    </section>
  );
}
