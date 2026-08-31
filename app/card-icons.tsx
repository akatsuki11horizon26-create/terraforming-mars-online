"use client";

import React from "react";
import { CARD_ICON_ROWS } from "./card-icon-rows";
import { CARD_ICON_GLYPHS, CARD_TAG_GLYPHS, CARD_RESOURCE_GLYPHS } from "./card-icon-glyphs";

// The icon row a card prints, above its Japanese text rather than instead of it.
//
// The reference draws its cards almost entirely in symbols; ours drew a sentence
// and nothing else, so there was never anything to compare against upstream --
// the icons were not wrong, they did not exist. These rows come from upstream's
// own render tree at the pinned SHA, reduced by scripts/generate-card-icons.mjs.
//
// Only cards whose every symbol we can draw get a row: a row with one icon
// silently missing reads as a different card, so the rest show their text alone.
// The text is always there either way -- it is what a screen reader gets, and
// what a player falls back on when a symbol is unfamiliar.

// Punctuation and structure. Drawn as text, at a smaller weight than the icons.
const SYMBOL_TEXT: Record<string, string> = {
  "*": "*", "->": "→", ":": ":", "-": "−", "/": "/", OR: "or",
  "+": "+", "=": "=", "(": "(", ")": ")", " ": " ", nbsp: " "
};

type Token = {
  i?: string; n?: number; all?: boolean; r?: string; t?: string;
  s?: string; prod?: Token[]; effect?: Token[][]; action?: Token[][]; group?: Token[][];
};

const label = (token: Token): string => {
  if (token.s) return SYMBOL_TEXT[token.s] ?? token.s;
  // A tag or a card resource says which one it means; drawing the generic icon
  // loses the difference between "three plant tags" and "three science tags".
  const specific =
    (token.i === "tag" && token.t && (CARD_TAG_GLYPHS as Record<string, string>)[token.t]) ||
    (token.i === "resource" && token.r && (CARD_RESOURCE_GLYPHS as Record<string, string>)[token.r]);
  const glyph = specific || (CARD_ICON_GLYPHS as Record<string, string>)[token.i ?? ""] || "?";
  const count = token.n !== undefined && token.n !== -1 ? String(token.n) : "";
  return `${count}${glyph}`;
};

function Tokens({ tokens }: { tokens: Token[] }) {
  return (
    <>
      {tokens.map((token, index) => {
        if (token.prod) {
          return (
            <span key={index} className="tm-icon-prod">
              <Tokens tokens={token.prod} />
            </span>
          );
        }
        const nested = token.effect ?? token.action ?? token.group;
        if (nested) {
          const kind = token.effect ? "effect" : token.action ? "action" : "group";
          return (
            <span key={index} className="tm-icon-box" data-kind={kind}>
              {nested.map((row, rowIndex) => (
                <span key={rowIndex} className="tm-icon-row">
                  <Tokens tokens={row} />
                </span>
              ))}
            </span>
          );
        }
        if (token.s) {
          return <span key={index} className="tm-icon-sym">{label(token)}</span>;
        }
        return (
          <span
            key={index}
            className="tm-icon"
            data-icon={token.i}
            data-all={token.all ? "true" : undefined}
          >
            {label(token)}
          </span>
        );
      })}
    </>
  );
}

export function CardIcons({ cardId }: { cardId: string }) {
  const rows = (CARD_ICON_ROWS as Record<string, Token[][]>)[cardId];
  if (!rows) return null;
  return (
    // The text below carries the meaning for a screen reader; the icons repeat
    // it, so they are hidden rather than read out twice.
    <span className="tm-card-icons" aria-hidden="true">
      {rows.map((row, index) => (
        <span key={index} className="tm-icon-row">
          <Tokens tokens={row} />
        </span>
      ))}
    </span>
  );
}
