// Turns each card's own attributes into an art brief. The name alone is often
// ambiguous or abstract ("Adaptation Technology"), so the tags, card type and
// effect text are what actually decide the subject, palette and framing.
//
// Usage: node scripts/build-art-briefs.mjs [--limit=N] [--ids=a,b] [--json]
import { ALL_CARDS } from "../app/game-logic.js";

// Each tag contributes a subject cue and a colour the finished set shares, so a
// player can read a card's tags off the picture before reading the text.
const TAG_ART = {
  Building: { motif: "構造物・工場・建材", palette: "錆びた茶とサンド" },
  Space: { motif: "宇宙船・軌道・星域", palette: "深い藍と星の白" },
  Science: { motif: "実験装置・データ・観測機器", palette: "冷たいシアン" },
  Earth: { motif: "地球・企業・地上都市", palette: "青緑と大気の白" },
  Venus: { motif: "金星の厚い雲・浮遊構造物", palette: "硫黄の黄と乳白" },
  Plant: { motif: "植生・葉・緑化", palette: "苔緑とオリーブ" },
  Power: { motif: "発電設備・送電・エネルギー流", palette: "琥珀とエンバー" },
  Microbe: { motif: "微生物・培養・胞子", palette: "青緑と淡い発光" },
  Jovian: { motif: "木星圏・ガス惑星・遠方の衛星", palette: "橙褐色の縞と暗い赤" },
  City: { motif: "居住ドーム・街灯・都市構造", palette: "温かい灯りと鋼鉄" },
  Animal: { motif: "動物・生態", palette: "土色と生命の暖色" },
  Wild: { motif: "汎用・可変", palette: "中間色" }
};

const TYPE_ART = {
  automated: "静かな完成形。すでに稼働している落ち着いた画",
  active: "繰り返し使うもの。継続して営まれている様子が見える画",
  event: "一度きりの出来事。動きと衝撃のある瞬間を切り取った画"
};

// Effect text is the only signal for what the card physically does; these cues
// keep the picture about the mechanic rather than a generic Mars landscape.
const EFFECT_CUES = [
  [/海洋/, "水・氷・海が生まれる様子"],
  [/都市タイル/, "居住区画の建設"],
  [/緑地|植物/, "植生の広がり"],
  [/気温|熱生産/, "熱・放射・温度上昇"],
  [/酸素/, "大気の生成"],
  [/金星/, "金星の雲の中"],
  [/カードを.*引く|ドロー|山札/, "情報・記録・探索"],
  [/チタン/, "採掘・金属精錬"],
  [/鋼鉄|建材/, "建設作業"],
  [/エネルギー|電力/, "送電・発電"],
  [/微生物/, "培養槽・コロニー"],
  [/動物/, "生き物の営み"],
  [/TR|地球化指数/, "テラフォーミングの進捗"],
  [/植民地/, "遠方の衛星に築いた植民地"],
  [/代表者|議連|党/, "議場・政治的な駆け引き"],
  [/フロート/, "浮遊コンテナ・気体の回収"],
  [/MC生産量\+|MC生産量が増/, "収益・経済活動"],
  [/コストが|割引|安くなる/, "効率化された調達・物流"],
  [/このカードに.*追加/, "カード上に蓄積されていく資源"],
  [/カードをプレイする際|タグ.*につき/, "既存の設備が新しい事業を後押しする様子"],
  [/獲得/, "資源の受け取り"]
];

function briefFor(card) {
  const tags = card.tags ?? [];
  const art = tags.map(tag => TAG_ART[tag]).filter(Boolean);
  const motifs = art.map(entry => entry.motif);
  const palettes = art.map(entry => entry.palette);

  const effect = String(card.effectText ?? "");
  const cues = EFFECT_CUES.filter(([pattern]) => pattern.test(effect)).map(([, cue]) => cue);

  const requirement = String(card.reqText ?? "").trim();
  const hasReadableReq = requirement && requirement !== "なし" && !requirement.startsWith("[");

  return {
    id: card.id,
    name: card.name,
    tags,
    type: card.type,
    cost: card.cost,
    subject: motifs.length > 0 ? motifs.join(" / ") : "火星表面の無属性の情景",
    palette: palettes.length > 0 ? palettes.join(" + ") : "赤錆と灰の火星色",
    mood: TYPE_ART[card.type] ?? "",
    depicts: cues.length > 0 ? cues.join("、") : "カード名が示すものそのもの",
    effect: effect.slice(0, 90),
    requirement: hasReadableReq ? requirement : null
  };
}

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);

let cards = ALL_CARDS;
if (args.ids) {
  const wanted = new Set(String(args.ids).split(","));
  cards = cards.filter(card => wanted.has(card.id));
}
if (args.limit) cards = cards.slice(0, Number(args.limit));

const briefs = cards.map(briefFor);

if (args.json) {
  console.log(JSON.stringify(briefs, null, 2));
} else {
  for (const b of briefs) {
    console.log(
      `${b.id}.svg | ${b.name} | タグ:${b.tags.join("/") || "なし"} | 種別:${b.type}\n` +
      `  主題: ${b.subject}\n` +
      `  色調: ${b.palette}\n` +
      `  画の性格: ${b.mood}\n` +
      `  描くもの: ${b.depicts}\n` +
      (b.requirement ? `  条件: ${b.requirement}\n` : "") +
      `  効果: ${b.effect}\n`
    );
  }
}
