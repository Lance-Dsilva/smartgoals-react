import React, { useState, useMemo } from 'react'

const COST_METRICS = new Set(['Operating Cost', 'Expense'])

function fmtNum(metric, val) {
  const n = parseFloat(val)
  if (isNaN(n)) return { prefix: '', value: val ?? '—' }
  if (metric === 'Customer Satisfaction Score') return { prefix: '', value: n.toFixed(2) + ' / 5.0' }
  if (metric === 'Footfall' || metric === 'Units Sold') return { prefix: '', value: n.toLocaleString() }
  return { prefix: '$', value: n.toLocaleString() }
}

function pct(avg, target) {
  const a = parseFloat(avg), t = parseFloat(target)
  if (!a || !t) return null
  return (((t - a) / a) * 100).toFixed(1)
}

function trend(jan, mar) {
  const j = parseFloat(jan), m = parseFloat(mar)
  if (isNaN(j) || isNaN(m)) return 'flat'
  if (m > j * 1.01) return 'up'
  if (m < j * 0.99) return 'down'
  return 'flat'
}

function TrendArrow({ direction }) {
  if (direction === 'up') return <span className="text-emerald-500 text-xs">↗</span>
  if (direction === 'down') return <span className="text-red-400 text-xs">↘</span>
  return <span className="text-gray-300 text-xs">→</span>
}

function ChangeBadge({ metric, avg, target }) {
  const p = pct(avg, target)
  if (p === null) return <span className="text-gray-300 text-xs">—</span>
  const isCost = COST_METRICS.has(metric)
  const isGood = isCost ? parseFloat(p) < 0 : parseFloat(p) > 0
  const arrow = parseFloat(p) > 0 ? '↑' : '↓'
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2.5 py-1 rounded-full text-white ${
      isGood ? 'bg-emerald-500' : 'bg-red-500'
    }`}>
      {arrow} {Math.abs(p)}%
    </span>
  )
}

function MetricSection({ metricName, rows, level, stores }) {
  // Compute average row across all entities for this metric
  const avg3m = useMemo(() => {
    const vals = rows.map(r => parseFloat(r.avg_3m)).filter(v => !isNaN(v))
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : null
  }, [rows])

  const avgTarget = useMemo(() => {
    const vals = rows.map(r => parseFloat(r.recommended_target)).filter(v => !isNaN(v))
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : null
  }, [rows])

  const hasDollar = !['Footfall', 'Units Sold', 'Customer Satisfaction Score'].includes(metricName)

  return (
    <div className="mb-6">
      {/* Section title */}
      <div className="flex items-baseline gap-3 mb-0">
        <h2 className="text-base font-bold text-gray-900 px-4 pt-4 pb-3">{metricName}</h2>
        <span className="text-[11px] text-gray-400">{rows.length} {rows.length === 1 ? 'entity' : 'entities'}</span>
      </div>

      {/* Table */}
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        {/* Column headers */}
        <div className="grid bg-gray-50 border-b border-gray-100"
          style={{ gridTemplateColumns: level === 'employee' ? '2fr 1fr 1fr 1fr 1fr 1.4fr 1.4fr 1fr 1.2fr' : '2fr 1fr 1fr 1fr 1fr 1.4fr 1.4fr 1.2fr' }}>
          <div className="px-4 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            {level === 'store' ? 'Store' : level === 'department' ? 'Department' : 'Employee'}
          </div>
          {level === 'employee' && (
            <div className="px-3 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Store</div>
          )}
          <div className="px-3 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-right">Jan</div>
          <div className="px-3 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-right">Feb</div>
          <div className="px-3 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-right">Mar</div>
          <div className="px-3 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-right">3-Mo Avg</div>
          {/* Highlighted column — Rec. Target */}
          <div className="px-3 py-2.5 text-[10px] font-semibold text-white uppercase tracking-wider text-right bg-[#4a5568]">
            Rec. Target
          </div>
          <div className="px-3 py-2.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-right">
            vs Avg
          </div>
        </div>

        {/* Data rows */}
        {rows.map((row, i) => {
          const storeName = stores.find(s => s.store_id === row.store_id)?.name ?? row.store_id
          const trendDir = trend(row.jan, row.mar)
          const isLast = i === rows.length - 1

          return (
            <div
              key={row.entity_id + row.metric}
              className={`grid items-center hover:bg-slate-50 transition-colors ${!isLast ? 'border-b border-gray-50' : ''} ${i % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'}`}
              style={{ gridTemplateColumns: level === 'employee' ? '2fr 1fr 1fr 1fr 1fr 1.4fr 1.4fr 1fr 1.2fr' : '2fr 1fr 1fr 1fr 1fr 1.4fr 1.4fr 1.2fr' }}
            >
              {/* Name with chevron */}
              <div className="px-4 py-3 flex items-center gap-2">
                <svg width="8" height="12" viewBox="0 0 8 12" fill="none" className="text-gray-300 flex-shrink-0">
                  <path d="M1 1l6 5-6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-sm font-semibold text-gray-800 truncate">{row.entity_name}</span>
              </div>

              {/* Store column for employees */}
              {level === 'employee' && (
                <div className="px-3 py-3 text-xs text-gray-400 truncate">{storeName}</div>
              )}

              {/* Jan */}
              <div className="px-3 py-3 text-right">
                <span className="text-[11px] text-gray-400 mr-0.5">{hasDollar ? '$' : ''}</span>
                <span className="text-sm tabular-nums text-gray-600">{fmtNum(metricName, row.jan).value}</span>
              </div>

              {/* Feb */}
              <div className="px-3 py-3 text-right">
                <span className="text-[11px] text-gray-400 mr-0.5">{hasDollar ? '$' : ''}</span>
                <span className="text-sm tabular-nums text-gray-600">{fmtNum(metricName, row.feb).value}</span>
              </div>

              {/* Mar with trend arrow */}
              <div className="px-3 py-3 text-right flex items-center justify-end gap-1">
                <TrendArrow direction={trendDir} />
                <span className="text-[11px] text-gray-400 mr-0.5">{hasDollar ? '$' : ''}</span>
                <span className="text-sm tabular-nums text-gray-700 font-medium">{fmtNum(metricName, row.mar).value}</span>
              </div>

              {/* 3-Mo Avg */}
              <div className="px-3 py-3 text-right">
                <span className="text-[11px] text-gray-400 mr-0.5">{hasDollar ? '$' : ''}</span>
                <span className="text-sm tabular-nums font-semibold text-gray-800">{fmtNum(metricName, row.avg_3m).value}</span>
              </div>

              {/* Rec. Target — highlighted */}
              <div className="px-3 py-3 text-right bg-teal-50/60">
                <span className="text-[11px] text-teal-400 mr-0.5">{hasDollar ? '$' : ''}</span>
                <span className="text-sm tabular-nums font-bold text-teal-700">{fmtNum(metricName, row.recommended_target).value}</span>
              </div>

              {/* Change badge */}
              <div className="px-3 py-3 text-right">
                <ChangeBadge metric={metricName} avg={row.avg_3m} target={row.recommended_target} />
              </div>
            </div>
          )
        })}

        {/* Average summary row */}
        {rows.length > 1 && avg3m !== null && (
          <div
            className="grid items-center bg-gray-50 border-t border-gray-200"
            style={{ gridTemplateColumns: level === 'employee' ? '2fr 1fr 1fr 1fr 1fr 1.4fr 1.4fr 1fr 1.2fr' : '2fr 1fr 1fr 1fr 1fr 1.4fr 1.4fr 1.2fr' }}
          >
            <div className="px-4 py-2.5 flex items-center gap-2">
              <div className="w-2" />
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Average</span>
            </div>
            {level === 'employee' && <div className="px-3 py-2.5" />}
            <div className="px-3 py-2.5" />
            <div className="px-3 py-2.5" />
            <div className="px-3 py-2.5" />
            {/* 3-Mo Avg average */}
            <div className="px-3 py-2.5 text-right">
              <span className="text-[11px] text-gray-400 mr-0.5">{hasDollar ? '$' : ''}</span>
              <span className="text-xs tabular-nums font-bold text-gray-600">{fmtNum(metricName, avg3m).value}</span>
            </div>
            {/* Rec Target average */}
            <div className="px-3 py-2.5 text-right bg-teal-50/60">
              <span className="text-[11px] text-teal-400 mr-0.5">{hasDollar ? '$' : ''}</span>
              <span className="text-xs tabular-nums font-bold text-teal-600">{fmtNum(metricName, avgTarget).value}</span>
            </div>
            {/* Avg change */}
            <div className="px-3 py-2.5 text-right">
              <ChangeBadge metric={metricName} avg={avg3m} target={avgTarget} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DataPanel({ stores, departments, employees, metrics }) {
  const [level, setLevel] = useState('store')
  const [selectedStore, setSelectedStore] = useState('all')
  const [selectedDept, setSelectedDept] = useState('all')
  const [selectedMetric, setSelectedMetric] = useState('all')

  const allMetrics = useMemo(() => [...new Set(metrics.map(r => r.metric))], [metrics])

  const filtered = useMemo(() => {
    return metrics.filter(r => {
      if (r.entity_type !== level) return false
      if (level === 'store' && selectedStore !== 'all' && r.entity_id !== selectedStore) return false
      if (level === 'department' && selectedDept !== 'all' && r.entity_id !== selectedDept) return false
      if (level === 'employee' && selectedStore !== 'all' && r.store_id !== selectedStore) return false
      if (selectedMetric !== 'all' && r.metric !== selectedMetric) return false
      return true
    })
  }, [metrics, level, selectedStore, selectedDept, selectedMetric])

  // Group filtered rows by metric
  const groupedByMetric = useMemo(() => {
    const map = new Map()
    for (const row of filtered) {
      if (!map.has(row.metric)) map.set(row.metric, [])
      map.get(row.metric).push(row)
    }
    return map
  }, [filtered])

  // Stats for header bar
  const avgChange = useMemo(() => {
    const vals = filtered.map(r => pct(r.avg_3m, r.recommended_target)).filter(v => v !== null).map(Number)
    if (!vals.length) return null
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
  }, [filtered])

  const entityCount = level === 'store' ? stores.length : level === 'department' ? departments.length : employees.length

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      {/* Top bar — title + stats */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <div>
          <h1 className="text-base font-bold text-gray-900">Performance Dashboard</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">Historical data & recommended targets · Q1 2025</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Rows</p>
            <p className="text-sm font-bold text-gray-800">{filtered.length}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Avg vs Target</p>
            <p className={`text-sm font-bold ${avgChange !== null && parseFloat(avgChange) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {avgChange !== null ? (parseFloat(avgChange) > 0 ? '+' : '') + avgChange + '%' : '—'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{level}s</p>
            <p className="text-sm font-bold text-gray-800">{entityCount}</p>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-100">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mr-1">View</span>

        <select
          value={level}
          onChange={e => { setLevel(e.target.value); setSelectedStore('all'); setSelectedDept('all') }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-teal-400 bg-white cursor-pointer text-gray-700"
        >
          <option value="store">Store</option>
          <option value="department">Department</option>
          <option value="employee">Employee</option>
        </select>

        {(level === 'store' || level === 'employee') && (
          <select
            value={selectedStore}
            onChange={e => setSelectedStore(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-teal-400 bg-white cursor-pointer text-gray-700"
          >
            <option value="all">All Stores</option>
            {stores.map(s => <option key={s.store_id} value={s.store_id}>{s.name}</option>)}
          </select>
        )}

        {level === 'department' && (
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-teal-400 bg-white cursor-pointer text-gray-700"
          >
            <option value="all">All Departments</option>
            {departments.map(d => <option key={d.department_id} value={d.name}>{d.name}</option>)}
          </select>
        )}

        <select
          value={selectedMetric}
          onChange={e => setSelectedMetric(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-teal-400 bg-white cursor-pointer text-gray-700"
        >
          <option value="all">All Metrics</option>
          {allMetrics.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <button
          onClick={() => { setSelectedStore('all'); setSelectedDept('all'); setSelectedMetric('all') }}
          className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
        >
          Reset
        </button>

        <div className="flex-1" />
        <p className="text-[10px] text-gray-400">Source: historical_metrics.csv · {metrics.length} rows total</p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
            No data matches the current filters.
          </div>
        ) : (
          [...groupedByMetric.entries()].map(([metricName, rows]) => (
            <MetricSection
              key={metricName}
              metricName={metricName}
              rows={rows}
              level={level}
              stores={stores}
            />
          ))
        )}
      </div>
    </div>
  )
}
