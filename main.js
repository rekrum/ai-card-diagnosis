const userNameEl = document.getElementById("userName");
const imageInputEl = document.getElementById("imageInput");
const generateBtn = document.getElementById("generateBtn");
const downloadBtn = document.getElementById("downloadBtn");
const shareBtn = document.getElementById("shareBtn");
const statusEl = document.getElementById("status");
const canvas = document.getElementById("cardCanvas");
const ctx = canvas.getContext("2d");

let latestCardData = null;
let latestImage = null;

const API_ENDPOINT = "/api/diagnose";

const themes = {
  "炎": { main: "#b82020", sub: "#ff8a1d", glow: "#ffd36a", dark: "#210707" },
  "水": { main: "#1565c0", sub: "#4fc3f7", glow: "#d9f6ff", dark: "#061420" },
  "草": { main: "#2e7d32", sub: "#8bc34a", glow: "#e8ffd6", dark: "#071b0c" },
  "風": { main: "#7fbf9f", sub: "#e6fff2", glow: "#ffffff", dark: "#0a1c18" },
  "雷": { main: "#f9a825", sub: "#fff176", glow: "#fffde7", dark: "#221806" },
  "氷": { main: "#80deea", sub: "#e0f7fa", glow: "#ffffff", dark: "#081b20" },
  "闇": { main: "#2a1245", sub: "#7e3ff2", glow: "#d1b3ff", dark: "#090511" },
  "光": { main: "#f5d76e", sub: "#ffffff", glow: "#fff7c2", dark: "#211b08" },
  "地": { main: "#795548", sub: "#c49a6c", glow: "#ffe0b2", dark: "#1f140d" },
  "竜": { main: "#5b0f0f", sub: "#111111", glow: "#ffcc80", dark: "#160606" }
};

const fallbackData = {
  rarity: "SR",
  title: "???",
  hp: 120,
  type: "闇",
  totalPower: 238,
  specialName: "柔軟思考",
  specialEffect: "このカードが場にいるかぎり、自分の手札が5枚以上のとき、味方全体のスキル威力を+20する。",
  action1Name: "ひらめきストリーム",
  action1Power: 80,
  action1Text: "相手の行動を1つ選び、次のターンの効果を半減させる。",
  action2Name: "マイペースアタック",
  action2Power: 70,
  action2Text: "自分のHPを20回復する。その後、相手にダメージを与える。",
  flavorText: "何を考えているのか、誰にもわからない。でも気づけば、まわりをふわっと明るくしている。",
  cardNo: "0427"
};

generateBtn.addEventListener("click", generateCard);
downloadBtn.addEventListener("click", downloadCard);
shareBtn.addEventListener("click", shareToX);

drawEmptyCard();

async function generateCard() {
  const userName = userNameEl.value.trim();
  const file = imageInputEl.files[0];

  if (!userName || !file) {
    statusEl.textContent = "名前と画像は必須です。";
    return;
  }

  setLoading(true);
  statusEl.textContent = "AI診断中です。少しお待ちください。";

  try {
    latestImage = await loadImageFromFile(file);
    const data = await callDiagnoseApi(userName, file);
    latestCardData = normalizeCardData(data);
    drawCard(latestCardData, userName, latestImage);
    downloadBtn.disabled = false;
    shareBtn.disabled = false;
    statusEl.textContent = "カードを生成しました。";
  } catch (err) {
    console.error(err);
    statusEl.textContent = "AI診断に失敗したため、サンプル診断で生成しました。API設定を確認してください。";
    latestCardData = normalizeCardData(fallbackData);
    drawCard(latestCardData, userName, latestImage);
    downloadBtn.disabled = false;
    shareBtn.disabled = false;
  } finally {
    setLoading(false);
  }
}

async function callDiagnoseApi(userName, file) {
  const formData = new FormData();
  formData.append("userName", userName);
  formData.append("image", file);

  const response = await fetch(API_ENDPOINT, { method: "POST", body: formData });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return await response.json();
}

function normalizeCardData(data) {
  const allowedTypes = Object.keys(themes);
  const allowedRarities = ["C", "R", "SR", "UR", "LR"];

  return {
    rarity: allowedRarities.includes(data.rarity) ? data.rarity : "SR",
    title: String(data.title || "???").slice(0, 12),
    hp: clamp(Number(data.hp || 120), 80, 180),
    type: allowedTypes.includes(data.type) ? data.type : "闇",
    totalPower: clamp(Number(data.totalPower || 238), 150, 300),
    specialName: String(data.specialName || "特殊効果").slice(0, 10),
    specialEffect: String(data.specialEffect || "").slice(0, 54),
    action1Name: String(data.action1Name || "アクション").slice(0, 10),
    action1Power: clamp(Number(data.action1Power || 70), 30, 120),
    action1Text: String(data.action1Text || "").slice(0, 34),
    action2Name: String(data.action2Name || "アクション").slice(0, 10),
    action2Power: clamp(Number(data.action2Power || 70), 30, 120),
    action2Text: String(data.action2Text || "").slice(0, 34),
    flavorText: String(data.flavorText || "").slice(0, 44),
    cardNo: String(data.cardNo || "0001").replace(/\D/g, "").padStart(4, "0").slice(0, 4)
  };
}

function drawEmptyCard() {
  drawCard(normalizeCardData(fallbackData), "名前", null);
}

function drawCard(data, userName, image) {
  const W = canvas.width;
  const H = canvas.height;
  const theme = themes[data.type] || themes["闇"];

  ctx.clearRect(0, 0, W, H);
  drawRoundedRect(16, 16, W - 32, H - 32, 34, "#050307");
  drawGoldFrame(24, 24, W - 48, H - 48);
  drawCardBody(theme);

  drawHeader(data, userName, theme);
  drawImageArea(image, theme);
  drawInfoArea(data, theme);
  drawActions(data, theme);
  drawFooter(data, theme);
}

function drawGoldFrame(x, y, w, h) {
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, "#fff0a6");
  grad.addColorStop(0.2, "#b8892e");
  grad.addColorStop(0.45, "#fff4b8");
  grad.addColorStop(0.7, "#8d641d");
  grad.addColorStop(1, "#ffe899");
  drawRoundedRect(x, y, w, h, 30, grad);
  drawRoundedRect(x + 26, y + 26, w - 52, h - 52, 22, "#150d21");
}

function drawCardBody(theme) {
  const grad = ctx.createLinearGradient(50, 60, 970, 1380);
  grad.addColorStop(0, theme.dark);
  grad.addColorStop(0.45, theme.main);
  grad.addColorStop(1, "#100a18");
  drawRoundedRect(48, 48, 928, 1344, 22, grad);
}

function drawHeader(data, userName) {
  drawRoundedRect(66, 58, 132, 132, 18, "#0d0a10");
  strokeRoundedRect(66, 58, 132, 132, 18, "#f2d073", 5);

  ctx.fillStyle = "#f7e28d";
  ctx.font = "bold 72px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(data.rarity, 132, 126);

  // HP領域を右側に固定し、名前と重ならないようにする
  ctx.fillStyle = "#fff";
  ctx.textAlign = "right";
  ctx.font = "bold 34px sans-serif";
  ctx.fillText("HP", 800, 124);
  ctx.font = "bold 72px sans-serif";
  ctx.fillText(String(data.hp), 945, 120);

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  fitText(`＜${data.title}＞${userName}`, 220, 122, 520, 40, 24);
}

function drawImageArea(image, theme) {
  const x = 62, y = 205, w = 900, h = 580;
  const grad = ctx.createRadialGradient(x + w / 2, y + h * 0.72, 10, x + w / 2, y + h / 2, w * 0.78);
  grad.addColorStop(0, theme.glow);
  grad.addColorStop(0.26, theme.sub);
  grad.addColorStop(0.66, theme.main);
  grad.addColorStop(1, theme.dark);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  drawSparkles(x, y, w, h, theme);

  if (image) {
    drawContainedImage(image, x + 42, y + 38, w - 84, h - 76);
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.66)";
    ctx.font = "bold 44px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("画像プレビュー", x + w / 2, y + h / 2);
  }

  ctx.strokeStyle = "#e4c262";
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, w, h);
}

function drawInfoArea(data, theme) {
  const y = 812;

  drawRoundedRect(62, y, 214, 194, 0, "rgba(8,5,15,0.76)");
  ctx.fillStyle = "#f5d76e";
  ctx.font = "bold 34px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("総合力", 169, y + 58);
  ctx.font = "bold 88px serif";
  ctx.fillText(String(data.totalPower), 169, y + 142);

  drawRoundedRect(302, y + 14, 630, 166, 12, "rgba(12,7,20,0.84)");
  strokeRoundedRect(302, y + 14, 630, 166, 12, theme.sub, 2);
  ctx.fillStyle = theme.sub;
  ctx.font = "bold 26px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("特殊効果", 326, y + 48);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 40px sans-serif";
  ctx.fillText(data.specialName, 326, y + 92);
  ctx.font = "26px sans-serif";
  wrapText(data.specialEffect, 326, y + 126, 560, 34, 2);
}

function drawActions(data, theme) {
  drawActionRow(1026, data.action1Name, data.action1Text, data.action1Power, theme);
  drawActionRow(1168, data.action2Name, data.action2Text, data.action2Power, theme);
}

function drawActionRow(y, name, text, power, theme) {
  const x = 62, w = 900, h = 126;
  ctx.fillStyle = "rgba(255, 238, 246, 0.9)";
  ctx.fillRect(x, y, w, h);

  ctx.beginPath();
  ctx.arc(118, y + 63, 38, 0, Math.PI * 2);
  ctx.fillStyle = theme.main;
  ctx.fill();
  ctx.strokeStyle = "#e9d084";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "#1b1422";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  fitText(name, 220, y + 48, 540, 36, 24);

  ctx.strokeStyle = "#2b2030";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(220, y + 58);
  ctx.lineTo(810, y + 58);
  ctx.stroke();

  ctx.fillStyle = "#19121f";
  ctx.font = "23px sans-serif";
  wrapText(text, 220, y + 90, 560, 28, 1);

  ctx.fillStyle = "#070507";
  ctx.font = "bold 58px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(String(power), 920, y + 78);
}

function drawFooter(data) {
  // フレーバーテキストとカード番号を左右で完全に分離
  const x = 62, y = 1316, w = 900, h = 68;
  ctx.fillStyle = "rgba(20, 10, 32, 0.96)";
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = "#f1e9ff";
  ctx.font = "22px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  // カード番号欄を右側に確保するため、本文幅を短めに固定
  fitText(data.flavorText, 84, y + 35, 560, 22, 16);

  ctx.fillStyle = "#f7e28d";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`No.${data.cardNo}`, 850, y + 45);
  ctx.font = "42px serif";
  ctx.fillText("☆", 930, y + 47);
}

function drawSparkles(x, y, w, h, theme) {
  const seed = 42;
  for (let i = 0; i < 70; i++) {
    const px = x + pseudoRandom(seed + i) * w;
    const py = y + pseudoRandom(seed + i * 17) * h;
    const r = 1 + pseudoRandom(seed + i * 31) * 4;
    ctx.fillStyle = i % 3 === 0 ? theme.glow : "rgba(255,255,255,0.65)";
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawContainedImage(image, x, y, w, h) {
  const ratio = Math.min(w / image.width, h / image.height);
  const dw = image.width * ratio;
  const dh = image.height * ratio;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;

  ctx.save();
  ctx.shadowColor = "rgba(255,255,255,0.8)";
  ctx.shadowBlur = 28;
  ctx.drawImage(image, dx, dy, dw, dh);
  ctx.restore();
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function downloadCard() {
  const link = document.createElement("a");
  link.download = "ai-card-diagnosis.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function shareToX() {
  if (!latestCardData) return;
  const userName = userNameEl.value.trim();
  const text = `AIカード診断をやってみた！\n\n＜${latestCardData.title}＞${userName}\n${latestCardData.rarity} / HP${latestCardData.hp} / 総合力${latestCardData.totalPower}\n特殊効果：${latestCardData.specialName}\n\n#AIカード診断`;
  const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(location.href)}`;
  window.open(intent, "_blank", "noopener,noreferrer");
}

function setLoading(isLoading) {
  generateBtn.disabled = isLoading;
  generateBtn.textContent = isLoading ? "生成中..." : "カードを生成する";
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function drawRoundedRect(x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function strokeRoundedRect(x, y, w, h, r, color, lineWidth) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function fitText(text, x, y, maxWidth, fontSize, minSize = 20) {
  let size = fontSize;
  do {
    ctx.font = `bold ${size}px sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  } while (size >= minSize);
  ctx.fillText(text, x, y);
}

function wrapText(text, x, y, maxWidth, lineHeight, maxLines) {
  const chars = Array.from(text);
  let line = "";
  const lines = [];

  for (const ch of chars) {
    const testLine = line + ch;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = ch;
      if (lines.length >= maxLines) break;
    } else {
      line = testLine;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);

  lines.slice(0, maxLines).forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
}

function pseudoRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
