/**
 * SmartGoals proxy server
 *
 * Serves the React build (dist/) and proxies /api/chat to either:
 *   - OpenAI API          (when DATABRICKS_ENDPOINT_URL is not set)
 *   - Databricks endpoint (when DATABRICKS_ENDPOINT_URL is set)
 *
 * API keys are read from environment variables — never sent to the browser.
 *
 * Local dev:  node server.js          (reads .env via dotenv)
 * Databricks: node server.js          (env vars injected by app.yaml)
 */

import 'dotenv/config'
import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app  = express()
const PORT = process.env.PORT ?? 3001

// ── Config ─────────────────────────────────────────────────────────────────────

const OPENAI_API_KEY          = process.env.OPENAI_API_KEY ?? ''
const OPENAI_MODEL            = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
const DATABRICKS_ENDPOINT_URL = process.env.DATABRICKS_ENDPOINT_URL ?? ''
const DATABRICKS_TOKEN        = process.env.DATABRICKS_TOKEN ?? ''

const USE_DATABRICKS = Boolean(DATABRICKS_ENDPOINT_URL)

console.log(`[SmartGoals] LLM backend: ${USE_DATABRICKS ? `Databricks → ${DATABRICKS_ENDPOINT_URL}` : `OpenAI (${OPENAI_MODEL})`}`)

// ── Middleware ─────────────────────────────────────────────────────────────────

app.use(express.json())

// Serve built React app
app.use(express.static(join(__dirname, 'dist')))

// ── /api/chat ──────────────────────────────────────────────────────────────────

app.post('/api/chat', async (req, res) => {
  const { messages, max_tokens = 200, system_prompt } = req.body

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages must be an array' })
  }

  try {
    let url, headers, body

    if (USE_DATABRICKS) {
      // ── Databricks Model Serving endpoint ───────────────────────────────────
      // Databricks Foundation Model APIs are OpenAI-compatible.
      if (!DATABRICKS_TOKEN) {
        return res.status(500).json({ error: 'DATABRICKS_TOKEN is not configured' })
      }
      url     = DATABRICKS_ENDPOINT_URL
      headers = {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${DATABRICKS_TOKEN}`,
      }
      body = JSON.stringify({
        messages: system_prompt
          ? [{ role: 'system', content: system_prompt }, ...messages]
          : messages,
        max_tokens,
      })
    } else {
      // ── OpenAI ──────────────────────────────────────────────────────────────
      if (!OPENAI_API_KEY) {
        return res.status(500).json({ error: 'OPENAI_API_KEY is not configured' })
      }
      url     = 'https://api.openai.com/v1/chat/completions'
      headers = {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      }
      body = JSON.stringify({
        model: OPENAI_MODEL,
        max_tokens,
        messages: system_prompt
          ? [{ role: 'system', content: system_prompt }, ...messages]
          : messages,
      })
    }

    const upstream = await fetch(url, { method: 'POST', headers, body })

    if (!upstream.ok) {
      const text = await upstream.text()
      console.error(`[SmartGoals] Upstream error ${upstream.status}: ${text}`)
      return res.status(upstream.status).json({ error: `Upstream error: ${upstream.status}` })
    }

    const data    = await upstream.json()
    const content = data.choices?.[0]?.message?.content?.trim() ?? ''
    return res.json({ content })

  } catch (err) {
    console.error('[SmartGoals] /api/chat error:', err.message)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// ── SPA fallback — all other routes serve index.html ──────────────────────────

app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

// ── Start ──────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[SmartGoals] Server running on port ${PORT}`)
})
