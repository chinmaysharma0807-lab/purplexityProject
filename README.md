# purplexityProject
# purplexityProject

> My own Perplexity-style AI answer engine, built to understand how LLM apps and backends actually work under the hood.

---

## ⚡ Quick Revision Summary (read this first)

**One line:** A Perplexity-style app where a user asks a question, the backend sends it to an OpenAI model through Groq's API, and the answer is returned, stored, and kept in sync with the database.

**30-second pitch:**
I built a Perplexity-inspired AI answer engine with a hand-written backend. It calls an OpenAI model through the Groq API, exposes its own API routes for the frontend, and keeps a two-way sync between the database and the backend so conversations are saved and reloaded consistently. It started from Harkirat's 2-hour Perplexity video, but I turned it into a 4-day deep dive to understand each piece from first principles.

**3 things I'd highlight in an interview:**
1. **LLM integration** – calling a model through Groq's API and handling the request → response cycle.
2. **Backend design** – writing my own routes instead of copying them.
3. **Two-way DB ↔ backend sync** – keeping data consistent in both directions.

---

## 📌 Why I Built This

- To understand how LLM-based and agentic apps work beyond just "calling an API".
- To learn how a backend is actually written: routes, data flow, and persistence.
- First "real" project after starting with basics. Small, but it laid the foundation for what comes next.

Inspired by: Harkirat Singh's Perplexity build video.
Guided by: my senior, Deepak.

---

## 🧠 How It Works (Request Flow)

```
User (Frontend)
     │  1. Asks a question
     ▼
Backend API Route  ──────────────┐
     │  2. Validates request      │
     │  3. Builds prompt          │
     ▼                            │
Groq API (OpenAI model)           │
     │  4. Generates answer       │
     ▼                            │
Backend                           │
     │  5. Saves Q&A to DB  ◄─────┤  two-way sync
     │  6. Returns response       │
     ▼                            │
Frontend displays answer   Database ┘
```

**Step by step:**
1. User types a query in the frontend.
2. Frontend sends it to a backend route.
3. Backend prepares the prompt (and any context).
4. Backend calls the OpenAI model via the Groq API.
5. The response is saved to the database.
6. The answer is returned to the frontend.
7. When the app reloads, data is fetched back from the DB, so the backend and DB always agree.

---

## 🛠️ Tech Stack

> Fill these in so future-me remembers exactly what was used.

| Layer      | Tech |
|------------|------|
| Frontend   | `[e.g. React / Next.js]` (mostly not hand-written) |
| Backend    | `[e.g. Node.js + Express / Bun]` |
| LLM API    | Groq API → OpenAI model `[model name]` |
| Database   | `[e.g. PostgreSQL / Supabase / MongoDB]` |
| ORM / DB client | `[e.g. Prisma / Drizzle / none]` |
| Search (if any) | `[e.g. Tavily / none]` |

---

## 📂 Project Structure

> Update to match the real folders.

```
purplexityProject/
├── frontend/          # UI
├── backend/
│   ├── routes/        # API routes
│   ├── services/      # Groq / LLM calls
│   ├── db/            # DB connection, schema, sync logic
│   └── index.[js|ts]  # Server entry point
├── .env.example
└── README.md
```

---

## 🔌 API Routes

> Fill in with actual routes.

| Method | Route | What it does |
|--------|-------|--------------|
| `POST` | `/[ask]` | Takes a user query, calls the LLM, saves and returns the answer |
| `GET`  | `/[conversations]` | Fetches saved conversations from the DB |
| `[ ]`  | `/[ ]` | `[ ]` |

---

## 🔄 Two-Way Sync (DB ↔ Backend)

The most interesting part to learn.

- **Backend → DB:** every new question and answer is written to the database.
- **DB → Backend:** on load or refresh, data is read back from the DB, so the app state always reflects what's stored.
- **Why it matters:** without this, conversations would disappear on refresh, or the UI could show data the DB doesn't have.

**Notes for myself:** `[How I implemented it – e.g. write on every response, fetch on load, any issue I hit and how I fixed it]`

---

## 🚀 Running Locally

```bash
# 1. Clone
git clone [repo-url]
cd purplexityProject

# 2. Install
cd backend && [npm install / bun install]
cd ../frontend && [npm install / bun install]

# 3. Environment variables (see below)
cp .env.example .env

# 4. Run backend
cd backend && [npm run dev / bun run index.ts]

# 5. Run frontend
cd frontend && [npm run dev]
```

### Environment Variables

```env
GROQ_API_KEY=your_groq_api_key
DATABASE_URL=your_database_url
# [add any others]
```

⚠️ Never commit `.env`. Keep it in `.gitignore`.

---

## 📚 What I Learned

- How an LLM API call really works: request format, model selection, response parsing.
- Using Groq as a fast inference provider for an OpenAI model.
- Structuring a backend with clean, separate routes.
- Persisting data and keeping DB and backend in sync.
- That a "2-hour tutorial" becomes real understanding only when you slow down and dig into every line.

---

## ❓ Revision Questions (test myself)

1. What happens from the moment a user hits "ask" until the answer appears?
2. Why use Groq instead of calling OpenAI directly?
3. Where is the API key stored, and why not in the frontend?
4. What would break if the two-way sync didn't exist?
5. How would I add streaming responses?
6. How would I add web search so answers have sources, like real Perplexity?

---

## 🔮 Future Improvements

- [ ] Stream responses token by token
- [ ] Add web search + source citations
- [ ] Conversation history with follow-up questions
- [ ] Authentication / user accounts
- [ ] Deploy and add the live link here

---

*Might be basic, but it's where it all started. Just start.* 🚀
