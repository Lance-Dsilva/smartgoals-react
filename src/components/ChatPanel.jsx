import React, { useState, useRef, useEffect } from 'react'

// ── CSV loader ────────────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = line.split(',').map(v => v.trim())
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}

// ── Category → metric config ──────────────────────────────────────────────────

const CATEGORY_PILLS = ['Service', 'Body', 'Parts']

const CATEGORY_METRICS = {
  Service: [
    { label: 'Service Sales',          field: 'service_sales',         type: 'dollar' },
    { label: 'Service Gross Profit',   field: 'service_gross_profit',  type: 'dollar' },
    { label: 'Service GP %',           field: 'service_gp_pct',        type: 'pct'    },
  ],
  Body: [
    { label: 'Body Sales',             field: 'body_sales',            type: 'dollar' },
    { label: 'Body Gross Profit',      field: 'body_gross_profit',     type: 'dollar' },
    { label: 'Body GP %',              field: 'body_gp_pct',           type: 'pct'    },
  ],
  Parts: [
    { label: 'Parts Sales',            field: 'parts_sales',           type: 'dollar' },
    { label: 'Parts Gross Profit',     field: 'parts_gross_profit',    type: 'dollar' },
    { label: 'Parts GP %',             field: 'parts_gp_pct',          type: 'pct'    },
  ],
}

const MONTH_PILLS = ['2026-04-01', '2026-05-01', '2026-06-01']

// Convert "2026-04-01" → "April 2026"
function fmtMonth(dateStr) {
  if (!dateStr) return dateStr
  const [year, month] = dateStr.split('-')
  const name = new Date(parseInt(year), parseInt(month) - 1, 1)
    .toLocaleString('default', { month: 'long' })
  return `${name} ${year}`
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtVal(type, val) {
  const n = parseFloat(val)
  if (isNaN(n)) return '—'
  if (type === 'pct') return n.toFixed(1) + '%'
  return '$' + Math.round(n).toLocaleString()
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are GoalBot, an AI-powered Fixed Ops goal assistant for automotive dealership managers.
You help managers set performance goals for Fixed Operations metrics: Service, Body, and Parts.

Available categories and metrics:
- Service: Service Sales, Service Gross Profit, Service GP %
- Body: Body Sales, Body Gross Profit, Body GP %
- Parts: Parts Sales, Parts Gross Profit, Parts GP %

Prediction months available: March 2026, April 2026, May 2026.

YOUR ROLE IS STRICTLY TO ASK CLARIFYING QUESTIONS — NOT TO SET GOALS OR SHOW DATA.
The UI has buttons that handle all data display, predictions, and goal confirmation.

You must NEVER:
- Say a goal has been set, saved, confirmed, or created
- Show prediction values or raw data
- Confirm or finalize anything

You must ONLY:
1. Ask which enterprise they are working with (if not selected via button)
2. Ask which store (if not selected)
3. Ask which category: Service, Body, or Parts (if not provided)
4. Ask which specific metric within the category (e.g. "Body Gross Profit")
5. Ask which prediction month: March 2026, April 2026, or May 2026
6. Once all are clear: "Great! Please use the buttons below to view the prediction and confirm your goal."

Be concise: 1-2 sentences max. Use **bold** for metric and category names.`

// ── OpenAI helper ─────────────────────────────────────────────────────────────

async function callOpenAI(history) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: history,
      system_prompt: SYSTEM_PROMPT,
      max_tokens: 150,
    }),
  })
  if (!res.ok) throw new Error(`Server error ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.content
}

// ── UI sub-components ─────────────────────────────────────────────────────────

function Bold({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
    }
    return part.split('\n').map((line, j, arr) => (
      <React.Fragment key={`${i}-${j}`}>
        {line}
        {j < arr.length - 1 && <br />}
      </React.Fragment>
    ))
  })
}

function PredictionCard({ enterpriseId, storeId, metricConfig, month, data }) {
  if (!data || !metricConfig || !month) return null

  const row = data.find(r =>
    r.enterprise_id === enterpriseId &&
    r.store_id === storeId &&
    r.prediction_month === month
  )

  if (!row) return (
    <div className="border border-amber-100 rounded-xl p-3 my-2 bg-amber-50 w-[300px]">
      <p className="text-xs text-amber-700">No prediction data found for {storeId} · {month}</p>
    </div>
  )

  const val = fmtVal(metricConfig.type, row[metricConfig.field])

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden my-2 w-[300px]">
      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
          {enterpriseId} · {storeId} · {metricConfig.label}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">{fmtMonth(month)} Prediction</p>
      </div>
      <div className="px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-gray-600">Predicted Value</span>
        <span className="text-base font-bold text-teal-700">{val}</span>
      </div>
      <div className="px-4 py-2 border-t border-gray-50 flex items-center gap-2">
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
          row.confidence === 'High' ? 'bg-emerald-50 text-emerald-700' :
          row.confidence === 'Medium' ? 'bg-amber-50 text-amber-700' :
          'bg-red-50 text-red-600'
        }`}>{row.confidence} Confidence</span>
        <span className="text-[11px] text-gray-400">{row.store_size} Store</span>
      </div>
    </div>
  )
}

function SimilarStoresCard({ enterpriseId, storeId, metricConfig, month, data }) {
  if (!data || !metricConfig || !month) return null

  // Find the current store's size to match similar stores
  const currentRow = data.find(r => r.enterprise_id === enterpriseId && r.store_id === storeId && r.prediction_month === month)
  const storeSize = currentRow?.store_size

  // Get all stores of the same size across all enterprises, excluding the current store
  const similarRows = data
    .filter(r =>
      r.prediction_month === month &&
      r.store_id !== storeId &&
      r.store_size === storeSize
    )
    .map(r => ({
      enterpriseId: r.enterprise_id,
      storeId: r.store_id,
      storeSize: r.store_size,
      confidence: r.confidence,
      value: parseFloat(r[metricConfig.field]),
    }))
    .filter(r => !isNaN(r.value))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  if (similarRows.length === 0) return (
    <div className="border border-amber-100 rounded-xl p-3 my-2 bg-amber-50 w-[340px]">
      <p className="text-xs text-amber-700">No similar stores found for {storeSize} size in {month}.</p>
    </div>
  )

  const currentVal = currentRow ? parseFloat(currentRow[metricConfig.field]) : null

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden my-2 w-[340px]">
      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
          Similar {storeSize} Stores · {metricConfig.label}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">{fmtMonth(month)} · sorted by predicted value</p>
      </div>

      {/* Header row */}
      <div className="grid bg-gray-50 border-b border-gray-100" style={{ gridTemplateColumns: '1fr 1fr 1.2fr 0.8fr' }}>
        <div className="px-3 py-1.5 text-[9px] font-semibold text-gray-400 uppercase tracking-wide">Group</div>
        <div className="px-3 py-1.5 text-[9px] font-semibold text-gray-400 uppercase tracking-wide">Location</div>
        <div className="px-3 py-1.5 text-[9px] font-semibold text-gray-400 uppercase tracking-wide text-right">Predicted</div>
        <div className="px-3 py-1.5 text-[9px] font-semibold text-gray-400 uppercase tracking-wide text-right">Conf.</div>
      </div>

      {/* Current store row */}
      {currentRow && (
        <div className="grid items-center bg-teal-50 border-b border-teal-100" style={{ gridTemplateColumns: '1fr 1fr 1.2fr 0.8fr' }}>
          <div className="px-3 py-2 text-xs font-medium text-teal-700">{enterpriseId}</div>
          <div className="px-3 py-2 text-xs font-bold text-teal-800 flex items-center gap-1">
            {storeId}
            <span className="text-[9px] bg-teal-200 text-teal-800 px-1 rounded font-semibold">YOU</span>
          </div>
          <div className="px-3 py-2 text-xs font-bold text-teal-700 text-right tabular-nums">
            {fmtVal(metricConfig.type, currentVal)}
          </div>
          <div className="px-3 py-2 text-right">
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
              currentRow.confidence === 'High' ? 'bg-emerald-100 text-emerald-700' :
              currentRow.confidence === 'Medium' ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-600'
            }`}>{currentRow.confidence}</span>
          </div>
        </div>
      )}

      {/* Similar store rows */}
      {similarRows.map((r, i) => {
        const isAbove = currentVal !== null && r.value > currentVal
        const anonEnterprise = `Enterprise ${String.fromCharCode(65 + i)}`
        const anonStore = `Store ${i + 1}`
        return (
          <div key={r.storeId} className={`grid items-center border-b border-gray-50 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'}`}
            style={{ gridTemplateColumns: '1fr 1fr 1.2fr 0.8fr' }}>
            <div className="px-3 py-2 text-xs text-gray-400 italic">{anonEnterprise}</div>
            <div className="px-3 py-2 text-xs font-medium text-gray-500 italic">{anonStore}</div>
            <div className="px-3 py-2 text-xs font-semibold text-gray-800 text-right tabular-nums flex items-center justify-end gap-1">
              {currentVal !== null && (
                <span className={`text-[9px] ${isAbove ? 'text-emerald-500' : 'text-red-400'}`}>
                  {isAbove ? '↑' : '↓'}
                </span>
              )}
              {fmtVal(metricConfig.type, r.value)}
            </div>
            <div className="px-3 py-2 text-right">
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                r.confidence === 'High' ? 'bg-emerald-100 text-emerald-700' :
                r.confidence === 'Medium' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-600'
              }`}>{r.confidence}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SuccessBanner({ metric, storeId, month, value }) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 my-1 w-[300px]">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">✓</div>
        <p className="text-sm font-bold text-emerald-800">Goal set successfully!</p>
      </div>
      <p className="text-sm text-emerald-700 leading-relaxed">
        <strong>{metric}</strong> target of <strong>{value}</strong> is now active for <strong>{storeId}</strong> — {fmtMonth(month)}.
      </p>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>G</div>
      <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

function BotMessage({ msg }) {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>G</div>
      <div className="max-w-[85%]">
        {msg.type === 'text' && (
          <div className="bg-gray-100 text-gray-700 text-sm rounded-2xl rounded-bl-sm px-4 py-3 leading-relaxed">
            <Bold text={msg.content} />
          </div>
        )}
        {msg.type === 'prediction' && (
          <PredictionCard
            enterpriseId={msg.enterpriseId}
            storeId={msg.storeId}
            metricConfig={msg.metricConfig}
            month={msg.month}
            data={msg.data}
          />
        )}
        {msg.type === 'similar' && (
          <SimilarStoresCard
            enterpriseId={msg.enterpriseId}
            storeId={msg.storeId}
            metricConfig={msg.metricConfig}
            month={msg.month}
            data={msg.data}
          />
        )}
        {msg.type === 'success' && (
          <SuccessBanner
            metric={msg.metric}
            storeId={msg.storeId}
            month={msg.month}
            value={msg.value}
          />
        )}
      </div>
    </div>
  )
}

function UserMessage({ content }) {
  return (
    <div className="flex justify-end mb-3">
      <div className="max-w-[75%] bg-slate-800 text-white text-sm rounded-2xl rounded-br-sm px-4 py-3 leading-relaxed">
        {content}
      </div>
    </div>
  )
}

function PillButton({ label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 border border-gray-200 rounded-full px-4 py-1.5 text-sm font-medium text-gray-700 hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
    >
      {label}
    </button>
  )
}

function CustomValueInput({ metricConfig, predictedValue, onConfirm, onCancel }) {
  const [val, setVal] = React.useState('')

  function handleConfirm() {
    const n = parseFloat(String(val).replace(/[^0-9.]/g, ''))
    if (isNaN(n) || n <= 0) return
    onConfirm(n)
  }

  return (
    <div className="ml-9 mt-1 mb-3 flex flex-col gap-2 max-w-[300px]">
      <p className="text-xs text-gray-500">Enter your custom target for <strong>{metricConfig?.label}</strong>:</p>
      <input
        type="number"
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder={predictedValue ? `e.g. ${predictedValue} (predicted)` : 'Enter a number'}
        className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 transition-all"
        onKeyDown={e => e.key === 'Enter' && handleConfirm()}
        autoFocus
      />
      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={!val}
          className="flex-1 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-xl px-4 py-2 transition-colors disabled:opacity-40"
        >
          Confirm Value
        </button>
        <button
          onClick={onCancel}
          className="text-sm font-medium text-gray-500 border border-gray-200 rounded-xl px-4 py-2 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Steps ─────────────────────────────────────────────────────────────────────
// 0 = enterprise, 1 = store, 2 = category, 3 = metric, 4 = month, 5 = confirm, 6 = done

const INITIAL_MESSAGES = [
  {
    role: 'bot',
    type: 'text',
    content: "Hi! I'm **GoalBot**, your Fixed Ops goal assistant.\n\nLet's start — which **Enterprise** would you like to set a goal for?",
  },
]

export default function ChatPanel({ onGoalCreated }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [step, setStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [pillsDisabled, setPillsDisabled] = useState(false)
  const [apiError, setApiError] = useState(null)
  const [customValueMode, setCustomValueMode] = useState(false)
  const [inputValue, setInputValue] = useState('')

  // Selections
  const [selectedEnterprise, setSelectedEnterprise] = useState(null)
  const [selectedStore, setSelectedStore] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null) // 'Service'|'Body'|'Parts'
  const [selectedMetricConfig, setSelectedMetricConfig] = useState(null) // { label, field, type }
  const [selectedMonth, setSelectedMonth] = useState(null)

  // Fixed ops data (data.csv)
  const [fixedOpsData, setFixedOpsData] = useState([])

  const bottomRef = useRef(null)
  const gptHistory = useRef([])

  useEffect(() => {
    fetch('/data/data.csv')
      .then(r => r.text())
      .then(text => setFixedOpsData(parseCSV(text)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Derived options
  const enterprises = [...new Set(fixedOpsData.map(r => r.enterprise_id))].sort()
  const storesForEnterprise = selectedEnterprise
    ? [...new Set(fixedOpsData.filter(r => r.enterprise_id === selectedEnterprise).map(r => r.store_id))].sort()
    : []

  async function getBotReply(userText) {
    gptHistory.current.push({ role: 'user', content: userText })
    setIsLoading(true)
    setApiError(null)
    try {
      const reply = await callOpenAI(gptHistory.current)
      gptHistory.current.push({ role: 'assistant', content: reply })
      setMessages(prev => [...prev, { role: 'bot', type: 'text', content: reply }])
    } catch {
      setApiError('Could not reach the chat service. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  function addUserMessage(text) {
    setMessages(prev => [...prev, { role: 'user', content: text }])
  }

  function addBotMessage(msg) {
    setMessages(prev => [...prev, { role: 'bot', ...msg }])
  }

  async function handlePillClick(pill) {
    if (pillsDisabled || isLoading) return
    setPillsDisabled(true)
    addUserMessage(pill)

    if (step === 0) {
      // Enterprise selected
      setSelectedEnterprise(pill)
      setStep(1)
      addBotMessage({ type: 'text', content: `Got it — **${pill}**. Which store would you like to set a goal for?` })
      gptHistory.current.push({ role: 'user', content: pill })
      gptHistory.current.push({ role: 'assistant', content: `Got it — ${pill}. Which store would you like to set a goal for?` })

    } else if (step === 1) {
      // Store selected
      setSelectedStore(pill)
      setStep(2)
      addBotMessage({ type: 'text', content: `Great! Which **category** would you like to set a goal for — **Service**, **Body**, or **Parts**?` })
      gptHistory.current.push({ role: 'user', content: pill })
      gptHistory.current.push({ role: 'assistant', content: `Great! Which category would you like to set a goal for — Service, Body, or Parts?` })

    } else if (step === 2) {
      // Category selected
      setSelectedCategory(pill)
      setStep(3)
      const metrics = CATEGORY_METRICS[pill]
      const metricNames = metrics.map(m => `**${m.label}**`).join(', ')
      addBotMessage({ type: 'text', content: `Which **${pill}** metric? Choose from: ${metricNames}.` })
      gptHistory.current.push({ role: 'user', content: pill })
      gptHistory.current.push({ role: 'assistant', content: `Which ${pill} metric would you like to track?` })

    } else if (step === 3) {
      // Metric selected
      const category = selectedCategory
      const metricConfig = CATEGORY_METRICS[category]?.find(m => m.label === pill)
      setSelectedMetricConfig(metricConfig)
      setStep(4)
      addBotMessage({ type: 'text', content: `Which **prediction month** would you like to set the goal for?` })
      gptHistory.current.push({ role: 'user', content: pill })
      gptHistory.current.push({ role: 'assistant', content: 'Which prediction month would you like to use?' })

    } else if (step === 4) {
      // Month selected
      setSelectedMonth(pill)
      setStep(5)
      // Show prediction card
      addBotMessage({
        type: 'prediction',
        enterpriseId: selectedEnterprise,
        storeId: selectedStore,
        metricConfig: selectedMetricConfig,
        month: pill,
        data: fixedOpsData,
      })
      addBotMessage({
        type: 'text',
        content: `Here's the prediction for **${selectedMetricConfig?.label}** in **${fmtMonth(pill)}**. Would you like to use this as your goal, or set a custom value?`,
      })
      gptHistory.current.push({ role: 'user', content: fmtMonth(pill) })
      gptHistory.current.push({ role: 'assistant', content: `Here's the prediction. Would you like to use it or set a custom value?` })

    } else if (step === 5) {
      if (pill === 'Show Similar Stores') {
        addBotMessage({
          type: 'similar',
          enterpriseId: selectedEnterprise,
          storeId: selectedStore,
          metricConfig: selectedMetricConfig,
          month: selectedMonth,
          data: fixedOpsData,
        })
        addBotMessage({
          type: 'text',
          content: `Here are similar-sized stores and their **${selectedMetricConfig?.label}** predictions for **${fmtMonth(selectedMonth)}**. Ready to set your goal?`,
        })
        gptHistory.current.push({ role: 'user', content: pill })
        gptHistory.current.push({ role: 'assistant', content: `Here are similar stores. Ready to set your goal?` })
        // stay at step 5 so confirm pills remain

      } else if (pill === 'Set Custom Value') {
        addBotMessage({ type: 'text', content: `Sure! Enter your custom target for **${selectedMetricConfig?.label}**:` })
        setCustomValueMode(true)
        gptHistory.current.push({ role: 'user', content: pill })

      } else if (pill === 'Use Predicted Value') {
        // Find prediction value
        const row = fixedOpsData.find(r =>
          r.enterprise_id === selectedEnterprise &&
          r.store_id === selectedStore &&
          r.prediction_month === selectedMonth
        )
        const predictedVal = row ? parseFloat(row[selectedMetricConfig.field]) : null
        confirmGoal(predictedVal)
      }
    }

    setPillsDisabled(false)
  }

  function confirmGoal(value) {
    const formatted = fmtVal(selectedMetricConfig?.type, value)

    // Find previous month's value for comparison
    const prevMonthMap = {
      '2026-05-01': '2026-04-01',
      '2026-06-01': '2026-05-01',
    }
    const prevMonth = prevMonthMap[selectedMonth] ?? null
    const prevRow = prevMonth
      ? fixedOpsData.find(r =>
          r.enterprise_id === selectedEnterprise &&
          r.store_id === selectedStore &&
          r.prediction_month === prevMonth
        )
      : null
    const prevRaw = prevRow ? parseFloat(prevRow[selectedMetricConfig?.field]) : null
    const prevFormatted = prevRaw != null ? fmtVal(selectedMetricConfig?.type, prevRaw) : '—'
    const changePct = (value != null && prevRaw != null && prevRaw !== 0)
      ? parseFloat((((value - prevRaw) / prevRaw) * 100).toFixed(1))
      : 0

    addBotMessage({
      type: 'success',
      metric: selectedMetricConfig?.label,
      storeId: selectedStore,
      month: selectedMonth,
      value: formatted,
    })
    setStep(6)
    onGoalCreated({
      metric: selectedMetricConfig?.label ?? 'Goal',
      owner: `${selectedEnterprise} — ${selectedStore}`,
      currentValue: formatted,
      previousValue: prevFormatted,
      changePercent: changePct,
      progress: 80,
      month: fmtMonth(selectedMonth),
    })
  }

  async function handleCustomValueConfirm(numericValue) {
    setCustomValueMode(false)
    confirmGoal(numericValue)
    gptHistory.current.push({ role: 'user', content: `Custom target: ${fmtVal(selectedMetricConfig?.type, numericValue)}` })
  }

  async function handleSend(e) {
    e.preventDefault()
    const text = inputValue.trim()
    if (!text || isLoading) return
    setInputValue('')

    // If typed text matches a current pill exactly (case-insensitive), treat it like a pill click
    const matched = getCurrentPills().find(p => p.toLowerCase() === text.toLowerCase())
    if (matched) {
      await handlePillClick(matched)
      return
    }

    // For step 2 (category), also match partial text like "service" → "Service"
    if (step === 2) {
      const catMatch = CATEGORY_PILLS.find(c => text.toLowerCase().includes(c.toLowerCase()))
      if (catMatch) { await handlePillClick(catMatch); return }
    }

    // For step 3 (metric), partial match
    if (step === 3 && selectedCategory) {
      const metricMatch = CATEGORY_METRICS[selectedCategory]?.find(m =>
        text.toLowerCase().includes(m.label.toLowerCase().split(' ')[0])
      )
      if (metricMatch) { await handlePillClick(metricMatch.label); return }
    }

    addUserMessage(text)
    await getBotReply(text)
  }

  function getCurrentPills() {
    if (step === 0) return enterprises.length > 0 ? enterprises : []
    if (step === 1) return storesForEnterprise
    if (step === 2) return CATEGORY_PILLS
    if (step === 3) return selectedCategory ? CATEGORY_METRICS[selectedCategory].map(m => m.label) : []
    if (step === 4) return MONTH_PILLS
    if (step === 5) return ['Use Predicted Value', 'Show Similar Stores', 'Set Custom Value']
    return []
  }

  const currentPills = getCurrentPills()
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-white">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0 relative"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          G
          <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            GoalBot
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          </p>
          <p className="text-[11px] text-gray-400">Fixed Ops Goal Assistant · GPT-4o-mini</p>
        </div>
        {apiError && (
          <span className="text-[11px] text-red-500 bg-red-50 border border-red-200 rounded-full px-2.5 py-1">⚠ API error</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {messages.map((msg, i) =>
          msg.role === 'bot'
            ? <BotMessage key={i} msg={msg} />
            : <UserMessage key={i} content={msg.content} />
        )}

        {isLoading && <TypingIndicator />}

        {/* Custom value input */}
        {!isLoading && customValueMode && step === 5 && (
          <CustomValueInput
            metricConfig={selectedMetricConfig}
            predictedValue={(() => {
              const row = fixedOpsData.find(r =>
                r.enterprise_id === selectedEnterprise &&
                r.store_id === selectedStore &&
                r.prediction_month === selectedMonth
              )
              return row ? fmtVal(selectedMetricConfig?.type, row[selectedMetricConfig?.field]) : null
            })()}
            onConfirm={handleCustomValueConfirm}
            onCancel={() => setCustomValueMode(false)}
          />
        )}

        {/* Enterprise dropdown (step 0) */}
        {!isLoading && !customValueMode && step === 0 && enterprises.length > 0 && (
          <div className="ml-9 mt-1 mb-3 max-w-[260px]">
            <select
              defaultValue=""
              disabled={pillsDisabled}
              onChange={e => { if (e.target.value) handlePillClick(e.target.value) }}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 bg-white cursor-pointer transition-all disabled:opacity-50"
            >
              <option value="" disabled>Select Enterprise ID...</option>
              {enterprises.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        )}

        {/* Store dropdown (step 1) */}
        {!isLoading && !customValueMode && step === 1 && storesForEnterprise.length > 0 && (
          <div className="ml-9 mt-1 mb-3 max-w-[260px]">
            <select
              defaultValue=""
              disabled={pillsDisabled}
              onChange={e => { if (e.target.value) handlePillClick(e.target.value) }}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 bg-white cursor-pointer transition-all disabled:opacity-50"
            >
              <option value="" disabled>Select Store ID...</option>
              {storesForEnterprise.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        {/* Pill buttons (steps 2–5) */}
        {!isLoading && !customValueMode && step >= 2 && currentPills.length > 0 && step < 6 && (
          <div className="flex flex-wrap gap-2 ml-9 mt-1 mb-3">
            {currentPills.map(pill => (
              <PillButton
                key={pill}
                label={step === 4 ? fmtMonth(pill) : pill}
                onClick={() => handlePillClick(pill)}
                disabled={pillsDisabled || isLoading}
              />
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-gray-100 bg-white px-4 py-3">
        {apiError && <p className="text-[11px] text-red-500 text-center mb-1">{apiError}</p>}
        <p className="text-[11px] text-gray-400 text-center mb-2">
          {step < 6 ? 'Use buttons above to navigate · or type a question' : 'Goal created! Check Active Goals on the left'}
        </p>
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder={isLoading ? 'GoalBot is thinking...' : 'Ask a question...'}
            disabled={isLoading}
            className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-full px-4 py-2 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 transition-all placeholder:text-gray-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="w-9 h-9 bg-teal-600 hover:bg-teal-700 rounded-full flex items-center justify-center transition-colors flex-shrink-0 disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
