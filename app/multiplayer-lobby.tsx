"use client";

import React, { useState } from "react";
import { generateRoomCode, normalizeRoomCode, isValidRoomCode } from "./net-protocol.js";
import type { ConnectionStatus, RoomSummary } from "./use-room";

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  idle: "未接続",
  connecting: "接続中…",
  open: "接続済み",
  closed: "切断 — 再接続中…",
  error: "接続エラー"
};

export function MultiplayerLobby({
  status,
  room,
  error,
  playerId,
  onConnect,
  onDisconnect,
  onStart,
  onClose
}: {
  status: ConnectionStatus;
  room: RoomSummary | null;
  error: string | null;
  playerId: string;
  onConnect: (code: string, name: string) => void;
  onDisconnect: () => void;
  onStart: (options: { turmoil: boolean; colonies: boolean }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [turmoil, setTurmoil] = useState(false);
  const [colonies, setColonies] = useState(false);

  const isHost = room?.hostId === playerId;
  const canStart = isHost && (room?.members.length ?? 0) >= 2;

  const joinWith = (roomCode: string) => {
    const normalized = normalizeRoomCode(roomCode);
    if (!isValidRoomCode(normalized)) return;
    onConnect(normalized, name.trim() || "プレイヤー");
  };

  return (
    <div className="overlay-container">
      <div className="modal-content" style={{ maxWidth: "520px" }}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ color: "var(--color-cyan)" }}>オンライン対戦</h3>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="section-title">
            <span>接続状態</span>
            <span className="section-note">{STATUS_LABEL[status]}</span>
          </div>

          {error && (
            <div
              style={{
                padding: "8px 10px",
                border: "1px solid var(--color-rust)",
                borderRadius: "4px",
                backgroundColor: "rgba(168, 50, 32, 0.12)",
                fontSize: "0.75rem",
                color: "var(--color-ember)"
              }}
            >
              {error}
            </div>
          )}

          {!room && (
            <>
              <div>
                <div className="section-title"><span>あなたの名前</span></div>
                <input
                  type="text"
                  value={name}
                  placeholder="プレイヤー"
                  onChange={event => setName(event.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <div className="section-title">
                  <span>部屋を立てる</span>
                  <span className="section-note">合言葉が発行されます</span>
                </div>
                <button
                  className="btn-primary"
                  style={{ width: "100%" }}
                  disabled={status === "connecting"}
                  onClick={() => joinWith(generateRoomCode())}
                >
                  新しい部屋を作成
                </button>
              </div>

              <div>
                <div className="section-title">
                  <span>合言葉で参加</span>
                  <span className="section-note">5文字</span>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={code}
                    placeholder="ABCDE"
                    maxLength={5}
                    onChange={event => setCode(normalizeRoomCode(event.target.value))}
                    style={{
                      ...inputStyle,
                      flex: 1,
                      textTransform: "uppercase",
                      letterSpacing: "0.3em",
                      fontFamily: "monospace",
                      fontSize: "1.1rem",
                      textAlign: "center"
                    }}
                  />
                  <button
                    className="btn-secondary"
                    disabled={!isValidRoomCode(code) || status === "connecting"}
                    onClick={() => joinWith(code)}
                  >
                    参加
                  </button>
                </div>
              </div>
            </>
          )}

          {room && (
            <>
              <div>
                <div className="section-title">
                  <span>合言葉</span>
                  <span className="section-note">この文字列を相手に伝えてください</span>
                </div>
                <div
                  style={{
                    padding: "12px",
                    textAlign: "center",
                    fontFamily: "monospace",
                    fontSize: "2rem",
                    letterSpacing: "0.4em",
                    color: "var(--color-cyan)",
                    border: "1px solid var(--color-cyan)",
                    borderRadius: "6px",
                    backgroundColor: "rgba(114, 217, 208, 0.08)"
                  }}
                >
                  {room.code}
                </div>
                <button
                  className="btn-secondary"
                  style={{ width: "100%", marginTop: "6px", fontSize: "0.75rem" }}
                  onClick={() => navigator.clipboard?.writeText(room.code)}
                >
                  合言葉をコピー
                </button>
              </div>

              <div>
                <div className="section-title">
                  <span>参加者</span>
                  <span className="section-note">{room.members.length} / 5人</span>
                </div>
                <div style={{ display: "grid", gap: "6px" }}>
                  {room.members.map(member => (
                    <div key={member.playerId} className="claim-row">
                      <div>
                        <div className="claim-name">
                          {member.name}
                          {member.playerId === playerId ? "（あなた）" : ""}
                          {member.isHost ? " ・部屋主" : ""}
                        </div>
                        <div className="claim-desc">
                          {member.connected ? "接続中" : "切断中"}
                        </div>
                      </div>
                      <span
                        className="delegate-dot"
                        style={{
                          backgroundColor: member.connected ? "var(--color-cyan)" : "rgba(242,232,220,0.3)"
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {!room.started && isHost && (
                <div>
                  <div className="section-title"><span>拡張</span></div>
                  <label style={checkboxRow}>
                    <input type="checkbox" checked={turmoil} onChange={e => setTurmoil(e.target.checked)} />
                    <span style={{ fontSize: "0.8rem" }}>動乱 (Turmoil)</span>
                  </label>
                  <label style={checkboxRow}>
                    <input type="checkbox" checked={colonies} onChange={e => setColonies(e.target.checked)} />
                    <span style={{ fontSize: "0.8rem" }}>植民地 (Colonies)</span>
                  </label>
                </div>
              )}

              {!room.started && !isHost && (
                <p style={{ fontSize: "0.75rem", color: "#c9bfae" }}>
                  部屋主がゲームを開始するのを待っています…
                </p>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          {room ? (
            <>
              <button className="btn-secondary" onClick={onDisconnect}>
                退出
              </button>
              {isHost && !room.started && (
                <button
                  className="btn-primary"
                  disabled={!canStart}
                  title={canStart ? undefined : "2人以上必要です"}
                  onClick={() => onStart({ turmoil, colonies })}
                >
                  ゲーム開始
                </button>
              )}
              {room.started && (
                <button className="btn-primary" onClick={onClose}>
                  盤面へ戻る
                </button>
              )}
            </>
          ) : (
            <button className="btn-secondary" onClick={onClose}>
              閉じる
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: "4px",
  border: "1px solid rgba(242, 232, 220, 0.2)",
  backgroundColor: "rgba(8, 9, 8, 0.6)",
  color: "var(--color-ink)",
  fontSize: "0.85rem"
};

const checkboxRow: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
  cursor: "pointer",
  marginBottom: "6px"
};
