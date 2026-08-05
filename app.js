const canvas = document.querySelector("#vj-canvas");
const ctx = canvas.getContext("2d", { alpha: false });
const todayIso = localIsoDate(new Date());
let sources = [];
let drops = [];
let purchaseConfig = { enabled: false, label: "Full Pack", url: "", note: "映像データの購入先は準備中です。" };
let activePiece;
let startTime = performance.now();
let pausedAt = 0;
let isPaused = false;
let calmMotion = false;
let videoRecorder = null;
let recordingStartedAt = 0;
let recordingProgressId = 0;

initialize();

async function initialize() {
  await loadData();
  activePiece = pickPiece(todayIso);
  renderContent();
  requestAnimationFrame(draw);
}

async function loadData() {
  try {
    const [dropsResponse, purchaseResponse] = await Promise.all([
      fetch("./data/drops.json", { cache: "no-store" }),
      fetch("./data/purchase.json", { cache: "no-store" }),
    ]);
    if (dropsResponse.ok) {
      const data = await dropsResponse.json();
      if (Array.isArray(data.sources)) sources = data.sources;
      if (Array.isArray(data.drops)) drops = data.drops.sort((a, b) => b.date.localeCompare(a.date));
    }
    if (purchaseResponse.ok) purchaseConfig = { ...purchaseConfig, ...(await purchaseResponse.json()) };
  } catch {
    drops = [];
  }
}

function draw(now) {
  resizeCanvas();
  const elapsed = isPaused ? pausedAt : (now - startTime) / 1000;
  renderPreview(elapsed * (calmMotion ? 0.42 : 1));
  requestAnimationFrame(draw);
}

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(2, Math.floor(canvas.clientWidth * dpr));
  const height = Math.max(2, Math.floor(canvas.clientHeight * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function renderPreview(time) {
  const w = canvas.width;
  const h = canvas.height;
  const size = Math.min(w, h);
  const phase = ((time % activePiece.loopSeconds) / activePiece.loopSeconds) * Math.PI * 2;
  const a = rgb(activePiece.palette.slice(0, 3));
  const b = rgb(activePiece.palette.slice(3, 6));
  ctx.fillStyle = "#020404";
  ctx.fillRect(0, 0, w, h);
  drawOutputField(w, h, size, phase, a, b);
  drawNodeNetwork(w, h, size, phase, a, b);
}

function drawOutputField(w, h, size, phase, a, b) {
  const cx = w * 0.58;
  const cy = h * 0.52;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 11; i += 1) {
    const t = i / 10;
    const radius = size * (0.08 + t * 0.32 + Math.sin(phase * 2 + i) * 0.012);
    ctx.strokeStyle = `rgba(${lerp(a[0], b[0], t)},${lerp(a[1], b[1], t)},${lerp(a[2], b[2], t)},${0.32 + (1 - t) * 0.34})`;
    ctx.lineWidth = Math.max(2, size * (0.006 - t * 0.002));
    ctx.beginPath();
    ctx.ellipse(cx + Math.sin(phase + i) * size * 0.04, cy + Math.cos(phase * 0.8 + i) * size * 0.04, radius * 1.18, radius * 0.62, phase * 0.18 + t, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 60; i += 1) {
    const angle = phase * 0.75 + i / 60 * Math.PI * 2;
    const radius = size * (0.16 + 0.25 * Math.abs(Math.sin(phase * 1.5 + i)));
    ctx.fillStyle = `rgba(${b[0]},${b[1]},${b[2]},${0.05 + 0.22 * Math.max(0, Math.sin(phase * 3 + i))})`;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius * 0.72, size * 0.006, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawNodeNetwork(w, h, size, phase, a, b) {
  const labels = ["Noise TOP", "Level TOP", "Transform TOP", "Feedback TOP", "Composite TOP", "Movie File Out"];
  const startX = w * 0.08;
  const startY = h * 0.24;
  const gapY = Math.min(78, h * 0.085);
  const nodeW = Math.min(210, w * 0.25);
  const nodeH = 38;
  ctx.save();
  ctx.lineWidth = 2;
  for (let i = 0; i < labels.length - 1; i += 1) {
    const x = startX + (i % 2) * w * 0.035;
    const y = startY + i * gapY;
    const nextX = startX + ((i + 1) % 2) * w * 0.035;
    const nextY = startY + (i + 1) * gapY;
    const pulse = 0.36 + 0.42 * Math.max(0, Math.sin(phase * 2 + i));
    ctx.strokeStyle = `rgba(${a[0]},${a[1]},${a[2]},${pulse})`;
    ctx.beginPath();
    ctx.moveTo(x + nodeW, y + nodeH / 2);
    ctx.bezierCurveTo(x + nodeW + 42, y + nodeH / 2, nextX - 42, nextY + nodeH / 2, nextX, nextY + nodeH / 2);
    ctx.stroke();
  }
  labels.forEach((label, i) => {
    const x = startX + (i % 2) * w * 0.035;
    const y = startY + i * gapY;
    const t = i / (labels.length - 1);
    ctx.fillStyle = `rgba(7, 18, 15, ${0.76 + 0.16 * Math.sin(phase + i)})`;
    ctx.strokeStyle = `rgba(${lerp(a[0], b[0], t)},${lerp(a[1], b[1], t)},${lerp(a[2], b[2], t)},0.72)`;
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, nodeW, nodeH, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f1f7f1";
    ctx.font = `${Math.max(11, Math.min(14, size * 0.018))}px system-ui, sans-serif`;
    ctx.fillText(label, x + 12, y + 24);
  });
  ctx.restore();
}

function renderContent() {
  document.querySelector("#piece-title").textContent = activePiece.title;
  document.querySelector("#piece-date").textContent = activePiece.date;
  document.querySelector("#detail-title").textContent = activePiece.title;
  document.querySelector("#detail-copy").textContent = activePiece.copy;
  document.querySelector("#loop-length").textContent = `${activePiece.loopSeconds}s`;
  document.querySelector("#why-copy").textContent = activePiece.why;
  document.querySelector("#code-output").textContent = makeRecipe(activePiece);
  renderPurchaseLink(activePiece);
  renderSources();
  renderArchive();
}

function renderSources() {
  const sourceList = document.querySelector("#source-list");
  sourceList.innerHTML = "";
  sources.forEach((source) => {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = source.label;
    const note = document.createElement("p");
    note.textContent = source.note;
    li.append(link, note);
    sourceList.append(li);
  });
}

function renderArchive() {
  const archive = document.querySelector("#archive-list");
  archive.innerHTML = "";
  drops.forEach((piece) => {
    const item = document.createElement("article");
    item.className = "archive-item";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = piece.title;
    button.addEventListener("click", () => {
      activePiece = piece;
      startTime = performance.now();
      pausedAt = 0;
      renderContent();
    });
    const small = document.createElement("small");
    small.textContent = `${piece.date} / ${piece.loopSeconds}s TouchDesigner loop`;
    item.append(button, small);
    archive.append(item);
  });
}

function renderPurchaseLink(piece) {
  const link = document.querySelector("#purchase-link");
  const note = document.querySelector("#purchase-note");
  const itemUrl = piece.purchaseUrl || purchaseConfig.url;
  const enabled = Boolean(itemUrl && purchaseConfig.enabled);
  link.textContent = piece.purchaseLabel || purchaseConfig.label;
  link.href = enabled ? itemUrl : "#";
  link.target = enabled ? "_blank" : "";
  link.rel = enabled ? "noreferrer" : "";
  link.setAttribute("aria-disabled", String(!enabled));
  note.textContent = piece.purchaseNote || purchaseConfig.note;
}

document.querySelector("#toggle-play").addEventListener("click", () => {
  isPaused = !isPaused;
  const icon = document.querySelector("#play-icon");
  if (isPaused) {
    pausedAt = (performance.now() - startTime) / 1000;
    icon.textContent = ">";
  } else {
    startTime = performance.now() - pausedAt * 1000;
    icon.textContent = "II";
  }
});
document.querySelector("#toggle-motion").addEventListener("click", () => {
  calmMotion = !calmMotion;
  document.querySelector("#toggle-motion").style.color = calmMotion ? "var(--accent-2)" : "";
});
document.querySelector("#save-frame").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = `${activePiece.date}-${slugify(activePiece.title)}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
});
document.querySelector("#save-video").addEventListener("click", () => recordLoopVideo(false).catch(markVideoError));
document.querySelector("#save-alpha").addEventListener("click", () => recordLoopVideo(true).catch(markAlphaError));
document.querySelector("#copy-code").addEventListener("click", async () => {
  await navigator.clipboard.writeText(makeRecipe(activePiece));
  const button = document.querySelector("#copy-code");
  button.textContent = "COPIED";
  window.setTimeout(() => { button.textContent = "CODE"; }, 1200);
});
document.querySelector("#save-project").addEventListener("click", () => downloadText(`${activePiece.date}-${slugify(activePiece.title)}.touchdesigner-vj.json`, JSON.stringify({ project: "daily-touchdesigner-vj-loop", version: 1, date: activePiece.date, title: activePiece.title, loopSeconds: activePiece.loopSeconds, palette: activePiece.palette, sources, recipe: makeRecipe(activePiece) }, null, 2), "application/json"));
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("is-active"));
    document.querySelectorAll(".tab-panel").forEach((item) => item.classList.remove("is-active"));
    tab.classList.add("is-active");
    document.querySelector(`#tab-${tab.dataset.tab}`).classList.add("is-active");
  });
});

async function recordLoopVideo(alpha) {
  if (videoRecorder?.state === "recording") return;
  if (!canvas.captureStream || !window.MediaRecorder) throw new Error("Recording unsupported.");
  const format = alpha ? pickAlphaVideoFormat() : pickVideoFormat();
  if (!format) throw new Error("No format.");
  const button = document.querySelector(alpha ? "#save-alpha" : "#save-video");
  const captureCanvas = alpha ? document.createElement("canvas") : canvas;
  const exportContext = alpha ? captureCanvas.getContext("2d", { alpha: true, willReadFrequently: true }) : null;
  if (alpha) {
    captureCanvas.width = canvas.width;
    captureCanvas.height = canvas.height;
  }
  const chunks = [];
  const stream = captureCanvas.captureStream(60);
  const recorder = new MediaRecorder(stream, { mimeType: format.mimeType, videoBitsPerSecond: alpha ? 10000000 : 8000000 });
  videoRecorder = recorder;
  recorder.addEventListener("dataavailable", (event) => { if (event.data.size > 0) chunks.push(event.data); });
  const finished = new Promise((resolve) => recorder.addEventListener("stop", resolve, { once: true }));
  button.disabled = true;
  button.classList.add("is-recording");
  startTime = performance.now();
  pausedAt = 0;
  isPaused = false;
  document.querySelector("#play-icon").textContent = "II";
  recordingStartedAt = performance.now();
  updateRecordingProgress(button);
  recorder.start(250);
  const frameLoop = () => {
    if (alpha && exportContext) drawAlphaFrame(captureCanvas, exportContext);
    if (recorder.state === "recording") requestAnimationFrame(frameLoop);
  };
  frameLoop();
  window.setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, activePiece.loopSeconds * 1000);
  await finished;
  cancelAnimationFrame(recordingProgressId);
  stream.getTracks().forEach((track) => track.stop());
  downloadBlob(`${activePiece.date}-${slugify(activePiece.title)}${alpha ? "-alpha" : ""}.${format.extension}`, new Blob(chunks, { type: format.mimeType }));
  button.classList.remove("is-recording");
  button.textContent = alpha ? "WEBM" : format.extension.toUpperCase();
  window.setTimeout(() => { button.textContent = alpha ? "ALPHA" : "MP4"; button.disabled = false; videoRecorder = null; }, 1400);
}

function drawAlphaFrame(targetCanvas, context) {
  if (targetCanvas.width !== canvas.width || targetCanvas.height !== canvas.height) {
    targetCanvas.width = canvas.width;
    targetCanvas.height = canvas.height;
  }
  context.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  context.drawImage(canvas, 0, 0, targetCanvas.width, targetCanvas.height);
  const frame = context.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
  const pixels = frame.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const luminance = pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722;
    pixels[i + 3] = smoothstep(4, 52, luminance) * 255;
  }
  context.putImageData(frame, 0, 0);
}

function updateRecordingProgress(button) {
  const elapsed = (performance.now() - recordingStartedAt) / 1000;
  const progress = Math.min(99, Math.floor(elapsed / activePiece.loopSeconds * 100));
  button.textContent = `REC ${progress}%`;
  recordingProgressId = requestAnimationFrame(() => updateRecordingProgress(button));
}

function markVideoError() { const b = document.querySelector("#save-video"); b.textContent = "NO VIDEO"; b.disabled = false; window.setTimeout(() => { b.textContent = "MP4"; }, 1600); }
function markAlphaError() { const b = document.querySelector("#save-alpha"); b.textContent = "NO ALPHA"; b.disabled = false; window.setTimeout(() => { b.textContent = "ALPHA"; }, 1600); }
function pickVideoFormat() { const candidates = [{ mimeType: "video/mp4;codecs=h264", extension: "mp4" }, { mimeType: "video/mp4", extension: "mp4" }, { mimeType: "video/webm;codecs=vp9", extension: "webm" }, { mimeType: "video/webm", extension: "webm" }]; return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate.mimeType)); }
function pickAlphaVideoFormat() { const candidates = [{ mimeType: "video/webm;codecs=vp9", extension: "webm" }, { mimeType: "video/webm;codecs=vp8", extension: "webm" }, { mimeType: "video/webm", extension: "webm" }]; return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate.mimeType)); }
function pickPiece(date) { const direct = drops.find((piece) => piece.date === date); if (direct) return direct; const seed = hash(date); const hueA = fract(seed * 0.0183); const hueB = fract(hueA + 0.38); return { date, title: `Generated TouchDesigner Network ${date.replaceAll("-", ".")}`, loopSeconds: [8, 12, 16, 20][seed % 4], palette: [...hsv(hueA, 0.72, 0.94), ...hsv(hueB, 0.66, 0.9)], copy: "日付シードから生成されるTouchDesigner VJネットワーク。ブラウザでは軽量プレビュー、本番はMac miniで出力する。", why: "TouchDesignerはTOP/CHOP/DAT/COMPをつなぐリアルタイム映像制作に強い。ノード構成を日次で蓄積すると、後から.toe/.tox化しやすい。" }; }
function makeRecipe(piece) { return `# Daily TouchDesigner VJ Network
# Date: ${piece.date}
# Title: ${piece.title}
# Loop seconds: ${piece.loopSeconds}
# Palette A: ${piece.palette.slice(0, 3).join(", ")}
# Palette B: ${piece.palette.slice(3, 6).join(", ")}

TOP chain:
Noise TOP -> Level TOP -> Transform TOP -> Feedback TOP -> Composite TOP -> Displace TOP -> Level TOP -> Movie File Out TOP

CHOP controls:
Timer CHOP (${piece.loopSeconds}s cycle) -> Math CHOP -> Pattern CHOP -> Export to Transform / Level / Displace parameters

Export:
Movie File Out TOP for MP4 preview
Movie File Out TOP with alpha-capable codec for MOV master`;
}
function roundRect(context, x, y, w, h, r) { context.beginPath(); context.moveTo(x + r, y); context.arcTo(x + w, y, x + w, y + h, r); context.arcTo(x + w, y + h, x, y + h, r); context.arcTo(x, y + h, x, y, r); context.arcTo(x, y, x + w, y, r); context.closePath(); }
function rgb(values) { return values.map((value) => Math.round(value * 255)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function localIsoDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function hash(value) { let out = 2166136261; for (let i = 0; i < value.length; i += 1) { out ^= value.charCodeAt(i); out = Math.imul(out, 16777619); } return Math.abs(out); }
function fract(value) { return value - Math.floor(value); }
function smoothstep(edge0, edge1, value) { const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0))); return t * t * (3 - 2 * t); }
function hsv(h, s, v) { const i = Math.floor(h * 6); const f = h * 6 - i; const p = v * (1 - s); const q = v * (1 - f * s); const t = v * (1 - (1 - f) * s); const table = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]]; return table[i % 6].map((n) => Number(n.toFixed(3))); }
function slugify(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
function downloadText(filename, text, type) { downloadBlob(filename, new Blob([text], { type })); }
function downloadBlob(filename, blob) { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.download = filename; link.href = url; link.click(); URL.revokeObjectURL(url); }
