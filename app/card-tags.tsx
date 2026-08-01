"use client";

import React from "react";

// The twelve tags that appear across the catalog. Each gets its own colour and
// symbol so a card's attributes are readable at a glance rather than eight
// identical gold chips.
export const TAG_INFO: Record<string, { label: string; symbol: string; color: string }> = {
  Building: { label: "建材", symbol: "🏗", color: "#B98A4E" },
  Space: { label: "宇宙", symbol: "🚀", color: "#8C7BC4" },
  Power: { label: "電力", symbol: "⚡", color: "#D8B33A" },
  Science: { label: "科学", symbol: "🔬", color: "#5FA8C9" },
  Earth: { label: "地球", symbol: "🌍", color: "#4E8FD6" },
  Jovian: { label: "ジョビアン", symbol: "🪐", color: "#B07CC6" },
  Venus: { label: "金星", symbol: "♀", color: "#D98FBF" },
  Plant: { label: "植物", symbol: "🌱", color: "#6FBF73" },
  Microbe: { label: "微生物", symbol: "🦠", color: "#7FB069" },
  Animal: { label: "動物", symbol: "🐾", color: "#C98B5E" },
  City: { label: "都市", symbol: "🏙", color: "#C4726A" },
  Wild: { label: "ワイルド", symbol: "★", color: "#E5B563" }
};

export function tagLabel(tag: string): string {
  return TAG_INFO[tag]?.label ?? tag;
}

export function CardTag({ tag }: { tag: string }) {
  const info = TAG_INFO[tag];
  return (
    <span
      className="card-tag"
      style={info ? ({ ["--tag-color" as string]: info.color } as React.CSSProperties) : undefined}
      title={info?.label ?? tag}
    >
      <span aria-hidden="true">{info?.symbol ?? "●"}</span>
      <span className="card-tag-name">{info?.label ?? tag}</span>
    </span>
  );
}

export function CardTags({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) {
    return <span className="card-tag card-tag-none">タグなし</span>;
  }
  return (
    <span className="card-tags">
      {tags.map((tag, index) => (
        <CardTag key={`${tag}-${index}`} tag={tag} />
      ))}
    </span>
  );
}
