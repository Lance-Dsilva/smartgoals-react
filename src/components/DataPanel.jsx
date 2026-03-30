import React, { useState, useEffect, useMemo } from 'react'

function parseCSV(text) {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = line.split(',').map(v => v.trim())
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}

function fmt$(val) {
  const n = parseFloat(val)
  if (isNaN(n)) return '—'
  return '$' + Math.round(n).toLocaleString()
}

function fmtPct(val) {
  const n = parseFloat(val)
  if (isNaN(n)) return '—'
  return n.toFixed(1) + '%'
}

function changeBadge(cur, prev) {
  if (!cur || !prev) return null
  const diff = ((cur - prev) / Math.abs(prev)) * 100
  const positive = diff >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full text-white ${positive ? 'bg-emerald-500' : 'bg-red-500'}`}>
      {positive ? '↑' : '↓'} {Math.abs(diff).toFixed(1)}%
    </span>
  )
}

function pctChangeBadge(cur, prev) {
  if (cur == null || prev == null) return null
  const diff = cur - prev
  const positive = diff >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full text-white ${positive ? 'bg-emerald-500' : 'bg-red-500'}`}>
      {positive ? '+' : ''}{diff.toFixed(1)} pt
    </span>
  )
}

// Metrics rows config
const NET_SUMMARY_METRICS = [
  { label: 'Fixed Operating Profit', field: 'fixed_operating_profit', type: 'dollar' },
  { label: 'Net to Gross (%)', field: 'net_to_gross_pct', type: 'pct' },
]

const FIXED_OPS_METRICS = [
  { label: 'Service Sales', field: 'service_sales', type: 'dollar', bold: false },
  { label: 'Body Sales', field: 'body_sales', type: 'dollar', bold: false },
  { label: 'Parts Sales', field: 'parts_sales', type: 'dollar', bold: false },
  { label: 'Fixed Sales', field: 'fixed_sales', type: 'dollar', bold: true },
  { label: 'Service Gross Profit', field: 'service_gross_profit', type: 'dollar', bold: false },
  { label: 'Body Gross Profit', field: 'body_gross_profit', type: 'dollar', bold: false },
  { label: 'Parts Gross Profit', field: 'parts_gross_profit', type: 'dollar', bold: false },
  { label: 'Fixed Gross Profit ($)', field: 'fixed_gross_profit', type: 'dollar', bold: true },
  { label: 'Service Gross Profit (%)', field: 'service_gp_pct', type: 'pct', bold: false },
  { label: 'Body Gross Profit (%)', field: 'body_gp_pct', type: 'pct', bold: false },
  { label: 'Parts Gross Profit (%)', field: 'parts_gp_pct', type: 'pct', bold: false },
  { label: 'Fixed Gross Profit (%)', field: 'fixed_gp_pct', type: 'pct', bold: true },
]

function MetricRow({ metric, marRow, aprRow, mayRow }) {
  function getVal(row) {
    if (!row) return null
    const v = parseFloat(row[metric.field])
    return isNaN(v) ? null : v
  }

  const marVal = getVal(marRow)
  const aprVal = getVal(aprRow)
  const mayVal = getVal(mayRow)

  function display(val) {
    if (val == null) return <span className="text-gray-300">—</span>
    if (metric.type === 'dollar') return <span className={metric.bold ? 'font-bold text-gray-900' : 'text-gray-700'}>{fmt$(val)}</span>
    return <span className={metric.bold ? 'font-bold text-gray-900' : 'text-gray-700'}>{fmtPct(val)}</span>
  }

  function badge(cur, prev) {
    if (cur == null || prev == null) return <span className="text-gray-200 text-xs">—</span>
    if (metric.type === 'pct') return pctChangeBadge(cur, prev)
    return changeBadge(cur, prev)
  }

  const rowBg = metric.bold ? 'bg-gray-50' : ''

  return (
    <div className={`grid items-center border-b border-gray-50 last:border-0 hover:bg-slate-50/50 transition-colors ${rowBg}`}
      style={{ gridTemplateColumns: '2.2fr 1fr 1fr 1fr 1fr 1fr' }}>
      {/* Metric name */}
      <div className={`px-4 py-2.5 text-sm ${metric.bold ? 'font-bold text-gray-900' : 'text-gray-700'} flex items-center gap-2`}>
        {metric.bold ? null : (
          <svg width="7" height="11" viewBox="0 0 8 12" fill="none" className="text-gray-300 flex-shrink-0">
            <path d="M1 1l6 5-6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        {metric.label}
      </div>
      {/* March */}
      <div className="px-3 py-2.5 text-right tabular-nums">{display(marVal)}</div>
      {/* April */}
      <div className="px-3 py-2.5 text-right tabular-nums">{display(aprVal)}</div>
      {/* Apr vs Mar */}
      <div className="px-3 py-2.5 text-right">{badge(aprVal, marVal)}</div>
      {/* May */}
      <div className="px-3 py-2.5 text-right tabular-nums">{display(mayVal)}</div>
      {/* May vs Apr */}
      <div className="px-3 py-2.5 text-right">{badge(mayVal, aprVal)}</div>
    </div>
  )
}

function TableHeader() {
  return (
    <div className="grid bg-[#4a5568] text-white rounded-t-xl overflow-hidden"
      style={{ gridTemplateColumns: '2.2fr 1fr 1fr 1fr 1fr 1fr' }}>
      <div className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider">Metric</div>
      <div className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-right">March 2026</div>
      <div className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-right">April 2026 Projection</div>
      <div className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-right">Apr vs Mar</div>
      <div className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-right">May 2026 Projection</div>
      <div className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-right">May vs Apr</div>
    </div>
  )
}

export default function DataPanel() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedEnterprise, setSelectedEnterprise] = useState('')
  const [selectedStore, setSelectedStore] = useState('')

  useEffect(() => {
    fetch('/data/data.csv')
      .then(r => r.text())
      .then(text => { setData(parseCSV(text)); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  // Derive unique enterprise IDs
  const enterprises = useMemo(() => [...new Set(data.map(r => r.enterprise_id))].sort(), [data])

  // Derive stores for selected enterprise
  const storesForEnterprise = useMemo(() => {
    if (!selectedEnterprise) return []
    return [...new Set(data.filter(r => r.enterprise_id === selectedEnterprise).map(r => r.store_id))].sort()
  }, [data, selectedEnterprise])

  // Reset store when enterprise changes
  function handleEnterpriseChange(val) {
    setSelectedEnterprise(val)
    setSelectedStore('')
  }

  // Rows for selected enterprise + store, keyed by month
  const rowByMonth = useMemo(() => {
    if (!selectedEnterprise || !selectedStore) return {}
    const filtered = data.filter(r => r.enterprise_id === selectedEnterprise && r.store_id === selectedStore)
    const map = {}
    for (const r of filtered) map[r.prediction_month] = r
    return map
  }, [data, selectedEnterprise, selectedStore])

  const marRow = rowByMonth['March 2026'] ?? null
  const aprRow = rowByMonth['April 2026'] ?? null
  const mayRow = rowByMonth['May 2026'] ?? null
  const storeInfo = marRow ?? aprRow ?? mayRow

  const hasData = selectedEnterprise && selectedStore && (marRow || aprRow || mayRow)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Loading Fixed Ops data...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400 text-sm">
        Error loading data.csv: {error}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <div>
          <h1 className="text-base font-bold text-gray-900">Fixed Summary</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">Fixed Ops predictions · March – May 2026</p>
        </div>
        {storeInfo && (
          <div className="flex items-center gap-3">
            <span className="text-[11px] bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
              {storeInfo.store_size} Store
            </span>
            <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${storeInfo.has_body_shop === '1' || storeInfo.has_body_shop === '1.0' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
              {storeInfo.has_body_shop === '1' || storeInfo.has_body_shop === '1.0' ? 'Body Shop ✓' : 'No Body Shop'}
            </span>
            <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
              storeInfo.confidence === 'High' ? 'bg-emerald-50 text-emerald-700' :
              storeInfo.confidence === 'Medium' ? 'bg-amber-50 text-amber-700' :
              'bg-red-50 text-red-600'
            }`}>
              {storeInfo.confidence} Confidence
            </span>
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-100">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Filters</span>

        <select
          value={selectedEnterprise}
          onChange={e => handleEnterpriseChange(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-teal-400 bg-white cursor-pointer text-gray-700"
        >
          <option value="">Select Enterprise ID</option>
          {enterprises.map(e => <option key={e} value={e}>{e}</option>)}
        </select>

        <select
          value={selectedStore}
          onChange={e => setSelectedStore(e.target.value)}
          disabled={!selectedEnterprise}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-teal-400 bg-white cursor-pointer text-gray-700 disabled:opacity-40"
        >
          <option value="">Select Store ID</option>
          {storesForEnterprise.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {(selectedEnterprise || selectedStore) && (
          <button
            onClick={() => { setSelectedEnterprise(''); setSelectedStore('') }}
            className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
        )}

        <div className="flex-1" />
        <p className="text-[10px] text-gray-400">Source: data.csv · {data.length} rows total</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3"/>
                <path d="M3 9h18M9 21V9"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Select Enterprise ID and Store ID</p>
              <p className="text-xs text-gray-400 mt-1">Use the filters above to load Fixed Ops predictions</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Net Summary */}
            <div>
              <h2 className="text-sm font-bold text-gray-900 mb-2 px-1">Net Summary</h2>
              <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                <TableHeader />
                <div className="bg-white">
                  {NET_SUMMARY_METRICS.map(m => (
                    <MetricRow key={m.field} metric={m} marRow={marRow} aprRow={aprRow} mayRow={mayRow} />
                  ))}
                </div>
              </div>
            </div>

            {/* Fixed Ops Performance */}
            <div>
              <h2 className="text-sm font-bold text-gray-900 mb-2 px-1">Fixed Ops Performance</h2>
              <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                <TableHeader />
                {/* Sub-header row */}
                <div className="grid bg-gray-50 border-b border-gray-100"
                  style={{ gridTemplateColumns: '2.2fr 1fr 1fr 1fr 1fr 1fr' }}>
                  <div className="px-4 py-2 text-[11px] font-bold text-gray-600 uppercase tracking-wide col-span-6">
                    Fixed Ops Performance
                  </div>
                </div>
                <div className="bg-white">
                  {FIXED_OPS_METRICS.map(m => (
                    <MetricRow key={m.field} metric={m} marRow={marRow} aprRow={aprRow} mayRow={mayRow} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
