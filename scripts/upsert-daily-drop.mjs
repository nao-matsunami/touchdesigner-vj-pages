import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const dropsPath = path.join(rootDir, "data", "drops.json");
const dateArg = process.argv.find((arg) => arg.startsWith("--date="));
const targetDate = dateArg ? dateArg.slice("--date=".length) : localIsoDate(new Date());
const titles = ["Feedback TOP Network", "CHOP Driven Field", "Displace Composite Loop", "Node Pulse Texture", "GPU Feedback Mixer"];
const copyLines = [
  "TouchDesignerのTOP/CHOPネットワークを想定した、フィードバックと変調のVJループ。",
  "ノードベースで本番素材へ展開するための、日次TouchDesignerレシピ。",
  "Mac miniで.toe/.tox化し、Movie File Out TOPから販売用映像へ出す前提の素材。",
];
const whyLines = [
  "TouchDesignerはノードベースでリアルタイム映像、音反応、インタラクティブ演出に強い。VJ現場向けパイプラインとして独立させる価値がある。",
  "TOPはGPUベースの画像処理と合成に向く。Feedback、Composite、Displace、Levelを組み合わせると販売用VJループへ展開しやすい。",
  "CHOPでループ時間や音反応を制御し、TOPで映像合成する構成は、ブラウザ生成とは違うライブ演出用の資産として蓄積できる。",
];

const data = JSON.parse(await fs.readFile(dropsPath, "utf8"));
if (data.drops.find((drop) => drop.date === targetDate)) {
  console.log(`Daily drop already exists: ${targetDate}`);
  process.exit(0);
}

const seed = hash(targetDate);
const hueA = fract(seed * 0.0183);
const hueB = fract(hueA + 0.38);
data.drops.unshift({
  date: targetDate,
  title: titles[seed % titles.length],
  loopSeconds: [8, 12, 16, 20][seed % 4],
  palette: [...hsv(hueA, 0.72, 0.94), ...hsv(hueB, 0.66, 0.9)],
  copy: copyLines[seed % copyLines.length],
  why: whyLines[seed % whyLines.length],
});
data.drops.sort((a, b) => b.date.localeCompare(a.date));
await fs.writeFile(dropsPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Added daily drop: ${targetDate}`);

function localIsoDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function hash(value) { let out = 2166136261; for (let i = 0; i < value.length; i += 1) { out ^= value.charCodeAt(i); out = Math.imul(out, 16777619); } return Math.abs(out); }
function fract(value) { return value - Math.floor(value); }
function hsv(h, s, v) { const i = Math.floor(h * 6); const f = h * 6 - i; const p = v * (1 - s); const q = v * (1 - f * s); const t = v * (1 - (1 - f) * s); const table = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]]; return table[i % 6].map((n) => Number(n.toFixed(3))); }
