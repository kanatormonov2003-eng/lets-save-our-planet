<<<<<<< HEAD
# Let's Save Our Planet

An international environmental awareness site with a built-in AI assistant.
Eight issues explained with causes, consequences and solutions, plus **Planet AI**, a Google
Gemini assistant that only answers environmental questions and is grounded in a local markdown
knowledge base.

- **Frontend:** React 18 + TypeScript + Vite, hand-written CSS (no UI framework, no CSS-in-JS).
- **Backend:** Node.js + Express + TypeScript, Google Gemini (`gemini-2.5-flash`) over the official
  REST endpoint using native `fetch`.
- **Zero external image requests:** every card illustration is generated SVG, so nothing 404s.

---

## 1. Requirements

| Tool | Version |
| ---- | ------- |
| Node.js | 18.17 or newer (20 LTS recommended, native `fetch` required) |
| npm | 9 or newer |
| Gemini API key | free from [Google AI Studio](https://aistudio.google.com/app/apikey) |

---

## 2. Project structure

```
lets-save-our-planet/
├── frontend/
│   ├── index.html
│   ├── public/favicon.svg
│   ├── src/
│   │   ├── main.tsx              # React entry point
│   │   ├── App.tsx               # page composition, filters, scroll behaviour
│   │   ├── api.ts                # typed API client + ApiError
│   │   ├── components/
│   │   │   ├── Header.tsx        # sticky nav + mobile menu
│   │   │   ├── Hero.tsx          # title, CTAs, generated planet artwork
│   │   │   ├── ProblemCard.tsx   # issue card + SVG art + causes/effects/solutions tabs
│   │   │   ├── AIChat.tsx        # full chat UI: history, loading, errors, retry
│   │   │   └── Footer.tsx
│   │   ├── data/issues.ts        # the eight issues, typed
│   │   └── styles.css            # complete design system
│   ├── .env.example
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── server.ts             # Express app, CORS, rate limit, validation, errors
│   │   └── ai.ts                 # knowledge retrieval, topic guard, Gemini client
│   ├── knowledge/                # markdown context injected into the prompt
│   │   ├── climate_change.md
│   │   ├── air_pollution.md
│   │   ├── water_pollution.md
│   │   ├── plastic_pollution.md
│   │   ├── deforestation.md
│   │   ├── biodiversity.md
│   │   ├── renewable_energy.md
│   │   ├── ocean_protection.md
│   │   └── sustainability.md
│   ├── .env.example
│   ├── tsconfig.json
│   └── package.json
│
├── package.json                  # npm workspaces
└── README.md
```

---

## 3. Setup

```bash
# from the project root
npm install                 # installs both workspaces

# backend env
cp backend/.env.example backend/.env
#   -> open backend/.env and paste your GEMINI_API_KEY

# frontend env
cp frontend/.env.example frontend/.env
```

`backend/.env`

```env
GEMINI_API_KEY=your_key_here
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
```

`frontend/.env`

```env
VITE_API_URL=http://localhost:4000/api
```

---

## 4. Run it

Two terminals:

```bash
# terminal 1 - API on http://localhost:4000
npm run dev:backend

# terminal 2 - site on http://localhost:5173
npm run dev:frontend
```

Production build:

```bash
npm run build          # tsc for the backend, tsc --noEmit + vite build for the frontend
npm start              # serves the compiled API from backend/dist
npm run preview        # serves the built frontend on http://localhost:4173
```

---

## 5. API

### `POST /api/ask`

Request

```json
{
  "question": "Why is methane such a big deal if there is so little of it?",
  "history": [{ "role": "user", "content": "..." }]
}
```

`history` is optional (max 20 turns, the last 8 are sent to the model).

Response

```json
{
  "answer": "...",
  "sources": ["Climate Change"],
  "model": "gemini-2.5-flash",
  "offTopic": false
}
```

Errors are always shaped the same way:

```json
{ "error": { "code": "rate_limited", "message": "Too many questions in a short window..." } }
```

| Status | Code | Meaning |
| ------ | ---- | ------- |
| 400 | `invalid_request` | body failed zod validation |
| 403 | `cors_rejected` | origin not in `FRONTEND_ORIGIN` |
| 422 | `blocked` | model safety filter |
| 429 | `rate_limited` | more than 20 requests per minute per IP |
| 503 | `missing_api_key` / `invalid_api_key` | server not configured |
| 504 | `timeout` | Gemini did not answer within 25 s |

### `GET /api/health`

Reports env, model, whether the API key is present, and which knowledge files loaded.
The chat widget uses it to show its connection dot.

### `GET /api/topics`

The six allowed subject areas.

### Quick check with curl

```bash
curl -s http://localhost:4000/api/health | jq

curl -s -X POST http://localhost:4000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"How does plastic actually reach the ocean?"}' | jq -r .answer

# off-topic questions are refused without spending a token
curl -s -X POST http://localhost:4000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"Write me a Python quicksort"}' | jq -r .answer
```

---

## 6. How Planet AI stays on topic

Three layers:

1. **Lexical guard** in `ai.ts`: a question with no environmental term and no knowledge-base hit is
   refused locally, so off-topic traffic never reaches Gemini.
2. **Retrieval**: the top three matching knowledge documents are scored lexically and injected as
   `<source>` blocks. Retrieved titles come back in `sources` and are shown under the answer.
3. **System instruction**: scope, tone, length and an explicit refusal rule, plus a ban on
   inventing statistics.

Add a topic by dropping a new `.md` file into `backend/knowledge/` and restarting the server.
The first `# Heading` becomes the source title.

---

## 7. Hardening included

- `helmet` security headers, `x-powered-by` disabled.
- CORS allow-list from `FRONTEND_ORIGIN` (comma-separate several origins).
- Rate limit: 20 requests/minute/IP on `/api/ask`, configurable.
- `zod` strict body validation, 32 kb JSON limit.
- 25 s upstream timeout, two retries with exponential backoff on 429/5xx.
- Client aborts propagate to the Gemini request, so a closed tab stops the work.
- Centralised error handler: consistent shape, stack traces never leak in production.

---

## 8. Deployment notes

- Backend: any Node host (Railway, Render, Fly, a VPS). Set `NODE_ENV=production`,
  `GEMINI_API_KEY`, `FRONTEND_ORIGIN=https://your-domain`, and `TRUST_PROXY=1` behind a proxy.
  Ship the `knowledge/` folder alongside `dist/`.
- Frontend: `npm run build --workspace frontend` produces a static `frontend/dist`. Deploy to
  Netlify, Vercel, Cloudflare Pages or any bucket, with `VITE_API_URL` pointing at the live API.
- The API key stays server side. The browser never sees it.

---

## 9. Customising

- **Content**: `frontend/src/data/issues.ts` holds all eight issues. Add one and it appears in the
  grid and the filters automatically.
- **Photography**: set `photo: "https://..."` on any issue and `ProblemCard` renders that image
  instead of the generated SVG.
- **Colour**: every card derives its palette from a single `hue` value via OKLCH.
- **Model**: set `GEMINI_MODEL` in `backend/.env` to try another Gemini model.

---

## 10. License

MIT. Figures are cited with their year and source in the UI; verify before republishing.
=======
# lets-save-our-planet
>>>>>>> 84dbc066ca2f4ccc09be166f81c8b3a8073fe934
