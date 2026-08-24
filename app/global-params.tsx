"use client";

import React from "react";

// The three terraforming tracks, shown together the way the digital edition
// does: they are the game's win condition, so their distance from target has to
// be readable without clicking anything.
export function GlobalParameters({
  temperature,
  oxygen,
  oceans,
  venus,
  showVenus
}: {
  temperature: number;
  oxygen: number;
  oceans: number;
  venus: number;
  showVenus: boolean;
}) {
  const tracks = [
    {
      key: "temperature",
      label: "気温",
      value: `${temperature > 0 ? "+" : ""}${temperature}°C`,
      target: "+8°C",
      progress: ((temperature + 30) / 38) * 100,
      done: temperature >= 8,
      color: "var(--accent-ember)",
      note: ""
    },
    {
      key: "oxygen",
      label: "酸素",
      value: `${oxygen}%`,
      target: "14%",
      progress: (oxygen / 14) * 100,
      done: oxygen >= 14,
      color: "var(--accent-green)",
      note: ""
    },
    {
      key: "oceans",
      label: "海洋",
      value: `${oceans}`,
      target: "9枚",
      progress: (oceans / 9) * 100,
      done: oceans >= 9,
      color: "var(--accent-cyan)",
      note: ""
    }
  ];

  if (showVenus) {
    tracks.push({
      key: "venus",
      label: "金星",
      value: `${venus}%`,
      target: "30%",
      progress: (venus / 30) * 100,
      done: venus >= 30,
      color: "var(--accent-violet)",
      note: venus < 8 ? "次: 8%でカード1枚" : venus < 16 ? "次: 16%でTR+1" : venus < 30 ? "閾値ボーナス済み" : "最大"
    });
  }

  return (
    <div className="param-stack">
      {tracks.map(track => (
        <div key={track.key} className="param-track" data-done={track.done ? "true" : "false"}>
          <div className="param-head">
            <span className="param-label">{track.label}</span>
            <span className="param-value" style={{ color: track.color }}>
              {track.value}
              <span className="param-target"> / {track.target}</span>
            </span>
          </div>
          <div className="param-rail">
            <div
              className="param-fill"
              style={{
                width: `${Math.min(100, Math.max(0, track.progress))}%`,
                backgroundColor: track.color
              }}
            />
          </div>
          {track.note ? <div className="param-note">{track.note}</div> : null}
        </div>
      ))}
    </div>
  );
}

// The collapsed form of the planet data: symbol + number only, so the tracks
// stay glanceable when the panel itself is shut.
export function GlobalParametersCompact({
  temperature,
  oxygen,
  oceans,
  venus,
  showVenus
}: {
  temperature: number;
  oxygen: number;
  oceans: number;
  venus: number;
  showVenus: boolean;
}) {
  const chips = [
    { key: "temperature", icon: "🌡", value: `${temperature > 0 ? "+" : ""}${temperature}°`, done: temperature >= 8, color: "var(--accent-ember)", title: `気温 ${temperature}°C / 目標 +8°C` },
    { key: "oxygen", icon: "O₂", value: `${oxygen}%`, done: oxygen >= 14, color: "var(--accent-green)", title: `酸素 ${oxygen}% / 目標 14%` },
    { key: "oceans", icon: "🌊", value: `${oceans}/9`, done: oceans >= 9, color: "var(--accent-cyan)", title: `海洋 ${oceans}枚 / 目標 9枚` }
  ];
  if (showVenus) {
    // The raw percentage never said what the next step buys. 8% draws a card and
    // 16% gives an extra TR, and in a multiplayer game Venus is not an ending
    // condition at all — all of which change whether raising it is worth doing.
    const nextVenusReward =
      venus < 8 ? "8%でカード1枚" : venus < 16 ? "16%でTR+1" : venus < 30 ? "報酬なし" : "最大";
    chips.push({
      key: "venus",
      icon: "♀",
      value: `${venus}%`,
      done: venus >= 30,
      color: "var(--accent-violet)",
      title: `金星 ${venus}% / 目標 30% ・ 次: ${nextVenusReward} ・ 2%ごとにTR+1`
    });
  }

  return (
    <div className="param-compact">
      {chips.map(c => (
        <span key={c.key} className="param-chip" data-done={c.done ? "true" : "false"} title={c.title}>
          <span className="param-chip-icon" style={{ color: c.color }}>{c.icon}</span>
          <span className="param-chip-value">{c.value}</span>
        </span>
      ))}
    </div>
  );
}

// A compact resource row: stock on top, production below. The physical game's
// player board pairs them, and separating them makes the engine hard to read.
// Counts from the old value to the new one so a change is something the player
// watches happen rather than a number that was already different by the time
// they looked. Instant when the motion preference asks for it.
function AnimatedNumber({ value, className, style }: { value: number; className?: string; style?: React.CSSProperties }) {
  const [shown, setShown] = React.useState(value);
  const [dir, setDir] = React.useState<"up" | "down" | null>(null);
  const fromRef = React.useRef(value);

  React.useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    fromRef.current = value;
    setDir(value > from ? "up" : "down");

    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      const done = window.setTimeout(() => setDir(null), 600);
      return () => window.clearTimeout(done);
    }

    const span = Math.abs(value - from);
    const duration = Math.min(700, 180 + span * 45);
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Ease out: the number decelerates into its final value.
      setShown(Math.round(from + (value - from) * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
      else setDir(null);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span className={className} style={style} data-trend={dir ?? undefined}>
      {shown}
    </span>
  );
}

export function ResourceGrid({
  player
}: {
  player: {
    mc: number;
    mcProd: number;
    steel: number;
    steelProd: number;
    titanium: number;
    titaniumProd: number;
    plants: number;
    plantsProd: number;
    energy: number;
    energyProd: number;
    heat: number;
    heatProd: number;
  };
}) {
  const rows = [
    { key: "mc", label: "MC", stock: player.mc, prod: player.mcProd, color: "var(--accent-amber)" },
    { key: "steel", label: "建材", stock: player.steel, prod: player.steelProd, color: "#C9A227" },
    { key: "titanium", label: "チタン", stock: player.titanium, prod: player.titaniumProd, color: "var(--text-mid)" },
    { key: "plants", label: "植物", stock: player.plants, prod: player.plantsProd, color: "var(--accent-green)" },
    { key: "energy", label: "電力", stock: player.energy, prod: player.energyProd, color: "var(--accent-violet)" },
    { key: "heat", label: "熱", stock: player.heat, prod: player.heatProd, color: "var(--accent-ember)" }
  ];

  return (
    <div className="resource-grid">
      {rows.map(row => (
        <div key={row.key} className="resource-cell">
          <span className="resource-label">{row.label}</span>
          <AnimatedNumber className="resource-stock" style={{ color: row.color }} value={row.stock} />
          <span
            className="resource-prod"
            data-negative={row.prod < 0 ? "true" : "false"}
            title="生産量"
          >
            {row.prod >= 0 ? `+${row.prod}` : row.prod}
          </span>
        </div>
      ))}
    </div>
  );
}

// Opponents at a glance. The digital edition buries other players' resources
// below your own, which players ask to have reversed; here they are always
// visible and never require a click.
export function OpponentStrip({
  players,
  selfId,
  turnHolderId,
  scores
}: {
  players: {
    id: string;
    name: string;
    tr: number;
    mc: number;
    handCount?: number;
    hand?: string[];
    passed?: boolean;
  }[];
  selfId: string;
  turnHolderId: string;
  scores?: Record<string, number>;
}) {
  const opponents = players.filter(player => player.id !== selfId);
  if (opponents.length === 0) return null;

  return (
    <div className="opponent-strip">
      {opponents.map(player => (
        <div
          key={player.id}
          className="opponent-card"
          data-active={player.id === turnHolderId ? "true" : "false"}
          data-passed={player.passed ? "true" : "false"}
        >
          <span className="opponent-name">{player.name}</span>
          <span className="opponent-stats">
            <span title="TR">TR {player.tr}</span>
            {scores?.[player.id] !== undefined && (
              <span title="現在の勝利点">{scores[player.id]}点</span>
            )}
            <span title="MC">{player.mc}</span>
            <span title="手札">手 {player.handCount ?? player.hand?.length ?? 0}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

// Every seat's TR and current victory points side by side. The opponent strip
// deliberately omits the viewer, so on its own it never answered "who is
// winning" — only "what are the others up to".
export function Standings({
  players,
  selfId,
  turnHolderId,
  scores
}: {
  players: { id: string; name: string; tr: number; passed?: boolean }[];
  selfId: string;
  turnHolderId: string;
  scores: Record<string, number>;
}) {
  const ranked = [...players].sort(
    (a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0) || b.tr - a.tr
  );

  return (
    <div className="standings">
      {ranked.map((player, index) => (
        <div
          key={player.id}
          className="standings-row"
          data-self={player.id === selfId ? "true" : "false"}
          data-active={player.id === turnHolderId ? "true" : "false"}
          data-passed={player.passed ? "true" : "false"}
        >
          <span className="standings-rank">{index + 1}</span>
          <span className="standings-name">
            {player.name}
            {player.id === selfId ? "（あなた）" : ""}
          </span>
          <span className="standings-tr" title="テラフォーミングレーティング">
            TR {player.tr}
          </span>
          <span className="standings-vp" title="現在の勝利点（暫定）">
            {scores[player.id] ?? 0} 点
          </span>
        </div>
      ))}
    </div>
  );
}
