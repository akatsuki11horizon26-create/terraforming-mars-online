"use client";

import React from "react";
import { CardTag } from "./card-tags";

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
  victoryPoints?: number;
  victoryPointSpec?: Record<string, unknown>;
}

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

function victoryPointLabel(card: ProjectCardData) {
  if (card.victoryPoints) return String(card.victoryPoints);
  const spec = card.victoryPointSpec as { per?: number; each?: number } | undefined;
  if (!spec) return null;
  // "1 VP per 2 resources here" and similar dynamic values.
  if (spec.per) return `1/${spec.per}`;
  if (spec.each) return `${spec.each}`;
  return "?";
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
  const vp = victoryPointLabel(card);
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
      title={card.effectText}
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

      <span className="tm-card-name">{card.name}</span>

      {requirement && <span className="tm-card-req">{requirement}</span>}

      <span className="tm-card-body">{card.effectText}</span>

      <span className="tm-card-bottom">
        <span className="tm-card-type">{TYPE_LABEL[card.type] ?? card.type}</span>
        {vp && <span className="tm-card-vp">{vp}</span>}
      </span>

      {footer}
    </button>
  );
}
