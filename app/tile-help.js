const BONUS_TEXT = {
  plant: n => `植物 +${n}`,
  steel: n => `鋼鉄 +${n}`,
  titanium: n => `チタン +${n}`,
  mc: n => `MC +${n}`,
  card: n => `カードを${n}枚引く`
};

export const TILE_LEGEND = [
  { icon: "🌲", name: "緑地タイル", text: "配置時に酸素を1%上昇。得点1点。隣接する自分の都市にも得点が入る。" },
  { icon: "🏙️", name: "都市タイル", text: "隣接する緑地1枚につき得点1点。緑地とは隣接できるが、他の都市とは隣接できない。" },
  { icon: "🌊", name: "海洋タイル", text: "全部で9枚まで。配置時にTRが1上がる。海洋に隣接するタイトルを置くと2MCの隣接ボーナス。" },
  { icon: "🌱", name: "植物ボーナス", text: "このマスにタイルを置くと、書かれた数だけ植物を得る。" },
  { icon: "🤖", name: "鋼鉄ボーナス", text: "このマスにタイルを置くと、書かれた数だけ鋼鉄を得る。" },
  { icon: "🚀", name: "チタンボーナス", text: "このマスにタイルを置くと、書かれた数だけチタンを得る。" },
  { icon: "🃏", name: "カードボーナス", text: "このマスにタイルを置くと、書かれた枚数だけカードを引く。" },
  { icon: "🌋", name: "火山", text: "火星の火山地帯。ゲーム上の効果はないが、都市や緑地の配置制限の目印になる。" },
  { icon: "🔒", name: "予約マス", text: "特定のカード専用のマス。そのカード以外では配置できない。" }
];

export function describeCell(cell) {
  const parts = [];

  if (cell.name) parts.push(`【${cell.name}】`);

  if (cell.tileType === "forest") {
    parts.push(cell.placedBy === "neutral" ? "中立の緑地タイル。" : "緑地タイル。得点1点。");
  } else if (cell.tileType === "city") {
    parts.push(cell.placedBy === "neutral" ? "中立の都市タイル。" : "都市タイル。隣接する緑地1枚につき1点。");
  } else if (cell.tileType === "ocean") {
    parts.push("海洋タイル。隣接して配置すると2MCの隣接ボーナス。");
  } else {
    parts.push(cell.isOceanOnly ? "海洋専用マス。海洋タイルのみ配置できる。" : "陸地マス。");

    const bonuses = [];
    if (cell.bonusType === "multi" && Array.isArray(cell.bonus)) {
      for (const b of cell.bonus) {
        const fn = BONUS_TEXT[b.type];
        if (fn) bonuses.push(fn(b.amount));
      }
    } else if (cell.bonusType && cell.bonusType !== "none") {
      const fn = BONUS_TEXT[cell.bonusType];
      if (fn) bonuses.push(fn(cell.bonusAmount));
    }
    if (bonuses.length) parts.push(`配置ボーナス: ${bonuses.join(" / ")}`);
  }

  if (cell.volcanic) parts.push("火山地帯。");
  if (cell.reservedFor) parts.push("特定カード専用の予約マス。");

  return parts.join(" ");
}
