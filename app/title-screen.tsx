"use client";

import { BOT_DIFFICULTIES } from "./bot-player";

export function TitleScreen({
  onSolo,
  onRobot,
  onOnline,
  onManual,
  onlineEnabled,
  hasSave,
  onContinue
}: {
  onSolo: () => void;
  onRobot: () => void;
  onOnline: () => void;
  onManual: () => void;
  onlineEnabled: boolean;
  hasSave: boolean;
  onContinue: () => void;
}) {
  return (
    <div className="title-screen">
      <div className="title-backdrop" aria-hidden="true" />

      <div className="title-inner">
        <header className="title-head">
          <h1 className="title-logo">MARS FRONTIER</h1>
          <p className="title-tagline">火星開拓戦略制御システム</p>
          <p className="title-note">公式ルール準拠・非公式ファンメイド</p>
        </header>

        {hasSave && (
          <button className="title-continue" data-testid="mode-continue" onClick={onContinue}>
            前回の続きから
          </button>
        )}

        <div className="title-modes">
          <button className="title-mode" data-testid="mode-solo" onClick={onSolo}>
            <span className="title-mode-icon" aria-hidden="true">◇</span>
            <span className="title-mode-body">
              <span className="title-mode-name">ソロプレイ</span>
              <span className="title-mode-desc">
                公式ソロルール。14世代以内に気温・酸素・海洋をすべて最大化する。
              </span>
            </span>
          </button>

          <button className="title-mode" data-testid="mode-robot" onClick={onRobot}>
            <span className="title-mode-icon" aria-hidden="true">◆</span>
            <span className="title-mode-body">
              <span className="title-mode-name">ロボット戦</span>
              <span className="title-mode-desc">
                自動操作の相手と対戦する。強さは{BOT_DIFFICULTIES.length}段階から選べる。
              </span>
            </span>
          </button>

          <button
            className="title-mode"
            data-testid="mode-online"
            onClick={onOnline}
            disabled={!onlineEnabled}
            title={onlineEnabled ? undefined : "この配信版はソロ専用です"}
          >
            <span className="title-mode-icon" aria-hidden="true">◈</span>
            <span className="title-mode-body">
              <span className="title-mode-name">オンライン対戦</span>
              <span className="title-mode-desc">
                {onlineEnabled
                  ? "合言葉で部屋を作り、他の端末のプレイヤーと対戦する。"
                  : "この配信版では利用できません。"}
              </span>
            </span>
          </button>
        </div>

        <button className="title-manual" data-testid="mode-manual" onClick={onManual}>
          ルールマニュアルを読む
        </button>
      </div>
    </div>
  );
}

// The expansions and map, chosen before the deck is dealt. Solo and robot open
// this from the title screen; the header opens it to start a custom game. It
// lives here rather than in page.tsx because the title screen returns early and
// could not otherwise show it.
export function GameSetupPanel({
  open,
  intent,
  playerCount,
  onPlayerCount,
  playerNames,
  onPlayerNames,
  boards,
  selectedBoard,
  onBoard,
  turmoil,
  onTurmoil,
  colonies,
  onColonies,
  prelude,
  onPrelude,
  venus,
  onVenus,
  promo,
  onPromo,
  draft,
  onDraft,
  onCancel,
  onStart
}: {
  open: boolean;
  intent: "custom" | "solo" | "robot";
  playerCount: number;
  onPlayerCount: (count: number) => void;
  playerNames: string[];
  onPlayerNames: (names: string[]) => void;
  boards: { id: string; name: string }[];
  selectedBoard: string;
  onBoard: (id: string) => void;
  turmoil: boolean;
  onTurmoil: (on: boolean) => void;
  colonies: boolean;
  onColonies: (on: boolean) => void;
  prelude: boolean;
  onPrelude: (on: boolean) => void;
  venus: boolean;
  onVenus: (on: boolean) => void;
  promo: boolean;
  onPromo: (on: boolean) => void;
  draft: boolean;
  onDraft: (on: boolean) => void;
  onCancel: () => void;
  onStart: () => void;
}) {
  if (!open) return null;

  // Solo is one seat by definition; robot counts its opponents on the next
  // screen. Only a custom game asks here.
  const asksPlayerCount = intent === "custom";

  const EXPANSIONS: {
    key: string;
    name: string;
    desc: string;
    on: boolean;
    set: (on: boolean) => void;
  }[] = [
    {
      key: "turmoil",
      name: "動乱 (Turmoil)",
      desc: "6政党・代表者・議長・世界的イベント。毎世代 全員TR-1。",
      on: turmoil,
      set: onTurmoil
    },
    {
      key: "colonies",
      name: "植民地 (Colonies)",
      desc: "植民地タイル・交易船・交易報酬。",
      on: colonies,
      set: onColonies
    },
    {
      key: "prelude",
      name: "プレリュード (Prelude)",
      desc: "開始時に4枚から2枚を選び、即座に解決して加速する。",
      on: prelude,
      set: onPrelude
    },
    {
      key: "venus",
      name: "金星 (Venus Next)",
      desc: "金星スケール(0〜30%)が4つ目のパラメータになる。2%ごとにTR+1。",
      on: venus,
      set: onVenus
    },
    {
      key: "promo",
      name: "プロモカード",
      desc: "公式プロモーションカードを山札に加える。",
      on: promo,
      set: onPromo
    }
  ];

  const heading =
    intent === "solo" ? "ソロプレイの設定" : intent === "robot" ? "ロボット戦の設定" : "新規ゲーム設定";

  return (
    <div className="overlay-container">
      <div className="modal-content" style={{ maxWidth: "460px" }}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ color: "var(--color-gold)" }}>{heading}</h3>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {asksPlayerCount && (
            <div>
              <div className="section-title">
                <span>プレイ人数</span>
                <span className="section-note">
                  {playerCount === 1 ? "公式ソロルール・14世代制限" : "ホットシート（1画面を交代で使用）"}
                </span>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                {[1, 2, 3, 4, 5].map(count => (
                  <button
                    key={count}
                    type="button"
                    className="claim-button"
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      fontSize: "0.9rem",
                      backgroundColor:
                        playerCount === count ? "var(--color-rust)" : "rgba(168, 50, 32, 0.2)"
                    }}
                    aria-pressed={playerCount === count}
                    onClick={() => onPlayerCount(count)}
                  >
                    {count}人
                  </button>
                ))}
              </div>
            </div>
          )}

          {asksPlayerCount && playerCount > 1 && (
            <div>
              <div className="section-title">
                <span>プレイヤー名</span>
                <span className="section-note">空欄なら既定名</span>
              </div>
              <div style={{ display: "grid", gap: "6px" }}>
                {Array.from({ length: playerCount }, (_, index) => (
                  <input
                    key={index}
                    type="text"
                    value={playerNames[index] ?? ""}
                    placeholder={`プレイヤー${index + 1}`}
                    onChange={event => {
                      const next = [...playerNames];
                      next[index] = event.target.value;
                      onPlayerNames(next);
                    }}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "4px",
                      border: "1px solid rgba(242, 232, 220, 0.2)",
                      backgroundColor: "rgba(8, 9, 8, 0.6)",
                      color: "var(--color-ink)",
                      fontSize: "0.8rem"
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {(intent === "robot" || playerCount > 1) && (
            <div>
              <div className="section-title">
                <span>カードの配り方</span>
                <span className="section-note">
                  {intent === "robot" ? "ロボットも一緒に回す" : "2人以上でのみ選べる"}
                </span>
              </div>
              <label style={{ display: "flex", gap: "8px", alignItems: "flex-start", cursor: "pointer" }}>
                <input type="checkbox" checked={draft} onChange={event => onDraft(event.target.checked)} />
                <span>
                  <strong style={{ fontSize: "0.8rem" }}>ドラフト制</strong>
                  <div style={{ fontSize: "0.7rem", color: "#c9bfae" }}>
                    研究フェイズに4枚受け取り、1枚選んで残りを隣へ回す。世代ごとに回す向きが反転する。
                  </div>
                </span>
              </label>
            </div>
          )}

          <div>
            <div className="section-title">
              <span>マップ</span>
              <span className="section-note">盤面ごとに配置ボーナス・称号・褒賞が変わる</span>
            </div>
            <div className="board-picker">
              {boards.map(board => (
                <button
                  key={board.id}
                  type="button"
                  className={selectedBoard === board.id ? "btn-primary" : "btn-secondary"}
                  style={{ padding: "6px 14px", fontSize: "0.78rem" }}
                  onClick={() => onBoard(board.id)}
                >
                  {board.name}
                </button>
              ))}
            </div>

            <div className="section-title" style={{ marginTop: "14px" }}>
              <span>拡張</span>
              <span className="section-note">任意</span>
            </div>
            {EXPANSIONS.map(expansion => (
              <label
                key={expansion.key}
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "flex-start",
                  cursor: "pointer",
                  marginBottom: "8px"
                }}
              >
                <input
                  type="checkbox"
                  checked={expansion.on}
                  onChange={event => expansion.set(event.target.checked)}
                />
                <span>
                  <strong style={{ fontSize: "0.8rem" }}>{expansion.name}</strong>
                  <div style={{ fontSize: "0.7rem", color: "#c9bfae" }}>{expansion.desc}</div>
                </span>
              </label>
            ))}
          </div>

          <p style={{ fontSize: "0.7rem", color: "var(--color-rust)" }}>
            開始すると現在の進行状況は消去されます。
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>
            キャンセル
          </button>
          <button className="btn-primary" data-testid="setup-start-button" onClick={onStart}>
            {intent === "robot" ? "次へ (相手の設定)" : "この設定で開始"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RobotSetup({
  difficulty,
  onDifficulty,
  opponents,
  onOpponents,
  onStart,
  onCancel
}: {
  difficulty: string;
  onDifficulty: (id: string) => void;
  opponents: number;
  onOpponents: (count: number) => void;
  onStart: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="overlay-container">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">ロボット戦の設定</h3>
        </div>
        <div className="modal-body">
          <div className="section-title">
            <span>相手の強さ</span>
          </div>
          {BOT_DIFFICULTIES.map(entry => (
            <label key={entry.id} className="robot-option">
              <input
                type="radio"
                name="bot-difficulty"
                checked={difficulty === entry.id}
                onChange={() => onDifficulty(entry.id)}
              />
              <span>
                <strong className="robot-option-name">{entry.name}</strong>
                <span className="robot-option-desc">{entry.description}</span>
              </span>
            </label>
          ))}

          <div className="section-title" style={{ marginTop: "14px" }}>
            <span>相手の人数</span>
          </div>
          <div className="robot-counts">
            {[1, 2, 3, 4].map(count => (
              <button
                key={count}
                className={opponents === count ? "btn-primary" : "btn-secondary"}
                style={{ padding: "6px 16px", fontSize: "0.8rem" }}
                onClick={() => onOpponents(count)}
              >
                {count}体
              </button>
            ))}
          </div>

          <p style={{ fontSize: "0.7rem", color: "var(--color-rust)", marginTop: "14px" }}>
            開始すると現在の進行状況は消去されます。
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>
            戻る
          </button>
          <button className="btn-primary" data-testid="robot-setup-start-button" onClick={onStart}>
            この設定で開始
          </button>
        </div>
      </div>
    </div>
  );
}
