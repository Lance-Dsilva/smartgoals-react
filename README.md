# SmartGoals

A conversational goal-setting assistant for retail store managers. Users chat with GoalBot to set performance goals for stores, departments, or employees. A separate Data tab shows a financial-style dashboard of all historical metrics and recommended targets.

**Stack:** React 18 · Vite · Tailwind CSS · Express.js · OpenAI GPT-4o-mini (or Databricks endpoint)

---

## Getting Started

### Prerequisites

- Node.js 18+
- An OpenAI API key (or a Databricks model serving endpoint)

### Install

```bash
npm install
```

### Configure environment

Copy `.env.example` to `.env` (or create `.env`) and add your API key:

```bash
OPENAI_API_KEY=sk-...
```

| Variable | Required | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | Yes (if not using Databricks) | GPT-4o-mini API key — server-side only |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini` |
| `DATABRICKS_ENDPOINT_URL` | No | Switch from OpenAI to a Databricks-hosted LLM |
| `DATABRICKS_TOKEN` | No | Databricks PAT for the model serving endpoint |
| `PORT` | No | Defaults to 3001 locally, 8000 on Databricks |

### Run locally (two terminals)

```bash
# Terminal 1 — proxy server (holds API key, proxies /api/chat to OpenAI)
node server.js

# Terminal 2 — Vite dev server
npm run dev
```

App runs at `http://localhost:5173`.

---

## Project Structure

```
smartgoals-react/
├── server.js                   # Express proxy server: serves dist/, holds API keys
├── vite.config.js              # Vite config: proxies /api → localhost:3001 in dev
├── app.yaml.template           # Databricks Apps config template
├── public/
│   └── data/
│       ├── stores.csv
│       ├── departments.csv
│       ├── employees.csv
│       ├── historical_metrics.csv      # Jan/Feb/Mar actuals + 3-mo avg
│       └── recommended_targets.json    # ML model nightly output
└── src/
    ├── App.jsx
    ├── components/
    │   ├── Navbar.jsx
    │   ├── ChatPanel.jsx
    │   ├── GoalCard.jsx
    │   └── DataPanel.jsx
    └── data/
        ├── useAppData.js
        └── recommendedTargetsApi.js
```

---

## Chatbot Flow

The bot guides users through goal creation in steps:

1. **Choose a metric** — Revenue, Operating Cost, Footfall, Units Sold, Customer Satisfaction
2. **Choose a scope** — Store, Department, or Employee
3. **Pick an entity** — dropdown populated from live data
4. **Review data** — Jan/Feb/Mar actuals, 3-mo avg, and recommended target
5. **Confirm or customize** — use the recommended target, compare similar stores, or set a custom value

GPT-4o-mini handles clarifying questions only. All data display and confirmations are handled by the UI.

---

## Databricks Deployment

```bash
npm run start   # builds React (dist/) then serves on port 8000
```

Copy `app.yaml.template` to `app.yaml` and fill in your keys:

```bash
cp app.yaml.template app.yaml
```

To use a Databricks model serving endpoint instead of OpenAI, set `DATABRICKS_ENDPOINT_URL` and `DATABRICKS_TOKEN` in `app.yaml`. The server routes automatically.

> **Note:** `app.yaml` is gitignored — never commit API keys.

---

## Security

- The browser never sees the API key — all LLM calls go through `server.js`
- Databricks Apps enforce workspace authentication
- `dist/data/` files contain no PII or secrets
