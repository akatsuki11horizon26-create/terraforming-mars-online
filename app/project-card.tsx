"use client";

import React from "react";
import { CardTag } from "./card-tags";
import { CardArt } from "./card-art";
import { completeEffectText } from "./effect-summary";

// A project card laid out like the printed one: cost in a disc at the top left,
// tags at the top right, the card type banded by colour (green automated, blue
// active, red event), requirements above the effect text and victory points in
// the bottom right corner.
export interface ProjectCardData {
  id: string;
  name: string;
  cost: number;
  tags: string[];
  type: string;
  reqText?: string;
  effectText?: string;
  effectSpec?: Record<string, unknown>;
  victoryPoints?: number;
  victoryPointSpec?: Record<string, unknown>;
}

// Card height as a multiple of its width. The hand-fitting maths needs the same
// number the stylesheet uses, so it lives here rather than being written twice.
export const CARD_ASPECT = 1.58;

// The reference width the card's internal type sizes and spacing are drawn at.
// Everything inside scales by --card-w / this, so a narrow card is the wide one
// shrunk uniformly rather than the same chrome crushing the rules text.
export const CARD_REFERENCE_WIDTH = 148;

// Uniform scaling keeps the proportions at any size, but the 9.5px effect text
// stops being readable below roughly 7px. That floor is what caps how far a
// card may shrink; a hand that still does not fit scrolls instead.
export const MIN_CARD_WIDTH = 110;

const TYPE_LABEL: Record<string, string> = {
  automated: "自動",
  active: "アクション",
  event: "イベント"
};

// Requirements arrive as raw JSON on generated cards; the readable sentence is
// already at the front of effectText, so only show reqText when it is prose.
function readableRequirement(reqText?: string) {
  if (!reqText) return null;
  const trimmed = reqText.trim();
  if (!trimmed || trimmed === "なし") return null;
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) return null;
  return trimmed;
}

// What a dynamic card counts, in the order computeScore reads the spec.
function victoryPointUnit(spec: VictoryPointSpec) {
  if (spec.resourcesHere !== undefined) return "資源";
  if (spec.tag) return "タグ";
  if (spec.colonies !== undefined) return "コロニー";
  if (spec.cities !== undefined) return "都市";
  if (spec.oceans !== undefined) return "海洋";
  return "";
}

interface VictoryPointSpec {
  per?: number;
  each?: number;
  resourcesHere?: unknown;
  tag?: unknown;
  colonies?: unknown;
  cities?: unknown;
  oceans?: unknown;
}

function victoryPointLabel(card: ProjectCardData) {
  if (card.victoryPoints) return String(card.victoryPoints);
  const spec = card.victoryPointSpec as VictoryPointSpec | undefined;
  if (!spec) return null;
  // A card scoring one point per unit sets neither `per` nor `each`. That was
  // the common case and it rendered as a bare "?", which reads as a bug.
  if (spec.per) return `1/${spec.per}`;
  return String(spec.each ?? 1);
}

// The badge only has room for a number, so what is being counted goes in the
// tooltip -- otherwise "1/2" never says two of what.
function victoryPointTitle(card: ProjectCardData) {
  const spec = card.victoryPointSpec as VictoryPointSpec | undefined;
  if (!spec) return card.victoryPoints ? `${card.victoryPoints} 勝利点` : undefined;
  const unit = victoryPointUnit(spec);
  if (!unit) return undefined;
  if (spec.per) return `${unit}${spec.per}個ごとに1勝利点`;
  const each = spec.each ?? 1;
  return `${unit}1個につき${each}勝利点`;
}

export function ProjectCard({
  card,
  selected,
  disabled,
  affordable,
  cost,
  onClick,
  footer
}: {
  card: ProjectCardData;
  selected?: boolean;
  disabled?: boolean;
  affordable?: boolean;
  cost?: number;
  onClick?: () => void;
  footer?: React.ReactNode;
}) {
  const requirement = readableRequirement(card.reqText);
  // Catalog text sometimes omits part of what the card does; the engine applies
  // the whole spec, so the card must show the whole spec too.
  const effectText = completeEffectText(card as never);
  const vp = victoryPointLabel(card);
  const vpTitle = victoryPointTitle(card);
  const payable = cost ?? card.cost;

  return (
    <button
      type="button"
      className="tm-card"
      data-type={card.type}
      data-selected={selected ? "true" : "false"}
      data-affordable={affordable === false ? "false" : "true"}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      title={effectText}
    >
      <span className="tm-card-top">
        <span className="tm-card-cost" data-discounted={payable !== card.cost ? "true" : "false"}>
          {payable}
        </span>
        <span className="tm-card-tags">
          {card.tags.map((tag, index) => (
            <CardTag key={`${tag}-${index}`} tag={tag} compact />
          ))}
        </span>
      </span>

      <CardArt cardId={card.id} tags={card.tags} />

      <span className="tm-card-name">{card.name}</span>

      {requirement && <span className="tm-card-req">{requirement}</span>}

      <span className="tm-card-body">{effectText}</span>

      <span className="tm-card-bottom">
        <span className="tm-card-type">{TYPE_LABEL[card.type] ?? card.type}</span>
        {vp && (
          <span className="tm-card-vp" title={vpTitle} aria-label={vpTitle ?? `${vp} 勝利点`}>
            {vp}
          </span>
        )}
      </span>

      {footer}
    </button>
  );
}
