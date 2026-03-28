import React, { useState, useRef, useEffect } from 'react'

// API key is held server-side in server.js — never sent to the browser

// ── Static mock data ──────────────────────────────────────────────────────────

const SIMILAR_STORES = [
  { id: '039', name: 'Lincoln Park', location: 'Chicago, IL', value: '$83,000' },
  { id: '047', name: 'Wicker Park',  location: 'Chicago, IL', value: '$88,000' },
  { id: '051', name: 'Hyde Park',    location: 'Chicago, IL', value: '$85,000' },
]

// ── Pill options per scope type ───────────────────────────────────────────────

const METRIC_PILLS = ['Revenue', 'Operating Cost', 'Footfall', 'Units Sold', 'Customer Satisfaction']

const SCOPE_TYPE_PILLS = ['Store', 'Department', 'Employee']

// Derived at runtime from appData — see getScopePills() inside the component

const ACTION_PILLS   = ['Use Recommended Target', 'Show Similar Stores', 'Set Custom Value']
const CONFIRM_PILLS  = ['Yes, confirm recommended target', 'Set Custom Value']

const SYSTEM_PROMPT = `You are GoalBot, an AI-powered goal assistant for retail store managers at SmartGoals.
You help managers set data-driven performance goals for Store #042 in Chicago, IL.

Available metrics: Revenue, Operating Cost, Footfall, Units Sold, Customer Satisfaction Score, Expense.
Scope options: entire store, a department (e.g. Electronics), or an employee/manager.

Historical data:
- Operating Cost: Jan $92,000 · Feb $89,500 · Mar $92,500 (avg $91,333) → recommend $86,766 (5% cut)
- Revenue: Jan $128,000 · Feb $122,500 · Mar $131,000 (avg $127,167) → recommend $133,525 (5% growth)
- Footfall: Jan 14,200 · Feb 13,800 · Mar 15,100 (avg 14,367) → recommend 15,085 (5% growth)
- Units Sold: Jan 6,400 · Feb 6,100 · Mar 6,820 (avg 6,440) → recommend 6,762 (5% growth)
- Customer Satisfaction: avg 4.2/5.0 → recommend 4.4/5.0
- Expense: avg $58,000 → recommend $55,100 (5% cut)

YOUR ROLE IS STRICTLY TO ASK QUESTIONS — NOT TO SET GOALS OR SHOW DATA.

The UI has buttons that handle all data display, recommendations, and goal confirmation.
You must NEVER:
- Say a goal has been set, saved, confirmed, or created
- Show historical data, averages, or recommended values
- Confirm or finalize anything

You must ONLY:
1. Ask which metric (if not provided)
2. Ask which scope type: store, department, or employee (if not provided)
3. If scope type is "department" but no specific department named, ask which one: Electronics, Apparel, Grocery, Home & Living, Sports, Beauty
4. Once metric and specific scope are clear, say "Great! Please use the buttons below to select your target and we'll show you the data and recommended value."

If the user says "yes", "ok", "proceed", "confirm", or anything affirmative WITHOUT having clicked a button yet, respond: "Please use the buttons below to select your specific target — that will trigger the data and recommendation for you."

Revenue, Operating Cost, and Footfall are store/department metrics only — not for individual employees. If asked for an employee, explain this and suggest Units Sold or Customer Satisfaction Score instead.

Be concise: 1-2 sentences max. Use **bold** for metric and scope names.`

// ── Intent detection ──────────────────────────────────────────────────────────

function detectIntent(text) {
  const lower = text.toLowerCase()

  const metricMap = [
    { keys: ['revenue'], value: 'Revenue' },
    { keys: ['operating cost', 'op cost'], value: 'Operating Cost' },
    { keys: ['footfall', 'foot fall', 'traffic', 'visitors'], value: 'Footfall' },
    { keys: ['units sold', 'units', 'sales volume'], value: 'Units Sold' },
    { keys: ['customer satisfaction', 'satisfaction score', 'csat'], value: 'Customer Satisfaction' },
    { keys: ['expense', 'expenses'], value: 'Expense' },
  ]
  const scopeMap = [
    { keys: ['employee', 'staff', 'associate', 'worker'], value: 'employee' },
    { keys: ['manager', 'sarah kim', 'sarah'], value: 'manager' },
    { keys: ['department', 'dept', 'electronics', 'apparel', 'grocery'], value: 'department' },
    { keys: ['store', 'entire store', 'whole store'], value: 'store' },
  ]

  let detectedMetric = null
  let detectedScope = null

  for (const { keys, value } of metricMap) {
    if (keys.some(k => lower.includes(k))) { detectedMetric = value; break }
  }
  for (const { keys, value } of scopeMap) {
    if (keys.some(k => lower.includes(k))) { detectedScope = value; break }
  }

  return { detectedMetric, detectedScope }
}

// ── OpenAI helper ─────────────────────────────────────────────────────────────

async function callOpenAI(history) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: history,
      system_prompt: SYSTEM_PROMPT,
      max_tokens: 200,
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

function fmtVal(metric, val) {
  const n = parseFloat(val)
  if (isNaN(n)) return val ?? '—'
  if (metric === 'Customer Satisfaction Score') return n.toFixed(2) + ' / 5.0'
  if (metric === 'Footfall' || metric === 'Units Sold') return n.toLocaleString()
  return '$' + n.toLocaleString()
}

function DataTable({ dataRow, metric }) {
  // dataRow comes from CSV; fall back to placeholder if not found
  const rows = dataRow
    ? [
        { label: 'Jan', value: fmtVal(metric, dataRow.jan), tag: 'historical' },
        { label: 'Feb', value: fmtVal(metric, dataRow.feb), tag: 'historical' },
        { label: 'Mar', value: fmtVal(metric, dataRow.mar), tag: 'historical' },
        { label: '3-Month Avg', value: fmtVal(metric, dataRow.avg_3m), tag: 'avg' },
        { label: 'Recommended Target', value: fmtVal(metric, dataRow.recommended_target), tag: 'recommended' },
      ]
    : [
        { label: 'Jan', value: '$92.0K', tag: 'historical' },
        { label: 'Feb', value: '$89.5K', tag: 'historical' },
        { label: 'Mar', value: '$92.5K', tag: 'historical' },
        { label: '3-Month Avg', value: '$91.3K', tag: 'avg' },
        { label: 'Recommended Target', value: '$86.7K', tag: 'recommended' },
      ]

  const title = dataRow
    ? `${dataRow.entity_name} · ${metric || 'Metric'} — Q1 2025`
    : 'Operating Cost — Q1 2025'

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden my-2 w-[300px]">
      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
      </div>
      {rows.map((row, i) => (
        <div key={i} className={`flex items-center justify-between px-4 py-2.5 ${i < rows.length - 1 ? 'border-b border-gray-50' : ''} ${row.tag === 'recommended' ? 'bg-teal-50' : ''}`}>
          <span className={`text-sm ${row.tag === 'recommended' ? 'font-semibold text-teal-700' : 'text-gray-600'}`}>{row.label}</span>
          <span className={`text-sm font-bold ${row.tag === 'recommended' ? 'text-teal-700' : row.tag === 'avg' ? 'text-gray-900' : 'text-gray-500'}`}>{row.value}</span>
        </div>
      ))}
    </div>
  )
}

function ComparisonTable() {
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden my-2">
      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Similar Stores Comparison</p>
      </div>
      {SIMILAR_STORES.map((store, i) => (
        <div key={store.id} className={`flex items-center gap-3 px-4 py-3 ${i < SIMILAR_STORES.length - 1 ? 'border-b border-gray-50' : ''}`}>
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">#{store.id}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 leading-tight">{store.name}</p>
            <p className="text-xs text-gray-400">{store.location}</p>
          </div>
          <span className="text-sm font-bold text-gray-900">{store.value}</span>
        </div>
      ))}
    </div>
  )
}

function SuccessBanner({ metric, entityName, value }) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 my-1">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">✓</div>
        <p className="text-sm font-bold text-emerald-800">Goal set successfully!</p>
      </div>
      <p className="text-sm text-emerald-700 leading-relaxed">
        <strong>{metric ?? 'Goal'}</strong> target of <strong>{value ?? '—'}</strong> is now active for <strong>{entityName ?? 'entity'}</strong> — March 2025.
      </p>
    </div>
  )
}

function TargetDropdown({ options, scopeType, disabled, onConfirm }) {
  const [selected, setSelected] = React.useState(options[0] ?? '')
  const label = { store: 'Select a store', department: 'Select a department', employee: 'Select an employee' }[scopeType] ?? 'Select target'

  return (
    <div className="ml-9 mt-1 mb-3 flex flex-col gap-2 max-w-[300px]">
      <p className="text-xs text-gray-500">{label}</p>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={disabled}
        className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 bg-white cursor-pointer transition-all disabled:opacity-50"
      >
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <button
        onClick={() => onConfirm(selected)}
        disabled={disabled}
        className="self-start text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-xl px-4 py-2 transition-colors disabled:opacity-40"
      >
        Confirm Selection
      </button>
    </div>
  )
}

function CustomValueInput({ metric, recommendedValue, onConfirm, onCancel }) {
  const [val, setVal] = React.useState('')
  const placeholder = recommendedValue ? `e.g. ${recommendedValue} (recommended)` : 'Enter a number'

  function handleConfirm() {
    const n = parseFloat(String(val).replace(/[^0-9.]/g, ''))
    if (isNaN(n) || n <= 0) return
    onConfirm(n)
  }

  return (
    <div className="ml-9 mt-1 mb-3 flex flex-col gap-2 max-w-[300px]">
      <p className="text-xs text-gray-500">Enter your custom target for <strong>{metric}</strong>:</p>
      <input
        type="number"
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder={placeholder}
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
        {msg.type === 'barchart' && <DataTable dataRow={msg.dataRow} metric={msg.metric} />}
        {msg.type === 'comparison' && (
          <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 w-[300px]"><ComparisonTable /></div>
        )}
        {msg.type === 'success' && <div className="w-[300px]"><SuccessBanner metric={msg.metric} entityName={msg.entityName} value={msg.value} /></div>}
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

// ── Main ChatPanel ────────────────────────────────────────────────────────────

const INITIAL_MESSAGES = [
  {
    role: 'bot',
    type: 'text',
    content: "Hi! I'm **GoalBot**, your AI-powered goal assistant. I'll help you set smart, data-backed performance targets for Store #042.\n\nWhich metric would you like to set a goal for this month?",
  },
]

// Map pill label → CSV metric name
const METRIC_PILL_TO_CSV = {
  'Revenue': 'Revenue',
  'Operating Cost': 'Operating Cost',
  'Footfall': 'Footfall',
  'Units Sold': 'Units Sold',
  'Customer Satisfaction': 'Customer Satisfaction Score',
  'Expense': 'Expense',
}

export default function ChatPanel({ onGoalCreated, appData }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [step, setStep] = useState(0)
  const [scopeType, setScopeType] = useState(null) // null | 'store' | 'department' | 'employee'
  const [selectedMetric, setSelectedMetric] = useState(null)   // CSV metric name
  const [selectedEntityId, setSelectedEntityId] = useState(null) // entity_id from CSV
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [pillsDisabled, setPillsDisabled] = useState(false)
  const [apiError, setApiError] = useState(null)
  const [customValueMode, setCustomValueMode] = useState(false)
  const bottomRef = useRef(null)
  const gptHistory = useRef([])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function getBotReply(userText, nextStep, injectVisuals = false, entityId = null, metricName = null) {
    // Show user message immediately — don't wait for API
    setMessages(prev => [...prev, { role: 'user', content: userText }])
    gptHistory.current.push({ role: 'user', content: userText })
    setIsLoading(true)
    setApiError(null)
    try {
      const reply = await callOpenAI(gptHistory.current)
      gptHistory.current.push({ role: 'assistant', content: reply })

      const newBotMsgs = [{ role: 'bot', type: 'text', content: reply }]
      if (injectVisuals) {
        if (nextStep === 2) {
          // Look up real CSV data row
          const eId = entityId ?? selectedEntityId
          const mName = metricName ?? selectedMetric
          const eType = scopeType ?? 'store'
          const dataRow = appData?.getMetricRow?.(eType, eId, mName) ?? null
          newBotMsgs.push({ role: 'bot', type: 'barchart', dataRow, metric: mName })
        }
        if (nextStep === 3) newBotMsgs.push({ role: 'bot', type: 'comparison' })
        if (nextStep === 4) {
          const eId2 = entityId ?? selectedEntityId
          const mName2 = metricName ?? selectedMetric
          const eType2 = scopeType ?? 'store'
          const row2 = appData?.getMetricRow?.(eType2, eId2, mName2) ?? null
          newBotMsgs.push({
            role: 'bot', type: 'success',
            metric: mName2,
            entityName: row2?.entity_name ?? eId2,
            value: row2 ? fmtVal(mName2, row2.recommended_target) : '—',
          })
        }
      }

      setMessages(prev => [...prev, ...newBotMsgs])
    } catch (err) {
      setApiError('Could not reach the chat service. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handlePillClick(pill) {
    if (pillsDisabled || isLoading) return
    setPillsDisabled(true)

    let nextStep = step

    if (step === 0) {
      // Metric selected → go to scope type selection
      nextStep = 1
      setSelectedMetric(METRIC_PILL_TO_CSV[pill] ?? pill)
    } else if (step === 1 && scopeType === null) {
      // Scope TYPE selected (Store / Department / Employee) → show specific options
      const type = pill.toLowerCase()
      setScopeType(type)
      await getBotReply(pill, 1, false)
      setPillsDisabled(false)
      return // stay at step 1, pills will update to show specific options
    } else if (step === 1 && scopeType !== null) {
      // Specific target selected — extract entity_id from pill
      // Pill format: "S001 — Downtown Flagship" or "Electronics" or "Sarah Kim — Store Manager"
      const entityId = pill.includes(' — ') ? pill.split(' — ')[0].trim() : pill
      setSelectedEntityId(entityId)
      nextStep = 2
      await getBotReply(pill, nextStep, true, entityId, selectedMetric)
      setStep(nextStep)
      setPillsDisabled(false)
      return
    } else if (step === 2) {
      if (pill === 'Set Custom Value') {
        // Show inline input — don't advance step yet
        setMessages(prev => [...prev, { role: 'user', content: pill }])
        gptHistory.current.push({ role: 'user', content: pill })
        setMessages(prev => [...prev, {
          role: 'bot', type: 'text',
          content: `Sure! What custom target value would you like to set for **${selectedMetric}**?`,
        }])
        setCustomValueMode(true)
        setPillsDisabled(false)
        return
      }
      nextStep = pill === 'Show Similar Stores' ? 3 : 4
    } else if (step === 3) {
      nextStep = 4
    }

    await getBotReply(pill, nextStep, true)
    setStep(nextStep)
    setPillsDisabled(false)

    if (nextStep === 4) {
      confirmGoal(null) // null = use recommended target from CSV
    }
  }

  function confirmGoal(customValue) {
    const eType = scopeType ?? 'store'
    const eId = selectedEntityId
    const mName = selectedMetric
    const dataRow = appData?.getMetricRow?.(eType, eId, mName) ?? null
    const recTarget = customValue ?? (dataRow ? parseFloat(dataRow.recommended_target) : null)
    const avg3m = dataRow ? parseFloat(dataRow.avg_3m) : null
    const changePct = recTarget && avg3m
      ? parseFloat((((recTarget - avg3m) / avg3m) * 100).toFixed(1))
      : 0
    const formattedValue = fmtVal(mName, recTarget)
    const entityName = dataRow?.entity_name ?? eId ?? 'Unknown'

    onGoalCreated({
      metric: mName ?? 'Goal',
      owner: entityName,
      currentValue: formattedValue,
      previousValue: dataRow ? fmtVal(mName, dataRow.avg_3m) : '—',
      changePercent: changePct,
      progress: 95,
      month: 'March 2025',
      entityType: eType,
      entityId: eId,
      csvMetric: mName,
    })

    // If custom value, update the recommended target in the data dashboard
    if (customValue !== null && appData?.updateMetricTarget) {
      appData.updateMetricTarget(eType, eId, mName, customValue)
    }

    return { formattedValue, entityName }
  }

  async function handleCustomValueConfirm(numericValue) {
    setCustomValueMode(false)
    const { formattedValue, entityName } = confirmGoal(numericValue)

    // Show user message + success banner
    setMessages(prev => [
      ...prev,
      { role: 'user', content: `My custom target: ${fmtVal(selectedMetric, numericValue)}` },
      {
        role: 'bot', type: 'success',
        metric: selectedMetric,
        entityName,
        value: formattedValue,
      },
    ])
    gptHistory.current.push({ role: 'user', content: `My custom target: ${fmtVal(selectedMetric, numericValue)}` })
    setStep(4)
  }

  async function handleSend(e) {
    e.preventDefault()
    const text = inputValue.trim()
    if (!text || isLoading) return
    setInputValue('')

    const { detectedMetric, detectedScope } = detectIntent(text)
    let nextStep = step

    if (step === 0 && detectedMetric) {
      nextStep = 1
      if (detectedScope) setScopeType(detectedScope)
    } else if (step === 1 && detectedScope && scopeType === null) {
      // User typed their scope type in free text
      setScopeType(detectedScope)
    }

    await getBotReply(text, nextStep)
    setStep(nextStep)
  }

  // Build scope option lists from live appData
  function getScopePills(type) {
    if (!appData) return []
    if (type === 'store')
      return (appData.stores ?? []).map(s => `${s.store_id} — ${s.name}`)
    if (type === 'department')
      return (appData.departments ?? []).map(d => d.name)
    if (type === 'employee')
      return (appData.employees ?? []).map(e => `${e.employee_id} — ${e.name}`)
    return []
  }

  // Compute pills dynamically based on step and detected scope
  function getCurrentPills() {
    if (step === 0) return METRIC_PILLS
    if (step === 1) {
      if (scopeType === null) return SCOPE_TYPE_PILLS
      return getScopePills(scopeType)
    }
    if (step === 2) return ACTION_PILLS
    if (step === 3) return CONFIRM_PILLS
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
          <p className="text-[11px] text-gray-400">AI-Powered · GPT-4o-mini</p>
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

        {/* Dropdown for specific store/dept/employee selection */}
        {!isLoading && step === 1 && scopeType !== null && (
          <TargetDropdown
            options={getScopePills(scopeType)}
            scopeType={scopeType}
            disabled={pillsDisabled}
            onConfirm={(selected) => handlePillClick(selected)}
          />
        )}

        {/* Custom value input — shown after "Set Custom Value" is clicked */}
        {!isLoading && customValueMode && step === 2 && (
          <CustomValueInput
            metric={selectedMetric}
            recommendedValue={(() => {
              const row = appData?.getMetricRow?.(scopeType ?? 'store', selectedEntityId, selectedMetric)
              return row ? fmtVal(selectedMetric, row.recommended_target) : null
            })()}
            onConfirm={handleCustomValueConfirm}
            onCancel={() => setCustomValueMode(false)}
          />
        )}

        {/* Pill buttons for metric, scope type, and action steps */}
        {!isLoading && !(step === 1 && scopeType !== null) && !customValueMode && currentPills.length > 0 && (
          <div className="flex flex-wrap gap-2 ml-9 mt-1 mb-3">
            {currentPills.map((pill) => (
              <PillButton key={pill} label={pill} onClick={() => handlePillClick(pill)} disabled={pillsDisabled || isLoading} />
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-gray-100 bg-white px-4 py-3">
        {apiError && <p className="text-[11px] text-red-500 text-center mb-1">{apiError}</p>}
        <p className="text-[11px] text-gray-400 text-center mb-2">Goal will be previewed on the left as you configure it</p>
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isLoading ? 'GoalBot is thinking...' : 'Type a message...'}
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
