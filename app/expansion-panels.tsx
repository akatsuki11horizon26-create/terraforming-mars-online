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
  onResolve
}: {
  choice: PendingChoice | null;
  players: PlayerSummary[];
  onResolve: (optionId: string) => void;
}) {
  if (!choice) return null;
  const owner = players.find(player => player.id === choice.ownerPlayerId);
  const remaining = choice.continuation?.remaining ?? 1;

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
}

export function TurmoilPanel({
  parties,
  chairmanName,
  influence,
  events,
  canSendDelegate,
  onSendDelegate
}: {
  parties: PartyView[];
  chairmanName: string;
  influence: number;
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
                {party.isRuling ? " ・与党" : party.isDominant ? " ・優勢" : ""}
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
                onClick={() => onSendDelegate(party.id)}
              >
                送る
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
