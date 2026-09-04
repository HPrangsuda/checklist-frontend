/**
 * getStatusColor
 * Shared utility — ใช้ร่วมกันทุก component (Machine, Calibration, Maintenance ฯลฯ)
 * รับ status string (case-insensitive) และคืน Tailwind class สำหรับ Badge
 */
export const getStatusColor = (status: string): string => {
  switch ((status ?? '').toLowerCase()) {

    // ── Green ──────────────────────────────────────────────────────────────
    case 'operational':
    case 'completed':
    case 'ready to use':
    case 'pass':
    case 'on time':
      return 'bg-emerald-100 text-emerald-600 dark:text-emerald-100'

    // ── Yellow ─────────────────────────────────────────────────────────────
    case 'pending manager':
    case 'not ready (waiting for repair)':
    case 'scheduled':
      return 'bg-yellow-100 text-yellow-600 dark:text-yellow-100'

    // ── Orange ─────────────────────────────────────────────────────────────
    case 'under maintenance':
    case 'under repair':
    case 'pending supervisor':
    case 'completed (late)':
      return 'bg-orange-100 text-orange-600 dark:text-orange-100'

    // ── Red ────────────────────────────────────────────────────────────────
    case 'canceled':
    case 'pending':
    case 'not pass':
    case 'overdue':
    case 'not ready (under repair)':
      return 'bg-red-100 text-red-600 dark:text-red-100'

    // ── Blue ───────────────────────────────────────────────────────────────
    case 'in progress':
    case 'not ready (equipment modification)':
      return 'bg-blue-100 text-blue-600 dark:text-blue-100'

    // ── Purple ─────────────────────────────────────────────────────────────
    case 'transfer':
      return 'bg-purple-100 text-purple-600 dark:text-purple-100'

    // ── Gray ───────────────────────────────────────────────────────────────
    case 'scrapped':
    case 'decommissioned':
    case 'n/a':
      return 'bg-zinc-100 text-zinc-500 dark:text-zinc-300'

    // ── Pink ───────────────────────────────────────────────────────────────
    case 'not found':
    case 'certificate mismatch':
      return 'bg-pink-100 text-pink-600 dark:text-pink-100'

    // ── Teal ───────────────────────────────────────────────────────────────
    case 'limited use':
      return 'bg-teal-100 text-teal-600 dark:text-teal-100'

    // ── Damaged ────────────────────────────────────────────────────────────
    case 'damaged':
      return 'bg-rose-100 text-rose-600 dark:text-rose-100'

    default:
      return 'bg-zinc-100 text-zinc-600 dark:text-zinc-100'
  }
}