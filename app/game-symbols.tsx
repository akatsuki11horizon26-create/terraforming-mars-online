import { Fragment } from "react";

const paths: Record<string, string> = {
  "🌱": "M12 21V11M12 15C4 15 3 10 3 5c6 0 9 3 9 10Zm0-4c0-6 4-9 9-9 0 6-3 9-9 9Z",
  "🌲": "m12 2-6 8h3l-5 7h7v5h2v-5h7l-5-7h3Z",
  "🏙": "M3 21V9h7v12m0-16h7v16m0-9h4v9M5 12h3m-3 4h3m4-8h3m-3 4h3m-3 4h3M1 21h22",
  "🌊": "M2 7c3-4 5 4 9 0s6 4 11 0M2 12c3-4 5 4 9 0s6 4 11 0M2 17c3-4 5 4 9 0s6 4 11 0",
  "🌡": "M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Zm3-7v11m6-12h3m-3 4h3",
  "⚡": "m14 2-10 12h7l-1 8 10-13h-7Z",
  "🔥": "M12 2c1 7 8 8 8 14a8 8 0 0 1-16 0c0-4 3-7 5-9 0 4 1 5 3 5 2-3 1-6 0-10Z",
  "🔩": "m8 2 8 0 5 6-5 6H8L3 8Zm2 12v8h4v-8M9 18h6M9 21h6M10 6h4v4h-4Z",
  "🚀": "M9 15c-1-8 5-12 12-12 0 7-4 13-12 12Zm1-5H5l-3 6 7-1m5-1v5l-6 3 1-7m-3 3-3 3M15 7h2v2h-2Z",
  "🛰": "m8 8 8 8m-6-12 10 10m-16-4 10 10M3 6l3-3 5 5-3 3Zm10 10 3-3 5 5-3 3ZM8 16l-4 4m0-7a7 7 0 0 1 7 7",
  "🃏": "M7 6h14v16H7ZM3 18V2h14M10 10h8m-8 4h8m-8 4h5",
  "💳": "M2 5h20v14H2ZM2 10h20M5 15h5",
  "🏗": "M7 22V3l14 5H2l5-5m0 9h8m0-4v9m-3 0h6M4 22h6",
  "🔬": "m10 3 4-1 4 9-4 2ZM8 10a7 7 0 1 0 10 8M12 13v3M5 22h16M7 18h8",
  "🌍": "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM2 12h20M12 2c-6 6-6 14 0 20 6-6 6-14 0-20Z",
  "🪐": "M18 12a6 6 0 1 1-12 0 6 6 0 0 1 12 0ZM6 8C-4 15 0 22 14 15S26 1 18 6",
  "🐾": "M8 15c-5 7 13 7 8 0l-4-4Zm-5-6a2 3 0 1 0 4 0 2 3 0 1 0-4 0m6-4a2 3 0 1 0 4 0 2 3 0 1 0-4 0m7 4a2 3 0 1 0 4 0 2 3 0 1 0-4 0",
  "🦠": "M6 7c5-8 17-2 13 6S1 23 4 14ZM7 5 5 2m11 2 2-3M4 12H1m19-3 3-1M8 20l-1 3m10-7 3 3M8 10h1m5 3h1m-7 4h1",
  "🏷": "M2 3h9l11 11-8 8L2 10Zm4 4h1",
  "🛖": "m2 11 10-9 10 9M5 10v12h14V10M10 22v-8h4v8",
  "⛵": "M3 18h18l-4 4H7ZM12 2v16M10 4 3 15h7Zm4 3v8h7Z",
  "👤": "M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 22v-3a8 8 0 0 1 16 0v3",
  "👑": "m3 6 5 5 4-8 4 8 5-5-2 13H5ZM5 22h14",
  "🎩": "M6 18 5 3h14l-1 15M6 14h12M2 18h20v3H2Z",
  "⛺": "m2 21 10-19 10 19Zm6 0 4-9 4 9",
  "🤖": "M4 7h16v14H4ZM12 7V2m-2 0h4M7 12h2m6 0h2M8 17h8M1 11v6m22-6v6",
  "⛪": "M12 1v6m-3-3h6m-3 3-9 8h3v7h12v-7h3ZM10 22v-7h4v7",
  "🏘": "m1 10 6-6 6 6M3 9v11h8V9m1-3 5-4 6 6m-8 2v10h6V7",
  "🏢": "M4 22V2h16v20M8 6h2m4 0h2M8 10h2m4 0h2M8 14h2m4 0h2M10 22v-4h4v4",
  "🏆": "M7 2h10v8a5 5 0 0 1-10 0Zm0 2H2v3a5 5 0 0 0 5 5m10-8h5v3a5 5 0 0 1-5 5M12 15v7m-5 0h10",
  "⚔": "m3 2 17 17m-6 1 6-6M21 2 4 19m0-5 6 6M3 2l1 6m17-6-1 6",
  "🎈": "M18 8a6 7 0 1 1-12 0 6 7 0 0 1 12 0ZM12 15v7m-2-5h4",
  "👔": "M3 3h6l3 3 3-3h6v19H3ZM9 3l3 3-3 12 3 3 3-3-3-12",
  "☄": "m12 12 9-9M8 9l8-7m0 14 7-8M13 17a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z",
  "☣": "M12 8V2m-3 1h6M8 14l-6 4m0-3 3 6m11-7 6 4m-3 3 3-6M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  "💧": "M12 2c-3 5-8 9-8 13a8 8 0 0 0 16 0c0-4-5-8-8-13Z",
  "🛡": "m12 2 9 4v7c0 5-9 9-9 9s-9-4-9-9V6Z",
  "⭐": "m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z",
  "🗳": "M3 12h18v10H3ZM8 16h8M8 2l10 5-5 9-10-5Z"
};

const symbolPattern = new RegExp(`(${Object.keys(paths).join("|")})[\\uFE0E\\uFE0F]?`, "gu");

export function GameSymbols({ text }: { text: string }) {
  return <>{text.split(symbolPattern).map((part, index) => paths[part]
    ? <svg key={index} className="game-symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[part]} /></svg>
    : <Fragment key={index}>{part}</Fragment>)}</>;
}
