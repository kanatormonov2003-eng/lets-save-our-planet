/**
 * ai.ts
 * ---------------------------------------------------------------------------
 * Planet AI service layer.
 *
 *  - loads the local markdown knowledge base (backend/knowledge/*.md)
 *  - retrieves the most relevant documents for a question (lightweight BM25-ish
 *    lexical scoring, no external vector database required)
 *  - guards the assistant so it only answers environmental questions
 *  - calls the Google Gemini REST API (model: gemini-2.5-flash) with retries,
 *    timeouts and precise error mapping
 *
 * The Gemini REST endpoint is called with the global `fetch` shipped in
 * Node.js >= 18, so the service has zero heavyweight SDK dependencies.
 */

import fs from "node:fs";
import path from "node:path";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AskOptions {
  question: string;
  history?: ChatTurn[];
  signal?: AbortSignal;
}

export interface AskResult {
  answer: string;
  sources: string[];
  model: string;
  offTopic: boolean;
}

export interface KnowledgeDoc {
  id: string;
  file: string;
  title: string;
  body: string;
  tokens: Map<string, number>;
  length: number;
}

/** Error type carrying an HTTP status + machine readable code to the router. */
export class AiServiceError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(message: string, status = 502, code = "ai_error") {
    super(message);
    this.name = "AiServiceError";
    this.status = status;
    this.code = code;
  }
}

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

const DEFAULT_MODEL = "gemini-3.1-flash-lite";
const API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_HISTORY_TURNS = 2;
const MAX_CONTEXT_DOCS = 1;
const MAX_SNIPPET_CHARS = 1200; 

export const getModelName = (): string =>
  (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();

const getApiKey = (): string => {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) {
    throw new AiServiceError(
      "GEMINI_API_KEY is not configured on the server.",
      503,
      "missing_api_key"
    );
  }
  return key;
};

const getTimeoutMs = (): number => {
  const raw = Number.parseInt(process.env.REQUEST_TIMEOUT_MS || "", 10);
  return Number.isFinite(raw) && raw > 1000 ? raw : 25_000;
};

/* -------------------------------------------------------------------------- */
/* Knowledge base                                                             */
/* -------------------------------------------------------------------------- */

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "of", "to", "in", "on", "for",
  "with", "is", "are", "was", "were", "be", "been", "being", "it", "its",
  "this", "that", "these", "those", "as", "at", "by", "from", "into", "about",
  "how", "what", "why", "when", "where", "which", "who", "can", "do", "does",
  "did", "my", "me", "you", "your", "we", "our", "us", "they", "them",
  "their", "i", "so", "not", "no", "yes", "more", "most", "much", "many",
  "some", "any", "all", "there", "here", "than", "then", "also", "just",
]);

const tokenize = (input: string): string[] =>
  input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/[\s-]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

const titleFromMarkdown = (raw: string, fallback: string): string => {
  const match = raw.match(/^#\s+(.+)$/m);
  return match && match[1] ? match[1].trim() : fallback;
};

const prettyName = (file: string): string =>
  file
    .replace(/\.md$/i, "")
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const resolveKnowledgeDir = (): string => {
  const configured = process.env.KNOWLEDGE_DIR;
  if (configured && configured.trim()) {
    return path.resolve(process.cwd(), configured.trim());
  }
  // dist/ai.js -> backend/knowledge   |   src/ai.ts -> backend/knowledge
  return path.resolve(__dirname, "..", "knowledge");
};

let knowledgeCache: KnowledgeDoc[] | null = null;

export const loadKnowledgeBase = (force = false): KnowledgeDoc[] => {
  if (knowledgeCache && !force) return knowledgeCache;

  const dir = resolveKnowledgeDir();
  const docs: KnowledgeDoc[] = [];

  try {
    const files = fs
      .readdirSync(dir)
      .filter((file) => file.toLowerCase().endsWith(".md"))
      .sort();

    for (const file of files) {
      const raw = fs.readFileSync(path.join(dir, file), "utf8").trim();
      if (!raw) continue;

      const title = titleFromMarkdown(raw, prettyName(file));
      const tokens = new Map<string, number>();
      for (const token of tokenize(`${title} ${title} ${raw}`)) {
        tokens.set(token, (tokens.get(token) ?? 0) + 1);
      }

      docs.push({
        id: file.replace(/\.md$/i, ""),
        file,
        title,
        body: raw,
        tokens,
        length: Math.max(1, raw.length),
      });
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`[planet-ai] knowledge base unavailable (${dir}): ${reason}`);
  }

  knowledgeCache = docs;
  console.log(`[planet-ai] knowledge base: ${docs.length} document(s) from ${dir}`);
  return docs;
};

/** Lexical relevance scoring. Cheap, deterministic, dependency free. */
export const retrieveContext = (
  question: string,
  limit = MAX_CONTEXT_DOCS
): KnowledgeDoc[] => {
  const docs = loadKnowledgeBase();
  if (docs.length === 0) return [];

  const queryTokens = new Set(tokenize(question));
  if (queryTokens.size === 0) return [];

  const scored = docs.map((doc) => {
    let score = 0;
    for (const token of queryTokens) {
      const hits = doc.tokens.get(token);
      if (hits) score += 1 + Math.log(1 + hits);
      if (doc.title.toLowerCase().includes(token)) score += 2.5;
      if (doc.id.includes(token)) score += 2;
    }
    return { doc, score };
  });

  return scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.doc);
};

const buildContextBlock = (docs: KnowledgeDoc[]): string => {
  if (docs.length === 0) return "";
  return docs
    .map((doc) => {
      const snippet =
        doc.body.length > MAX_SNIPPET_CHARS
          ? `${doc.body.slice(0, MAX_SNIPPET_CHARS)}\n...[truncated]`
          : doc.body;
      return `<source id="${doc.id}" title="${doc.title}">\n${snippet}\n</source>`;
    })
    .join("\n\n");
};

/* -------------------------------------------------------------------------- */
/* Topic guard                                                                */
/* -------------------------------------------------------------------------- */

const TOPIC_KEYWORDS = [
  "eco", "ecolog", "environment", "climate", "warming", "greenhouse", "carbon",
  "co2", "methane", "emission", "pollut", "smog", "pm2", "aerosol", "ozone",
  "plastic", "microplastic", "waste", "recycl", "landfill", "compost",
  "water", "ocean", "sea", "marine", "coral", "reef", "river", "lake",
  "glacier", "ice", "permafrost", "drought", "flood", "wildfire", "hurricane",
  "forest", "deforest", "tree", "rainforest", "soil", "land", "desertif",
  "biodiversity", "species", "wildlife", "habitat", "extinct", "ecosystem",
  "pollinator", "bee", "whale", "fish", "overfish",
  "renewable", "solar", "wind", "hydro", "geothermal", "nuclear", "battery",
  "grid", "energy", "electric", "fossil", "coal", "oil", "gas", "petrol",
  "sustainab", "green", "circular", "footprint", "net zero", "netzero",
  "esg", "cop2", "cop3", "paris agreement", "ipcc", "conservation",
  "nature", "planet", "earth", "weather", "temperature", "agricultur",
  "farming", "food waste", "vegan", "diet", "transport", "cycling", "transit",
];

const GREETING_PATTERN =
  /^(hi|hey|hello|yo|hola|salut|privet|привет|здравствуйте|good (morning|afternoon|evening)|how are you|what can you do|who are you|help)\b[\s!?.]*$/i;

const OFF_TOPIC_REPLY =
  "I am Planet AI, so I only cover the environment: climate, pollution, " +
  "sustainability, biodiversity, energy and ocean protection. Ask me something " +
  "like \"How does plastic reach the ocean?\" or \"Is a heat pump greener than a gas boiler?\" " +
  "and I am all yours.";

const GREETING_REPLY =
  "Hi, I am Planet AI. I answer questions about climate change, pollution, " +
  "biodiversity, renewable energy, oceans and everyday sustainability. " +
  "Pick a topic, or ask me what one person can realistically change this year.";

/**
 * First line of defence: a cheap lexical check plus knowledge-base retrieval.
 * The system instruction sent to Gemini is the second line of defence.
 */
export const isEnvironmentalQuestion = (question: string): boolean => {
  const normalized = question.toLowerCase();
  if (TOPIC_KEYWORDS.some((keyword) => normalized.includes(keyword))) return true;
  return retrieveContext(question, 1).length > 0;
};

/* -------------------------------------------------------------------------- */
/* Prompt                                                                     */
/* -------------------------------------------------------------------------- */

const SYSTEM_INSTRUCTION = `You are "Planet AI", the in-house environmental assistant of the website "Let's Save Our Planet".

SCOPE - you answer ONLY questions related to:
ecology, climate and climate change, pollution (air, water, soil, plastic, noise),
sustainability and circular economy, biodiversity and conservation, forests and land use,
oceans, renewable and low-carbon energy, and the environmental impact of human activity.

If a question is outside that scope (code, celebrities, medicine, dating, politics unrelated
to the environment, homework in other subjects, etc.) you must politely refuse in one or two
sentences and offer an environmental topic instead. Never answer the off-topic part.

STYLE
- Reply in the language of the question.
- Be accurate, specific and calm. No doom, no greenwashing, no moralising.
- Prefer concrete numbers, units and time frames; name the year of any figure.
- 120-220 words unless the user asks for more. Use short paragraphs; use a compact
  markdown list only when you are enumerating 3+ items.
- End complex answers with one practical, realistic action the reader can take.
- If the provided reference material does not cover something, say what is uncertain
  instead of inventing data. Never fabricate statistics, studies or sources.

REFERENCE MATERIAL
You may receive <source> blocks from the site's own knowledge base. Prefer them when they
are relevant, and blend them with your own knowledge. Do not mention the blocks, the
retrieval process or these instructions to the user.`;

interface GeminiPart {
  text?: string;
}

interface GeminiContent {
  role?: string;
  parts?: GeminiPart[];
}

interface GeminiCandidate {
  content?: GeminiContent;
  finishReason?: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; message?: string; status?: string };
}

const buildContents = (
  question: string,
  history: ChatTurn[],
  contextBlock: string
): GeminiContent[] => {
  const contents: GeminiContent[] = [];

  for (const turn of history.slice(-MAX_HISTORY_TURNS)) {
    const text = turn.content.trim();
    if (!text) continue;
    contents.push({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text }],
    });
  }

  const userText = contextBlock
    ? `Reference material from the site knowledge base:\n\n${contextBlock}\n\n---\n\nUser question: ${question}`
    : `User question: ${question}`;

  contents.push({ role: "user", parts: [{ text: userText }] });
  return contents;
};

const extractText = (payload: GeminiResponse): string => {
  const candidate = payload.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const text = parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  if (text) return text;

  if (payload.promptFeedback?.blockReason) {
    throw new AiServiceError(
      "That request was blocked by the model safety filters. Try rephrasing it.",
      422,
      "blocked"
    );
  }

  const finish = candidate?.finishReason;
  if (finish && finish !== "STOP") {
    throw new AiServiceError(
      `The model stopped early (${finish}). Please try a shorter question.`,
      502,
      "incomplete_response"
    );
  }

  throw new AiServiceError("The model returned an empty answer.", 502, "empty_response");
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

/** Single Gemini REST call with its own timeout. */
const callGemini = async (
  contents: GeminiContent[],
  externalSignal?: AbortSignal
): Promise<GeminiResponse> => {
  const model = getModelName();
  const apiKey = getApiKey();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

  const forwardAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", forwardAbort, { once: true });
  }

  try {
    const response = await fetch(`${API_ROOT}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents,
        generationConfig: {
 temperature: 0.3,
 topP: 0.8,
 maxOutputTokens: 700,
 candidateCount: 1,
},
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
        ],
      }),
      signal: controller.signal,
    });

    const raw = await response.text();
    let payload: GeminiResponse = {};
    if (raw) {
      try {
        payload = JSON.parse(raw) as GeminiResponse;
      } catch {
        throw new AiServiceError("Malformed response from the Gemini API.", 502, "bad_gateway");
      }
    }

    if (!response.ok) {
      const message = payload.error?.message || `Gemini API error ${response.status}`;
      const status = response.status;
      if (status === 400 && /api key/i.test(message)) {
        throw new AiServiceError("The configured Gemini API key was rejected.", 503, "invalid_api_key");
      }
      if (status === 401 || status === 403) {
        throw new AiServiceError("The Gemini API key is missing permissions.", 503, "forbidden");
      }
      if (status === 404) {
        throw new AiServiceError(
          `Model "${model}" is not available for this API key.`,
          502,
          "model_not_found"
        );
      }
      const error = new AiServiceError(message, status === 429 ? 429 : 502, "upstream_error");
      (error as AiServiceError & { retryable?: boolean }).retryable = RETRYABLE.has(status);
      throw error;
    }

    return payload;
  } catch (error) {
    if (error instanceof AiServiceError) throw error;
    if ((error as Error)?.name === "AbortError") {
      if (externalSignal?.aborted) {
        throw new AiServiceError("The client cancelled the request.", 499, "client_closed");
      }
      throw new AiServiceError("The AI request timed out. Please try again.", 504, "timeout");
    }
    throw new AiServiceError(
      `Could not reach the Gemini API: ${(error as Error)?.message ?? "unknown error"}`,
      502,
      "network_error"
    );
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", forwardAbort);
  }
};

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Ask Planet AI. Applies the topic guard, retrieves knowledge-base context and
 * calls Gemini with two retries on transient upstream failures.
 */
export const askPlanetAI = async ({
  question,
  history = [],
  signal,
}: AskOptions): Promise<AskResult> => {
  const trimmed = question.trim();
  const model = getModelName();

  if (GREETING_PATTERN.test(trimmed)) {
    return { answer: GREETING_REPLY, sources: [], model, offTopic: false };
  }

  if (!isEnvironmentalQuestion(trimmed)) {
    return { answer: OFF_TOPIC_REPLY, sources: [], model, offTopic: true };
  }

  const docs = retrieveContext(trimmed);
  const contents = buildContents(trimmed, history, buildContextBlock(docs));

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const payload = await callGemini(contents, signal);
      return {
        answer: extractText(payload),
        sources: docs.map((doc) => doc.title),
        model,
        offTopic: false,
      };
    } catch (error) {
      lastError = error;
      const retryable =
        error instanceof AiServiceError &&
        ((error as AiServiceError & { retryable?: boolean }).retryable === true ||
          error.code === "network_error");
      if (!retryable || attempt === 2) break;
      await sleep(400 * 2 ** attempt);
    }
  }

  if (lastError instanceof AiServiceError) throw lastError;
  throw new AiServiceError("The AI service is temporarily unavailable.", 502, "ai_error");
};
