// Client-safe constants and formatting utilities (no DB imports)

export const COLORS_BY_CIK: Record<string, { bg: string; light: string; text: string; border: string }> = {
  '0001067983': { bg: '#3b82f6', light: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' }, // Buffett  – blue
  '0001697748': { bg: '#f97316', light: '#fff7ed', text: '#c2410c', border: '#fed7aa' }, // ARK      – orange
  '0001709323': { bg: '#a855f7', light: '#faf5ff', text: '#7e22ce', border: '#d8b4fe' }, // Li Lu    – purple
  '0001759760': { bg: '#22c55e', light: '#f0fdf4', text: '#15803d', border: '#86efac' }, // Duan     – green
  '0001419050': { bg: '#ef4444', light: '#fef2f2', text: '#b91c1c', border: '#fca5a5' }, // Norbert (old)
  '0001631664': { bg: '#ef4444', light: '#fef2f2', text: '#b91c1c', border: '#fca5a5' }, // Norbert  – red
}
export const DEFAULT_COLOR = { bg: '#6b7280', light: '#f9fafb', text: '#374151', border: '#d1d5db' }

export type ChangeType = 'NEW' | 'INCREASED' | 'DECREASED' | 'EXITED'

export const CHANGE_META: Record<ChangeType, { emoji: string; label: string; bg: string; text: string; border: string }> = {
  NEW:       { emoji: '✨', label: '新建仓', bg: '#f0fdf4', text: '#15803d', border: '#22c55e' },
  INCREASED: { emoji: '📈', label: '加仓',   bg: '#eff6ff', text: '#1d4ed8', border: '#3b82f6' },
  DECREASED: { emoji: '📉', label: '减仓',   bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
  EXITED:    { emoji: '🚪', label: '清仓',   bg: '#fef2f2', text: '#b91c1c', border: '#ef4444' },
}

export function formatValue(dollars: number): string {
  if (dollars >= 1_000_000_000) return `$${(dollars / 1_000_000_000).toFixed(1)}B`
  if (dollars >= 1_000_000)     return `$${(dollars / 1_000_000).toFixed(0)}M`
  if (dollars >= 1_000)         return `$${(dollars / 1_000).toFixed(0)}K`
  return `$${dollars}`
}

export function formatShares(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return n.toLocaleString()
}

export function quarterLabel(q: string): string {
  const m = q.match(/(\d{4})Q(\d)/)
  return m ? `${m[1]} Q${m[2]}` : q
}
