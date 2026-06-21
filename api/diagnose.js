import OpenAI from "openai";
import formidable from "formidable";
import fs from "fs/promises";

export const config = {
  api: {
    bodyParser: false
  }
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const ALLOWED_TYPES = ["炎", "水", "草", "風", "雷", "氷", "闇", "光", "地", "竜"];
const ALLOWED_RARITIES = ["C", "R", "SR", "UR", "LR"];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { fields, files } = await parseForm(req);
    const userName = String(fields.userName || "").slice(0, 18);
    const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;

    if (!userName || !imageFile) {
      return res.status(400).json({ error: "userName and image are required." });
    }

    const buffer = await fs.readFile(imageFile.filepath);
    const mime = imageFile.mimetype || "image/png";
    const base64 = buffer.toString("base64");

    const result = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "あなたは画像からオリジナルのカードゲーム風診断結果を作るAIです。ポケモン、遊戯王、デュエマ等の公式名・公式技名・公式用語は使わず、完全にオリジナルの日本語で作成してください。返答はJSONのみ。"
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                `ユーザー名: ${userName}\n` +
                "画像の雰囲気をもとに、カードゲーム風の診断カード情報を作ってください。\n" +
                "typeは必ず 炎,水,草,風,雷,氷,闇,光,地,竜 のどれか。\n" +
                "rarityは必ず C,R,SR,UR,LR のどれか。\n" +
                "HPは80〜180、totalPowerは150〜300、actionPowerは30〜120。\n" +
                "特殊効果はカードゲーム風だが、実在TCGの文言に寄せすぎないでください。\n" +
                "titleは二つ名のみ。ユーザー名は含めない。"
            },
            {
              type: "input_image",
              image_url: `data:${mime};base64,${base64}`
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "card_diagnosis",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              rarity: { type: "string" },
              title: { type: "string" },
              hp: { type: "number" },
              type: { type: "string" },
              totalPower: { type: "number" },
              specialName: { type: "string" },
              specialEffect: { type: "string" },
              action1Name: { type: "string" },
              action1Power: { type: "number" },
              action1Text: { type: "string" },
              action2Name: { type: "string" },
              action2Power: { type: "number" },
              action2Text: { type: "string" },
              flavorText: { type: "string" },
              cardNo: { type: "string" }
            },
            required: [
              "rarity",
              "title",
              "hp",
              "type",
              "totalPower",
              "specialName",
              "specialEffect",
              "action1Name",
              "action1Power",
              "action1Text",
              "action2Name",
              "action2Power",
              "action2Text",
              "flavorText",
              "cardNo"
            ]
          },
          strict: true
        }
      }
    });

    const json = JSON.parse(result.output_text);
    return res.status(200).json(normalize(json));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Diagnosis failed." });
  }
}

function parseForm(req) {
  const form = formidable({
    maxFiles: 1,
    maxFileSize: 6 * 1024 * 1024
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

function normalize(data) {
  return {
    rarity: ALLOWED_RARITIES.includes(data.rarity) ? data.rarity : "SR",
    title: String(data.title || "未知なる存在").slice(0, 14),
    hp: clamp(data.hp, 80, 180),
    type: ALLOWED_TYPES.includes(data.type) ? data.type : "闇",
    totalPower: clamp(data.totalPower, 150, 300),
    specialName: String(data.specialName || "特殊効果").slice(0, 12),
    specialEffect: String(data.specialEffect || "").slice(0, 80),
    action1Name: String(data.action1Name || "アクション").slice(0, 14),
    action1Power: clamp(data.action1Power, 30, 120),
    action1Text: String(data.action1Text || "").slice(0, 50),
    action2Name: String(data.action2Name || "アクション").slice(0, 14),
    action2Power: clamp(data.action2Power, 30, 120),
    action2Text: String(data.action2Text || "").slice(0, 50),
    flavorText: String(data.flavorText || "").slice(0, 80),
    cardNo: String(data.cardNo || randomNo()).replace(/\D/g, "").padStart(4, "0").slice(0, 4)
  };
}

function clamp(value, min, max) {
  const n = Number(value);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function randomNo() {
  return String(Math.floor(Math.random() * 9999) + 1);
}
