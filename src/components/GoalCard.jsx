import React, { useState } from 'react'

const ICON_CONFIG = {
  'Monthly Revenue':             { symbol: '$',  bg: 'bg-emerald-50', text: 'text-emerald-600' },
  'Customer Footfall':           { symbol: '👤', bg: 'bg-purple-50',  text: 'text-purple-600'  },
  'Units Sold':                  { symbol: '🛒', bg: 'bg-cyan-50',    text: 'text-cyan-600'    },
  'Operating Cost':              { symbol: '📊', bg: 'bg-orange-50',  text: 'text-orange-500'  },
  'Customer Satisfaction Score': { symbol: '⭐', bg: 'bg-yellow-50',  text: 'text-yellow-600'  },
  'Expense':                     { symbol: '📋', bg: 'bg-red-50',     text: 'text-red-500'     },
}

const COST_METRICS = new Set(['Operating Cost', 'Expense'])

const MONTHS = ['January 2025', 'February 2025', 'March 2025', 'April 2025', 'May 2025', 'June 2025',
  'July 2025', 'August 2025', 'September 2025']

// ── Details Modal ─────────────────────────────────────────────────────────────

function DetailsModal({ goal, cfg, onClose }) {
  const isCost = COST_METRICS.has(goal.metric)
  const isPositive = goal.changePercent >= 0
  const isGood = isCost ? !isPositive : isPositive

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
            {cfg.symbol}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900">{goal.metric}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{goal.owner}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none flex-shrink-0">×</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Current Target</p>
            <p className="text-xl font-extrabold text-gray-900">{goal.currentValue}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Previous Month</p>
            <p className="text-xl font-extrabold text-gray-900">{goal.previousValue}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Change</p>
            <p className={`text-xl font-extrabold ${isGood ? 'text-emerald-600' : 'text-red-500'}`}>
              {isPositive ? '+' : ''}{goal.changePercent}%
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">Progress</p>
            <p className="text-xl font-extrabold text-gray-900">{goal.progress}%</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="flex justify-between text-[11px] text-gray-400 mb-1.5">
            <span>Goal completion</span>
            <span>{goal.progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gray-900 rounded-full transition-all duration-700" style={{ width: `${goal.progress}%` }} />
          </div>
        </div>

        {/* Period */}
        <div className="flex items-center justify-between text-sm text-gray-500 border-t border-gray-100 pt-4">
          <span>Period</span>
          <span className="font-semibold text-gray-700">{goal.month}</span>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}

// ── Edit Mode (inline) ────────────────────────────────────────────────────────

function EditForm({ goal, onSave, onCancel }) {
  const [value, setValue] = useState(goal.currentValue)
  const [month, setMonth] = useState(goal.month)
  const [progress, setProgress] = useState(goal.progress)

  function handleSave() {
    onSave({ currentValue: value, month, progress: Number(progress) })
  }

  return (
    <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-4 mb-3">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-2.5 py-0.5 uppercase tracking-wide">Editing</span>
        <span className="text-sm font-semibold text-gray-700">{goal.metric}</span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Goal Value</label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 transition-all"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Period</label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-teal-400 bg-white cursor-pointer"
          >
            {MONTHS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
            Progress — {progress}%
          </label>
          <input
            type="range"
            min={0} max={100}
            value={progress}
            onChange={(e) => setProgress(e.target.value)}
            className="w-full accent-teal-600"
          />
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleSave}
          className="flex-1 py-2 text-xs font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
        >
          Save Changes
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── GoalCard ──────────────────────────────────────────────────────────────────

export default function GoalCard({ goal, onUpdate, onMetricUpdate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [localGoal, setLocalGoal] = useState(goal)

  const cfg = ICON_CONFIG[localGoal.metric] || { symbol: '📈', bg: 'bg-gray-100', text: 'text-gray-600' }
  const isCost = COST_METRICS.has(localGoal.metric)
  const isPositive = localGoal.changePercent >= 0
  const isGood = isCost ? !isPositive : isPositive

  function handleSave(updates) {
    const updated = { ...localGoal, ...updates }
    setLocalGoal(updated)
    onUpdate?.(updated)

    // Sync new goal value back to the data dashboard's recommended_target
    if (onMetricUpdate && updated.entityType && updated.entityId && updated.csvMetric) {
      const rawNum = parseFloat(String(updates.currentValue).replace(/[^0-9.]/g, ''))
      if (!isNaN(rawNum)) {
        onMetricUpdate(updated.entityType, updated.entityId, updated.csvMetric, rawNum)
      }
    }

    setIsEditing(false)
  }

  if (isEditing) {
    return <EditForm goal={localGoal} onSave={handleSave} onCancel={() => setIsEditing(false)} />
  }

  return (
    <>
      {showDetails && (
        <DetailsModal goal={localGoal} cfg={cfg} onClose={() => setShowDetails(false)} />
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-3 relative">
        {/* Just Created badge */}
        {localGoal.isNew && (
          <span className="absolute top-4 right-4 flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 uppercase tracking-wide">
            <span className="text-emerald-500">▸</span> Just Created
          </span>
        )}

        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
            {cfg.symbol}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 leading-tight">{localGoal.metric}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{localGoal.owner}</p>
          </div>
        </div>

        {/* Value */}
        <p className="text-[28px] font-extrabold text-gray-900 tracking-tight leading-none mb-2">
          {localGoal.currentValue}
        </p>

        {/* Change badge */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs text-gray-400">vs {localGoal.previousValue} prev mo</span>
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            isGood ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          }`}>
            {isPositive ? '↑' : '↓'} {Math.abs(localGoal.changePercent)}% target
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-900 rounded-full transition-all duration-500"
              style={{ width: `${localGoal.progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[11px] text-gray-400">{localGoal.progress}% complete</span>
            <span className="text-[11px] text-gray-400">{localGoal.month}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-3 border-t border-gray-50">
          <button
            onClick={() => setIsEditing(true)}
            className="flex-1 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-teal-300 hover:text-teal-600 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => setShowDetails(true)}
            className="flex-1 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
          >
            View Details
          </button>
        </div>
      </div>
    </>
  )
}
