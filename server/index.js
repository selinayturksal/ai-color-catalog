import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";

dotenv.config(); // ✅ önce dotenv

const MOCK_MODE = process.env.MOCK_MODE === "true"; // ✅ şimdi doğru okunur

const app = express();
app.use(express.json({ limit: "2mb" }));

app.use(
  cors({
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

const PORT = process.env.PORT || 5050;

// ✅ Mock modda API key zorunlu değil
if (!MOCK_MODE && !process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY missing. Check server/.env");
  process.exit(1);
}

// ✅ Mock modda ai hiç kullanılmayacak
const ai = !MOCK_MODE ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

app.get("/health", (req, res) => res.json({ ok: true, mock: MOCK_MODE }));

/** -----------------------------
 * Schemas
 * ----------------------------- */
const ColorSchema = z.object({
  name: z.string(),
  hex: z.string().regex(/^#([0-9A-Fa-f]{6})$/),
  rgb: z.object({
    r: z.number().int().min(0).max(255),
    g: z.number().int().min(0).max(255),
    b: z.number().int().min(0).max(255),
  }),
  usage: z.string(),
});

const PaletteResSchema = z.object({
  title: z.string(),
  colors: z.array(ColorSchema).min(3),
  notes: z.string().optional(),
});

const PalettesResSchema = z.object({
  palettes: z.array(PaletteResSchema).min(2),
});

const PaletteReqSchema = z.object({
  description: z.string().min(5, "Please enter at least 5 characters."),
  count: z.number().int().min(3).max(10).default(5),
  vibe: z.string().optional(),
});

const PalettesReqSchema = z.object({
  description: z.string().min(5, "Please enter at least 5 characters."),
  count: z.number().int().min(3).max(10).default(5),
  vibe: z.string().optional(),
  variants: z.number().int().min(2).max(5).default(3),
});

/** -----------------------------
 * MOCK DATA
 * ----------------------------- */
function mockSinglePalette() {
  return {
    title: "Modern Living Room (Mock)",
    notes: "Mock palette for portfolio preview.",
    colors: [
      {
        name: "Soft Cream",
        hex: "#F5F0E1",
        rgb: { r: 245, g: 240, b: 225 },
        usage: "Main walls / large surfaces",
      },
      {
        name: "Slate Blue",
        hex: "#4A6FA5",
        rgb: { r: 74, g: 111, b: 165 },
        usage: "Accent wall / statement pieces",
      },
      {
        name: "Warm Taupe",
        hex: "#A1887F",
        rgb: { r: 161, g: 136, b: 127 },
        usage: "Sofa / rugs / upholstery",
      },
      {
        name: "Burnt Sienna",
        hex: "#E98B5D",
        rgb: { r: 233, g: 139, b: 93 },
        usage: "Decor / cushions / art",
      },
      {
        name: "Deep Charcoal",
        hex: "#2B2F36",
        rgb: { r: 43, g: 47, b: 54 },
        usage: "Frames / metals / contrast",
      },
    ],
  };
}

function mockMultiplePalettes() {
  return {
    palettes: [
      {
        title: "Warm Modern (Mock)",
        notes: "Warm neutrals with terracotta accents.",
        colors: [
          { name: "Warm Ivory", hex: "#F4EFE6", rgb: { r: 244, g: 239, b: 230 }, usage: "Walls" },
          { name: "Sand Beige", hex: "#D9C7B5", rgb: { r: 217, g: 199, b: 181 }, usage: "Large textiles" },
          { name: "Terracotta", hex: "#C26E4A", rgb: { r: 194, g: 110, b: 74 }, usage: "Accents" },
          { name: "Walnut", hex: "#6B4F3F", rgb: { r: 107, g: 79, b: 63 }, usage: "Wood / furniture" },
          { name: "Charcoal", hex: "#2B2F36", rgb: { r: 43, g: 47, b: 54 }, usage: "Contrast" },
        ],
      },
      {
        title: "Minimal Cool (Mock)",
        notes: "Clean cool neutrals with a blue accent.",
        colors: [
          { name: "Off White", hex: "#F6F7F9", rgb: { r: 246, g: 247, b: 249 }, usage: "Walls" },
          { name: "Mist Gray", hex: "#C9CED6", rgb: { r: 201, g: 206, b: 214 }, usage: "Upholstery" },
          { name: "Steel Blue", hex: "#4A6FA5", rgb: { r: 74, g: 111, b: 165 }, usage: "Accent" },
          { name: "Graphite", hex: "#3A3F47", rgb: { r: 58, g: 63, b: 71 }, usage: "Metals / frames" },
          { name: "Light Oak", hex: "#C8A97E", rgb: { r: 200, g: 169, b: 126 }, usage: "Wood elements" },
        ],
      },
      {
        title: "Moody Contrast (Mock)",
        notes: "Dark base with warm highlights.",
        colors: [
          { name: "Deep Navy", hex: "#1F2A44", rgb: { r: 31, g: 42, b: 68 }, usage: "Accent wall" },
          { name: "Charcoal", hex: "#2B2F36", rgb: { r: 43, g: 47, b: 54 }, usage: "Main contrast" },
          { name: "Warm Stone", hex: "#B9A99A", rgb: { r: 185, g: 169, b: 154 }, usage: "Textiles" },
          { name: "Copper", hex: "#B87333", rgb: { r: 184, g: 115, b: 51 }, usage: "Lighting / decor" },
          { name: "Soft Cream", hex: "#F5F0E1", rgb: { r: 245, g: 240, b: 225 }, usage: "Balance highlights" },
        ],
      },
    ],
  };
}

/** -----------------------------
 * 1) /api/palette (single)
 * ----------------------------- */
app.post("/api/palette", async (req, res) => {
  try {
    const parsed = PaletteReqSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { description, count, vibe } = parsed.data;

    // ✅ Mock
    if (MOCK_MODE) return res.json(mockSinglePalette());

    const model = "gemini-2.5-flash";

    const system = `
You are an interior color consultant.
Generate a professional interior color palette from the user's description.

Return ONLY valid JSON (no extra text).
Schema:
{
  "title": string,
  "colors": [
    { "name": string, "hex": "#RRGGBB", "rgb": { "r":0-255,"g":0-255,"b":0-255 }, "usage": string }
  ],
  "notes": string
}

Rules:
- colors length must be exactly ${count}.
- HEX and RGB must match.
- Usage must be realistic interior usage (walls / floors / textiles / accents).
- If vibe is provided, follow it.
- Output language: English only.
`.trim();

    const prompt = `
Design description: ${description}
${vibe ? `Vibe/style: ${vibe}` : ""}
`.trim();

    const response = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: system + "\n\n" + prompt }] }],
      config: { temperature: 0.7 },
    });

    const text = response?.candidates?.[0]?.content?.parts?.map((p) => p.text)?.join("") || "";
    const json = safeJsonParse(text);

    const validated = PaletteResSchema.safeParse(json);
    if (!validated.success) {
      return res.status(502).json({
        error: "AI output is not valid JSON in the expected schema.",
        raw: text,
        details: validated.error.flatten(),
      });
    }

    return res.json(validated.data);
  } catch (err) {
    console.error(err);
    const e = normalizeGeminiError(err);
    return res.status(e.status).json({ error: e.message });
  }
});

/** -----------------------------
 * 2) /api/palettes (multiple)
 * ----------------------------- */
app.post("/api/palettes", async (req, res) => {
  try {
    const parsed = PalettesReqSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { description, count, vibe, variants } = parsed.data;

    // ✅ Mock
    if (MOCK_MODE) return res.json(mockMultiplePalettes());

    const model = "gemini-2.5-flash";

    const system = `
You are an interior color consultant.
Generate MULTIPLE distinct alternative palettes from the user's description.

Return ONLY valid JSON.
Schema:
{
  "palettes": [
    {
      "title": string,
      "colors": [
        { "name": string, "hex": "#RRGGBB", "rgb": { "r":0-255,"g":0-255,"b":0-255 }, "usage": string }
      ],
      "notes": string
    }
  ]
}

Rules:
- palettes length must be exactly ${variants}.
- each palette colors length must be exactly ${count}.
- palettes must be clearly different (warm/cool, light/dark, natural/industrial etc).
- HEX and RGB must match.
- Usage must be realistic interior usage.
- If vibe is provided, follow it.
- Output language: English only.
`.trim();

    const prompt = `
Design description: ${description}
${vibe ? `Vibe/style: ${vibe}` : ""}
`.trim();

    const response = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: system + "\n\n" + prompt }] }],
      config: { temperature: 0.8 },
    });

    const text = response?.candidates?.[0]?.content?.parts?.map((p) => p.text)?.join("") || "";
    const json = safeJsonParse(text);

    const validated = PalettesResSchema.safeParse(json);
    if (!validated.success) {
      return res.status(502).json({
        error: "AI output is not valid JSON in the expected schema.",
        raw: text,
        details: validated.error.flatten(),
      });
    }

    return res.json(validated.data);
  } catch (err) {
    console.error(err);
    const e = normalizeGeminiError(err);
    return res.status(e.status).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running http://localhost:${PORT} (mock=${MOCK_MODE})`);
});

/** -----------------------------
 * Helpers
 * ----------------------------- */
function safeJsonParse(text) {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {}

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const sliced = text.slice(start, end + 1);
    try {
      return JSON.parse(sliced);
    } catch {}
  }
  return null;
}

function normalizeGeminiError(err) {
  const msg = err?.message || "Server error";

  const isQuota =
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.toLowerCase().includes("quota") ||
    msg.includes("429") ||
    msg.toLowerCase().includes("rate limit");

  if (isQuota) {
    return {
      status: 429,
      message: "Quota exceeded (429). Please wait and try again, or check your Google AI Studio quota/billing.",
    };
  }

  const isAuth =
    msg.toLowerCase().includes("api key") ||
    msg.toLowerCase().includes("unauthorized") ||
    msg.toLowerCase().includes("permission");

  if (isAuth) {
    return { status: 401, message: "Unauthorized. Check your GEMINI_API_KEY." };
  }

  return { status: 500, message: msg };
}