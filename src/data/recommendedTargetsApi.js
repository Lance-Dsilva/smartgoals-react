/**
 * Recommended Targets API client
 *
 * The ML model runs nightly and writes recommended_targets.json to /public/data/.
 * When the live API is ready, set VITE_TARGETS_API_URL in .env and this client
 * will automatically switch from the local file to the real endpoint.
 *
 * Expected response shape (both local file and API must return this):
 * {
 *   generated_at: string (ISO 8601),
 *   model_version: string,
 *   targets: Array<{
 *     entity_type: 'store' | 'department' | 'employee',
 *     entity_id:   string,
 *     metric:      string,
 *     recommended_target: number
 *   }>
 * }
 *
 * To go live: add to .env →  VITE_TARGETS_API_URL=https://api.yourcompany.com
 * The app will call: GET {VITE_TARGETS_API_URL}/v1/recommended-targets
 */

const API_BASE = import.meta.env.VITE_TARGETS_API_URL ?? null

export async function fetchRecommendedTargets() {
  if (API_BASE) {
    // ── Live ML API path ──────────────────────────────────────────────────────
    const res = await fetch(`${API_BASE}/v1/recommended-targets`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      throw new Error(`Targets API error ${res.status}: ${await res.text()}`)
    }
    const data = await res.json()
    return data.targets   // same shape as the local JSON
  }

  // ── Fallback: static JSON produced by nightly ML run ─────────────────────
  const res = await fetch('/data/recommended_targets.json')
  if (!res.ok) {
    throw new Error('Failed to load recommended_targets.json')
  }
  const data = await res.json()
  return data.targets
}