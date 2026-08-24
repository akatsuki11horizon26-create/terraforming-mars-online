"use client";

import React from "react";

interface PendingChoiceOption {
  id: string;
  label: string;
  targetPlayerId?: string;
  targetCardId?: string;
  targetCellKey?: string;
  resource?: string;
  amount?: number;
}

interface PendingChoice {
  id: string;
  kind: string;
  ownerPlayerId: string;
  prompt: string;
  optional: boolean;
  options: PendingChoiceOption[];
  continuation: { remaining?: number };
}

interface PlayerSummary {
  id: string;
  name: string;
  tr: number;
  mc: number;
  passed?: boolean;
}

const PARTY_COLORS: Record<string, string> = {
  mars: "var(--color-mars)",
  scientists: "var(--color-scientists)",
  unity: "var(--color-unity)",
  greens: "var(--color-greens)",
  reds: "var(--color-reds)",
  kelvinists: "var(--color-kelvinists)"
};

export function PlayerBar({
  players,
  currentPlayerId,
  onSelect
}: {
  players: PlayerSummary[];
  currentPlayerId: string;
  onSelect?: (playerId: string) => void;
}) {
  if (players.length <= 1) return null;
  return (
    <div className="player-bar" role="group" aria-label="プレイヤー">
      {players.map(player => (
        <button
          key={player.id}
          type="button"
          className="player-chip"
          aria-current={player.id === currentPlayerId}
          data-passed={player.passed ? "true" : "false"}
          onClick={() => onSelect?.(player.id)}
        >
          <span className="player-chip-name">{player.name}</span>
          <span className="player-chip-stats">
            <span className="player-chip-tr">TR {player.tr}</span>
            <span>{player.mc} MC</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export function PendingChoiceDialog({
  choice,
  players,
  onResolve,
  onBoard = false
}: {
  choice: PendingChoice | null;
  players: PlayerSummary[];
  onResolve: (optionId: string) => void;
  // The board itself is taking the answer, so this must not cover it.
  onBoard?: boolean;
}) {
  if (!choice) return null;
  const owner = players.find(player => player.id === choice.ownerPlayerId);
  const remaining = choice.continuation?.remaining ?? 1;

  // Picking a space is done on the map. Listing "(3, -2)" over a blurred board
  // asked the player to place a tile they could not see.
  if (onBoard) {
    return (
      <div className="choice-banner" role="status" aria-label={choice.prompt}>
        <div className="choice-banner-prompt">{choice.prompt}</div>
        <div className="choice-banner-note">
          光っているマスをクリックして配置してください。
          {remaining > 1 ? ` (残り ${remaining} 回)` : ""}
        </div>
        {choice.optional ? (
          <button type="button" className="choice-decline" onClick={() => onResolve("__decline__")}>
            配置しない
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="choice-overlay" role="dialog" aria-modal="true" aria-label={choice.prompt}>
      <div className="choice-dialog">
        <div className="choice-header">
          <div className="choice-owner">{owner?.name ?? choice.ownerPlayerId} の選択</div>
          <div className="choice-prompt">{choice.prompt}</div>
        </div>
        <div className="choice-options">
          {choice.options.map(option => (
            <button
              key={option.id}
              type="button"
              className="choice-option"
              onClick={() => onResolve(option.id)}
            >
              <span>{option.label}</span>
              {option.amount !== undefined && option.targetCardId ? (
                <span className="choice-option-detail">現在 {option.amount}</span>
              ) : null}
            </button>
          ))}
        </div>
        {choice.optional ? (
          <div className="choice-footer">
            <button type="button" className="choice-decline" onClick={() => onResolve("__decline__")}>
              使用しない
            </button>
          </div>
        ) : null}
        {remaining > 1 ? (
          <div className="choice-footer">残り {remaining} 回の選択があります。</div>
        ) : null}
      </div>
    </div>
  );
}

interface MilestoneView {
  id: string;
  name: string;
  description: string;
  score: number;
  threshold: number;
  claimable: boolean;
  reason: string;
  ownerName?: string;
}

export function MilestonePanel({
  milestones,
  onClaim
}: {
  milestones: MilestoneView[];
  onClaim: (id: string) => void;
}) {
  const taken = milestones.filter(milestone => milestone.ownerName).length;
  return (
    <div>
      <div className="section-title">
        <span>マイルストーン</span>
        <span className="section-note">{taken} / 3 獲得済み・8 MC</span>
      </div>
      <div className="claim-grid">
        {milestones.map(milestone => (
          <div key={milestone.id} className="claim-row" data-taken={milestone.ownerName ? "true" : "false"}>
            <div>
              <div className="claim-name">{milestone.name}</div>
              <div className="claim-desc">{milestone.description}</div>
              {milestone.ownerName ? (
                <div className="claim-owner">{milestone.ownerName} が獲得</div>
              ) : (
                <div className="claim-progress">
                  {milestone.score} / {milestone.threshold}
                </div>
              )}
            </div>
            <button
              type="button"
              className="claim-button"
              disabled={!milestone.claimable}
              title={milestone.reason || undefined}
              onClick={() => onClaim(milestone.id)}
            >
              獲得
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AwardView {
  id: string;
  name: string;
  description: string;
  fundable: boolean;
  reason: string;
  cost: number;
  ownerName?: string;
  leaderName?: string;
  leaderScore?: number;
}

export function AwardPanel({
  awards,
  nextCost,
  onFund
}: {
  awards: AwardView[];
  nextCost: number;
  onFund: (id: string) => void;
}) {
  const funded = awards.filter(award => award.ownerName).length;
  return (
    <div>
      <div className="section-title">
        <span>表彰</span>
        <span className="section-note">
          {funded} / 3 設立済み・次は {nextCost} MC
        </span>
      </div>
      <div className="claim-grid">
        {awards.map(award => (
          <div key={award.id} className="claim-row" data-taken={award.ownerName ? "true" : "false"}>
            <div>
              <div className="claim-name">{award.name}</div>
              <div className="claim-desc">{award.description}</div>
              {award.ownerName ? (
                <div className="claim-owner">
                  {award.ownerName} が設立
                  {award.leaderName ? ` ・ 首位 ${award.leaderName} (${award.leaderScore})` : ""}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="claim-button"
              disabled={!award.fundable}
              title={award.reason || undefined}
              onClick={() => onFund(award.id)}
            >
              設立
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PartyView {
  id: string;
  name: string;
  delegates: string[];
  leaderName?: string;
  isRuling: boolean;
  isDominant: boolean;
  delegateCount?: number;
}

// The ruling policy is in force for every action taken this generation, and the
// dominant party becomes the next government, so both belong on screen rather
// than behind a drawer button. Without them a player picks cards blind to the
// rules currently in effect.
export function TurmoilGlance({
  parties,
  chairmanName,
  influence,
  rulingPolicyText,
  events,
  hasFreeLobbyDelegate,
  onOpen
}: {
  parties: PartyView[];
  chairmanName: string;
  influence: number;
  rulingPolicyText: string;
  events: { slot: string; label: string; name: string }[];
  hasFreeLobbyDelegate: boolean;
  onOpen: () => void;
}) {
  const ruling = parties.find(party => party.isRuling);
  const dominant = parties.find(party => party.isDominant);
  const counts = [...parties].sort(
    (a, b) => (b.delegateCount ?? 0) - (a.delegateCount ?? 0)
  );
  // How safe the next government is: the gap to whoever is second.
  const margin =
    counts.length > 1 ? (counts[0].delegateCount ?? 0) - (counts[1].delegateCount ?? 0) : 0;
  const current = events.find(event => event.slot === "current");
  const coming = events.find(event => event.slot === "coming");

  return (
    <section className="glance-card glance-card--turmoil">
      <button type="button" className="glance-title" onClick={onOpen}>
        <span>動乱</span>
        <span className="glance-title-note">議長 {chairmanName} ・ 影響力 {influence}</span>
      </button>

      <div
        className="glance-row"
        style={{ ["--party-color" as string]: PARTY_COLORS[ruling?.id ?? ""] ?? "var(--color-rust)" }}
      >
        <span className="glance-label">現与党</span>
        <span className="glance-party">{ruling?.name ?? "—"}</span>
        <span className="glance-policy" title={rulingPolicyText}>
          {rulingPolicyText || "—"}
        </span>
      </div>

      <div
        className="glance-row"
        style={{ ["--party-color" as string]: PARTY_COLORS[dominant?.id ?? ""] ?? "var(--color-rust)" }}
      >
        <span className="glance-label">次期</span>
        <span className="glance-party">{dominant?.name ?? "—"}</span>
        <span className="glance-policy">
          {margin > 0 ? `${margin}人差` : "同数"}
          {dominant?.leaderName ? ` ・党首 ${dominant.leaderName}` : ""}
        </span>
      </div>

      <div className="glance-footer">
        {/* Generation 1 genuinely has no current event; saying so beats an
            em dash, which reads as missing data rather than as the rule. */}
        <span
          className="glance-event"
          title={
            current && current.name !== "—"
              ? `世代末に解決: ${current.name}`
              : "第1世代には現行イベントがありません"
          }
        >
          {current && current.name !== "—" ? `世代末 ${current.name}` : "世代末 なし"}
        </span>
        <span className="glance-event-next">次 {coming?.name ?? "—"}</span>
        {hasFreeLobbyDelegate && <span className="glance-flag">無料派遣 1</span>}
      </div>
    </section>
  );
}

export function TurmoilPanel({
  parties,
  chairmanName,
  influence,
  influenceParts = [],
  events,
  canSendDelegate,
  onSendDelegate
}: {
  parties: PartyView[];
  chairmanName: string;
  influence: number;
  influenceParts?: { label: string; amount: number }[];
  events: { slot: string; label: string; name: string }[];
  canSendDelegate: boolean;
  onSendDelegate: (partyId: string) => void;
}) {
  return (
    <div>
      <div className="section-title">
        <span>動乱</span>
        <span className="section-note">
          議長 {chairmanName} ・ 影響力 {influence}
        </span>
      </div>
      {/* Influence softens every global event, so where it comes from is the
          part a player actually needs in order to plan around one. */}
      <ul className="influence-breakdown">
        {influenceParts.length > 0 ? (
          influenceParts.map(part => (
            <li key={part.label}>
              <span>{part.label}</span>
              <span>+{part.amount}</span>
            </li>
          ))
        ) : (
          <li>
            <span>影響力の供給元なし</span>
            <span>0</span>
          </li>
        )}
      </ul>
      <div className="turmoil-parties">
        {parties.map(party => (
          <div
            key={party.id}
            className="party-row"
            data-ruling={party.isRuling ? "true" : "false"}
            style={{ ["--party-color" as string]: PARTY_COLORS[party.id] ?? "var(--color-rust)" }}
          >
            <div>
              <div className="party-name">
                {party.name}
                {party.isRuling
                  ? " ・現与党（政策が有効）"
                  : party.isDominant
                    ? " ・優勢党（世代末に与党へ）"
                    : ""}
              </div>
              <div className="party-meta">
                代表者 {party.delegates.length}
                {party.leaderName ? ` ・党首 ${party.leaderName}` : ""}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div className="delegate-dots" aria-hidden="true">
                {party.delegates.map((delegate, index) => (
                  <span
                    key={`${delegate}-${index}`}
                    className="delegate-dot"
                    data-neutral={delegate === "NEUTRAL" ? "true" : "false"}
                  />
                ))}
              </div>
              <button
                type="button"
                className="claim-button"
                disabled={!canSendDelegate}
                title={canSendDelegate ? "ロビーの代表者を無料で送る" : "ロビーに代表者がいません（予備からは5 MC）"}
                onClick={() => onSendDelegate(party.id)}
              >
                {canSendDelegate ? "無料で送る" : "送る"}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="turmoil-events">
        {events.map(event => (
          <div key={event.slot} className="event-slot" data-slot={event.slot}>
            <div className="event-slot-label">{event.label}</div>
            <div>{event.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ColonyView {
  id: string;
  name: string;
  tradeDescription: string;
  track: (number | string)[];
  trackPosition: number;
  colonies: string[];
  canBuild: boolean;
  buildReason: string;
  canTrade: boolean;
  tradeReason: string;
  currentIncome?: string;
  colonyCount?: number;
}

// Each colony accepts one trade ship per generation and the payout depends on
// the marker's position, so choosing a trade means comparing every tile at
// once. Reopening a drawer per tile made that comparison impossible.
export function ColonyGlance({
  colonies,
  fleets,
  onOpen
}: {
  colonies: ColonyView[];
  fleets: number;
  onOpen: () => void;
}) {
  return (
    <section className="glance-card glance-card--colonies">
      <button type="button" className="glance-title" onClick={onOpen}>
        <span>植民地</span>
        <span className="glance-title-note">待機船 {fleets}</span>
      </button>
      <ul className="colony-glance-list">
        {colonies.map(colony => (
          <li
            key={colony.id}
            className="colony-glance-row"
            data-available={colony.canTrade ? "true" : "false"}
          >
            <span className="colony-glance-name">{colony.name}</span>
            <span className="colony-glance-status">
              {colony.canTrade ? "交易可" : "不可"}
            </span>
            <span className="colony-glance-income">{colony.currentIncome ?? "—"}</span>
            <span className="colony-glance-owners" title={colony.colonies.join(", ")}>
              {colony.colonies.length > 0 ? colony.colonies.join(",") : "所有者なし"}
            </span>
            <span className="colony-glance-slots">{colony.colonyCount ?? 0}/3</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ColonyPanel({
  colonies,
  fleets,
  onBuild,
  onTrade
}: {
  colonies: ColonyView[];
  fleets: number;
  onBuild: (id: string) => void;
  onTrade: (id: string) => void;
}) {
  return (
    <div>
      <div className="section-title">
        <span>植民地</span>
        <span className="section-note">交易船 {fleets}</span>
      </div>
      <div className="colony-list">
        {colonies.map(colony => (
          <div key={colony.id} className="colony-tile">
            <div className="colony-head">
              <span className="colony-name">{colony.name}</span>
              <span className="colony-slots">
                {[0, 1, 2].map(slot => (
                  <span
                    key={slot}
                    className="colony-slot"
                    data-filled={colony.colonies[slot] ? "true" : "false"}
                    title={colony.colonies[slot] ?? "空き"}
                  >
                    {colony.colonies[slot] ? colony.colonies[slot].slice(-1) : ""}
                  </span>
                ))}
              </span>
            </div>
            <div className="colony-benefit">{colony.tradeDescription}</div>
            <div className="colony-track">
              {colony.track.map((step, index) => (
                <span
                  key={index}
                  className="track-step"
                  data-active={index === colony.trackPosition ? "true" : "false"}
                >
                  {step}
                </span>
              ))}
            </div>
            <div className="colony-actions">
              <button
                type="button"
                className="claim-button"
                disabled={!colony.canBuild}
                title={colony.buildReason || undefined}
                onClick={() => onBuild(colony.id)}
              >
                入植
              </button>
              <button
                type="button"
                className="claim-button"
                disabled={!colony.canTrade}
                title={colony.tradeReason || undefined}
                onClick={() => onTrade(colony.id)}
              >
                交易
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
