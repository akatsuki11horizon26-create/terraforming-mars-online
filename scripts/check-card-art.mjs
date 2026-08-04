// Flags drawings where the subject is not the dominant, centred mass. The art
// generator is told the ★ subject must fill 50-70% of the frame; this is the
// mechanical check that it actually did, across hundreds of files nobody will
// open by hand.
//
// Usage: node scripts/check-card-art.mjs <dir>
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node scripts/check-card-art.mjs <dir>");
  process.exit(1);
}

const W = 160;
const H = 90;

// Walks a path honouring relative commands, so the box reflects real geometry
// rather than raw coordinate values.
function pathBox(d) {
  let x = 0, y = 0, sx = 0, sy = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+/g) ?? [];
  let i = 0;
  let cmd = "M";
  const put = (px, py) => {
    minX = Math.min(minX, px); maxX = Math.max(maxX, px);
    minY = Math.min(minY, py); maxY = Math.max(maxY, py);
  };
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const n = () => Number(tokens[i++]);
    if (C === "M" || C === "L") {
      const a = n(), b = n();
      x = rel ? x + a : a; y = rel ? y + b : b;
      if (C === "M") { sx = x; sy = y; }
      put(x, y);
    } else if (C === "H") { const a = n(); x = rel ? x + a : a; put(x, y); }
    else if (C === "V") { const a = n(); y = rel ? y + a : a; put(x, y); }
    else if (C === "C") { const p = [n(), n(), n(), n(), n(), n()]; x = rel ? x + p[4] : p[4]; y = rel ? y + p[5] : p[5]; put(x, y); }
    else if (C === "S" || C === "Q") { const p = [n(), n(), n(), n()]; x = rel ? x + p[2] : p[2]; y = rel ? y + p[3] : p[3]; put(x, y); }
    else if (C === "T") { const p = [n(), n()]; x = rel ? x + p[0] : p[0]; y = rel ? y + p[1] : p[1]; put(x, y); }
    else if (C === "A") { const p = [n(), n(), n(), n(), n(), n(), n()]; x = rel ? x + p[5] : p[5]; y = rel ? y + p[6] : p[6]; put(x, y); }
    else if (C === "Z") { x = sx; y = sy; }
    else i++;
  }
  return { minX, minY, maxX, maxY };
}

function num(tag, attr) {
  const m = tag.match(new RegExp(`\\s${attr}\\s*=\\s*["']([-\\d.]+)["']`));
  return m ? Number(m[1]) : null;
}

// A subject may be drawn as a path, a circle or an ellipse; scanning only one
// kind is how a perfectly centred colony gets reported as off-frame.
function shapes(svg) {
  const out = [];
  for (const m of svg.matchAll(/<path[^>]*\sd\s*=\s*"([^"]+)"[^>]*>/g)) {
    const b = pathBox(m[1]);
    if (Number.isFinite(b.minX)) out.push(b);
  }
  for (const m of svg.matchAll(/<circle[^>]*>/g)) {
    const cx = num(m[0], "cx"), cy = num(m[0], "cy"), r = num(m[0], "r");
    if (cx !== null && cy !== null && r) out.push({ minX: cx - r, maxX: cx + r, minY: cy - r, maxY: cy + r });
  }
  for (const m of svg.matchAll(/<ellipse[^>]*>/g)) {
    const cx = num(m[0], "cx"), cy = num(m[0], "cy"), rx = num(m[0], "rx"), ry = num(m[0], "ry");
    if (cx !== null && cy !== null && rx && ry) out.push({ minX: cx - rx, maxX: cx + rx, minY: cy - ry, maxY: cy + ry });
  }
  for (const m of svg.matchAll(/<rect[^>]*>/g)) {
    const w = num(m[0], "width"), h = num(m[0], "height");
    // The full-bleed background rect is not a subject.
    if (w === W && h === H) continue;
    const x = num(m[0], "x") ?? 0, y = num(m[0], "y") ?? 0;
    if (w && h) out.push({ minX: x, maxX: x + w, minY: y, maxY: y + h });
  }
  return out;
}

const MIN_COVERAGE = 22;
const MAX_OFFSET = 40;

// A planet or sun parked in a corner is legitimately large but is scenery, not
// the subject. Anything whose centre sits outside the middle band is treated as
// background so it cannot masquerade as the main mass.
function isBackdrop(box) {
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  return cx < W * 0.25 || cx > W * 0.75 || cy < H * 0.2 || cy > H * 0.85;
}

const results = [];
for (const file of readdirSync(dir).filter(f => f.endsWith(".svg")).sort()) {
  const svg = readFileSync(join(dir, file), "utf8");
  let best = null;
  for (const box of shapes(svg)) {
    if (isBackdrop(box)) continue;
    const area = (box.maxX - box.minX) * (box.maxY - box.minY);
    if (area > 0 && (!best || area > best.area)) best = { area, ...box };
  }
  if (!best) { results.push({ file, ok: false, why: "描画要素なし" }); continue; }
  const cx = (best.minX + best.maxX) / 2;
  const cy = (best.minY + best.maxY) / 2;
  const coverage = (100 * best.area) / (W * H);
  const offset = Math.hypot(cx - W / 2, cy - H / 2);
  const ok = coverage >= MIN_COVERAGE && offset <= MAX_OFFSET;
  results.push({ file, ok, coverage, offset, why: ok ? "" : `面積${coverage.toFixed(0)}% 中心ずれ${offset.toFixed(0)}` });
}

const bad = results.filter(r => !r.ok);
console.log(`${results.length - bad.length}/${results.length} が主題を中央に大きく配置`);
for (const r of bad) console.log(`  要確認 ${r.file}: ${r.why}`);
if (bad.length > 0) process.exitCode = 1;
