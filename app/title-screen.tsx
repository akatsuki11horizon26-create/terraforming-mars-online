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
          <button className="title-continue" onClick={onContinue}>
            前回の続きから
          </button>
        )}

        <div className="title-modes">
          <button className="title-mode" onClick={onSolo}>
            <span className="title-mode-icon" aria-hidden="true">◇</span>
            <span className="title-mode-body">
              <span className="title-mode-name">ソロプレイ</span>
              <span className="title-mode-desc">
                公式ソロルール。14世代以内に気温・酸素・海洋をすべて最大化する。
              </span>
            </span>
          </button>

          <button className="title-mode" onClick={onRobot}>
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

        <button className="title-manual" onClick={onManual}>
          ルールマニュアルを読む
        </button>
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
          <button className="btn-primary" onClick={onStart}>
            この設定で開始
          </button>
        </div>
      </div>
    </div>
  );
}
