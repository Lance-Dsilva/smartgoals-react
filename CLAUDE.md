# CLAUDE.md — SmartGoals (React + GPT API)

## Project Overview

A conversational goal-setting assistant for retail store managers. Users chat with GoalBot to set
performance goals (Revenue, Operating Cost, Footfall, Units Sold, Customer Satisfaction Score,
Expense) for stores, departments, or employees. The bot uses GPT-4o-mini for NLU, reads ML-generated
recommended targets, and previews goal cards in real time. A separate Data tab shows a financial-style
dashboard of all historical metrics and recommended targets.

**Stack:** React 18 · Vite · Tailwind CSS · Express.js · OpenAI GPT-4o-mini (or Databricks endpoint)

---

## Project Structure

```
smartgoals-react/
├── app.yaml                    # Databricks Apps config — gitignored (contains API key)
├── app.yaml.template           # Committed template — copy to app.yaml and fill in values
├── server.js                   # Express proxy server: serves dist/, holds API keys server-side
├── vite.config.js              # Vite config: proxies /api → localhost:3001 in dev
├── .env                        # Local dev secrets (OPENAI_API_KEY etc.) — gitignored
├── .gitignore                  # Ignores: node_modules, dist, .env, app.yaml
├── public/
│   └── data/
│       ├── stores.csv                  # 5 stores
│       ├── departments.csv             # 6 departments
│       ├── employees.csv               # 10 employees
│       ├── historical_metrics.csv      # Jan/Feb/Mar actuals + 3-mo avg (no recommended_target)
│       └── recommended_targets.json    # ML model nightly output — source of truth for targets
└── src/
    ├── App.jsx                         # Root: tab state, goal state, useAppData, layout
    ├── components/
    │   ├── Navbar.jsx                  # Tab switcher (Goals / Data), logo, avatar
    │   ├── ChatPanel.jsx               # GoalBot conversation UI (right panel)
    │   ├── GoalCard.jsx                # Individual goal card with edit + details modal
    │   └── DataPanel.jsx               # Financial-style data dashboard (Data tab)
    └── data/
        ├── useAppData.js               # Hook: fetches CSVs + targets, merges, exposes helpers
        └── recommendedTargetsApi.js    # API stub: local JSON now, real API via env var
```

---

## Running the App

### Local Development (two terminals)

```bash
# Terminal 1 — proxy server (holds API key, proxies /api/chat to OpenAI)
node server.js          # runs on localhost:3001, reads .env

# Terminal 2 — Vite dev server
npm run dev             # runs on localhost:5173, proxies /api → :3001
```

### Production / Databricks Deploy

```bash
npm run start           # builds React (dist/) then serves on port 8000
```

### Environment variables (`.env` for local, `app.yaml` for Databricks)

| Variable | Required | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | Yes (if not using Databricks endpoint) | GPT-4o-mini API key — server-side only |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini` |
| `DATABRICKS_ENDPOINT_URL` | No | Set to switch from OpenAI to a Databricks-hosted LLM |
| `DATABRICKS_TOKEN` | No | Databricks PAT for the model serving endpoint |
| `PORT` | No | Defaults to 3001 locally, 8000 on Databricks |

---

## Databricks Deployment

### app.yaml

`app.yaml` is gitignored — copy `app.yaml.template` to `app.yaml` and fill in your keys.

```bash
cp app.yaml.template app.yaml
# edit app.yaml with real values
```

Databricks Apps reads `app.yaml`, injects env vars, and runs `node server.js`.

### Switching to a Databricks Model Serving endpoint

Set in `app.yaml`:
```yaml
- name: DATABRICKS_ENDPOINT_URL
  value: "https://<workspace>/serving-endpoints/<endpoint-name>/invocations"
- name: DATABRICKS_TOKEN
  value: "your-databricks-pat"
```

`server.js` automatically routes to the Databricks endpoint when `DATABRICKS_ENDPOINT_URL` is set.
Both OpenAI and Databricks Foundation Model APIs use the same OpenAI-compatible request format.

### Recommended for production — use Databricks Secrets

```yaml
- name: OPENAI_API_KEY
  valueFrom:
    secretRef:
      scope: "smartgoals-secrets"
      key: "openai-api-key"
```

### Security model

- Databricks Apps enforce workspace authentication — external (unauthenticated) users cannot reach the app
- API keys are held in `server.js` via env vars — never bundled into client JS
- `dist/data/*.csv` and `dist/data/*.json` are accessible to any authenticated workspace user (no PII or secrets in those files)
- `server.js`, `.env`, `app.yaml` are never served to the browser (only `dist/` is served statically)

---

## Architecture: API Key Flow

```
Browser → /api/chat → server.js → OpenAI API
                         ↑              OR
                    reads keys    Databricks endpoint
                    from env
                    (app.yaml on Databricks, .env locally)
```

The browser never sees the API key. All LLM calls go through `server.js`.

---

## Data Architecture

### Two separate files — single source of truth

| File | Contents | Updated by |
|---|---|---|
| `historical_metrics.csv` | jan, feb, mar, avg_3m — immutable history | Never at runtime |
| `recommended_targets.json` | ML model's nightly recommended targets | Replaced nightly by ML pipeline |

`useAppData.js` fetches both, merges them at runtime into the `metrics` array (each row gets a
`recommended_target` field). Downstream components only consume the merged `metrics`.

### Switching to a live ML targets API

Set `VITE_TARGETS_API_URL` in `.env`. `recommendedTargetsApi.js` switches from the local JSON file
to `GET {VITE_TARGETS_API_URL}/v1/recommended-targets`. No code changes needed.

### When a goal is set or edited

`appData.updateMetricTarget(entityType, entityId, metric, newValue)` updates the in-memory `targets`
state → `targetsMap` recomputes → merged `metrics` recomputes via `useMemo` → DataPanel re-renders.
Historical data is never mutated.

---

## Chatbot Flow (ChatPanel.jsx)

Numeric steps drive the UI. GPT handles clarifying questions only; the UI handles all data display,
dropdowns, and goal confirmation.

| Step | What's shown | Pills / UI |
|---|---|---|
| 0 | Ask metric | Revenue / Operating Cost / Footfall / Units Sold / Customer Satisfaction |
| 1 (scope type) | Ask store/dept/employee | Store / Department / Employee |
| 1 (specific entity) | Dropdown to pick exact entity | Derived live from `appData` (not hardcoded) |
| 2 | DataTable (jan/feb/mar/avg/rec. target) | Use Recommended Target / Show Similar Stores / Set Custom Value |
| 3 | Similar stores comparison | Yes, confirm / Set Custom Value |
| 4 | Success banner | — |

**"Set Custom Value"** shows `CustomValueInput` — inline number input. On confirm:
- Creates goal card with custom value
- Calls `updateMetricTarget` → Data tab reflects it immediately

**GPT rules** (system prompt):
- NEVER confirm, save, or finalize a goal
- NEVER show data or recommended values
- Redirect to buttons for all actions
- Revenue / Operating Cost / Footfall are store/department metrics only — not for employees

**Intent detection** (`detectIntent`): keyword matching for free-text. Free-text advances at most
to step 1; step 2 is only reachable via pill/dropdown click (prevents skipping entity selection).

---

## Goal Cards (GoalCard.jsx)

Each goal object shape:
```js
{
  id, metric, owner,
  currentValue,    // formatted string e.g. "$133,525"
  previousValue,   // 3-month avg formatted
  changePercent,   // number
  progress,        // 0–100
  month,           // "March 2025"
  entityType,      // 'store'|'department'|'employee'  (chatbot-created only)
  entityId,        // e.g. 'S001'                      (chatbot-created only)
  csvMetric,       // exact CSV metric name            (chatbot-created only)
  isNew,           // shows "Just Created" badge
}
```

Edit saves call `onMetricUpdate(entityType, entityId, csvMetric, parsedNumericValue)` → syncs the
new value to the Data tab's Rec. Target column. Static demo goals don't carry entity info and don't sync.

---

## Data Dashboard (DataPanel.jsx)

Financial P&L-style layout, grouped by metric:

- **Top bar**: slim stats (rows, avg vs target, entity count)
- **Filter bar**: View Level · Store · Department · Metric · Reset
- **Metric sections**: each metric is a named section with its own table
  - Columns: Entity Name | Jan | Feb | Mar (trend arrow ↗↘) | 3-Mo Avg | **Rec. Target** (dark header) | vs Avg badge
  - Chevron `>` at row start; filled pill badges (solid green/red)
  - Average summary row when multiple entities shown

Both panels always mounted — tab switching uses CSS `hidden`/`flex` to preserve ChatPanel React
state (messages, step, entity selection, GPT history ref).

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Express proxy server | API key never reaches the browser; works on Databricks Apps |
| `app.yaml` gitignored, template committed | Keeps secrets out of git; template documents required vars |
| CSS show/hide for tab switching | Preserves ChatPanel state (messages, step, GPT history) across tab changes |
| Recommended targets in separate JSON | Decouples ML nightly output from historical data; API-ready |
| Scope pills derived from `appData` | Adding new stores/employees to CSV automatically shows in chatbot dropdown |
| `injectVisuals` flag in `getBotReply` | DataTable only appears on explicit pill clicks, never on free-text GPT replies |
| Step 2 only reachable via pill | Prevents free-text from skipping entity selection |

---

## Entity IDs Reference

| Type | ID format | Examples |
|---|---|---|
| Store | S001–S005 | S001=Downtown Flagship, S002=Lincoln Park, S003=Wicker Park, S004=Hyde Park, S005=Naperville |
| Department | Name as ID | Electronics, Apparel, Grocery, Home & Living, Sports, Beauty |
| Employee | E001–E010 | E001=Sarah Kim (S001), E002=Mike Chen (S001), E004=Tom Brown (S002)… |

---

## Future Work

- **Databricks Secrets**: replace plaintext `value:` in `app.yaml` with `secretRef:` for production
- **Live ML targets API**: wire `VITE_TARGETS_API_URL` + POST override in `updateMetricTarget`
- **Goal persistence**: save goals to backend (currently in-memory React state only)
- **Authentication**: scope data to logged-in manager's store automatically
- **Goal tracking**: actual vs target over time — month-over-month progress dashboard
- **Export**: PDF/Excel report of confirmed goals
