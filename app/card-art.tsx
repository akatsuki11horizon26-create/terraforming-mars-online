"use client";

import React from "react";
import { CARD_ART } from "./card-art.data";

// Art is inlined rather than loaded as <img src>: the SVGs are a few hundred
// bytes each, so a request per card would cost far more than the markup, and
// inlining lets them inherit the page's colours.
export function CardArt({ cardId, tags }: { cardId: string; tags?: string[] }) {
  const art = CARD_ART[cardId] ?? fallbackFor(tags);
  if (!art) return null;

  return (
    <span
      className="tm-card-art"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: art }}
    />
  );
}

// Cards without their own drawing borrow the art of their first illustrated
// tag, so a partially generated set still renders as a complete deck.
function fallbackFor(tags?: string[]) {
  for (const tag of tags ?? []) {
    const art = CARD_ART[`@tag-${tag}`];
    if (art) return art;
  }
  return CARD_ART["@tag-default"] ?? null;
}
