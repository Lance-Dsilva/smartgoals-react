import { useState, useEffect, useMemo } from 'react'
import { fetchRecommendedTargets } from './recommendedTargetsApi'

function parseCSV(text) {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = line.split(',').map(v => v.trim())
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}

// Build a Map key for quick target lookup
function targetKey(entityType, entityId, metric) {
  return `${entityType}|${entityId}|${metric}`
}

export function useAppData() {
  const [stores, setStores] = useState([])
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])
  const [rawMetrics, setRawMetrics] = useState([])     // historical CSV rows (no recommended_target)
  const [targets, setTargets] = useState([])            // ML-generated recommended targets
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch('/data/stores.csv').then(r => r.text()),
      fetch('/data/departments.csv').then(r => r.text()),
      fetch('/data/employees.csv').then(r => r.text()),
      fetch('/data/historical_metrics.csv').then(r => r.text()),
      fetchRecommendedTargets(),
    ])
      .then(([s, d, e, m, t]) => {
        setStores(parseCSV(s))
        setDepartments(parseCSV(d))
        setEmployees(parseCSV(e))
        setRawMetrics(parseCSV(m))
        setTargets(t)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  // Build a fast-lookup Map: "entityType|entityId|metric" → recommended_target
  const targetsMap = useMemo(() => {
    const map = new Map()
    for (const t of targets) {
      map.set(targetKey(t.entity_type, t.entity_id, t.metric), t.recommended_target)
    }
    return map
  }, [targets])

  // Merge historical rows with recommended targets — this is what the rest of the app uses
  const metrics = useMemo(() => {
    return rawMetrics.map(row => ({
      ...row,
      recommended_target: String(
        targetsMap.get(targetKey(row.entity_type, row.entity_id, row.metric)) ?? ''
      ),
    }))
  }, [rawMetrics, targetsMap])

  // Look up a single merged row
  function getMetricRow(entityType, entityId, metricName) {
    return metrics.find(
      r => r.entity_type === entityType &&
           r.entity_id === entityId &&
           r.metric === metricName
    ) ?? null
  }

  // Get all merged rows for a given entity
  function getEntityMetrics(entityType, entityId) {
    return metrics.filter(r => r.entity_type === entityType && r.entity_id === entityId)
  }

  /**
   * Update the recommended_target for a specific entity+metric.
   * Called when a goal is confirmed or edited via the chatbot / goal card.
   * Only mutates the in-memory targets array — historical_metrics.csv stays unchanged.
   * When the live ML API is available, also POST the override here.
   */
  function updateMetricTarget(entityType, entityId, metricName, newTarget) {
    setTargets(prev => {
      const key = targetKey(entityType, entityId, metricName)
      const exists = prev.some(
        t => targetKey(t.entity_type, t.entity_id, t.metric) === key
      )
      if (exists) {
        return prev.map(t =>
          targetKey(t.entity_type, t.entity_id, t.metric) === key
            ? { ...t, recommended_target: newTarget }
            : t
        )
      }
      // Entry not yet in targets (e.g. new entity) — insert it
      return [...prev, { entity_type: entityType, entity_id: entityId, metric: metricName, recommended_target: newTarget }]
    })

    // TODO: when live API is available, also persist the override:
    // await fetch(`${API_BASE}/v1/recommended-targets/override`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ entity_type: entityType, entity_id: entityId, metric: metricName, value: newTarget }),
    // })
  }

  return {
    stores, departments, employees,
    metrics,          // merged: historical + recommended targets
    loading, error,
    getMetricRow, getEntityMetrics,
    updateMetricTarget,
  }
}
