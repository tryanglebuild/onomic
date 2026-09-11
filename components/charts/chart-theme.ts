export const CHART_SERIES_COLORS = [
  'var(--color-primary)',
  'var(--color-sky)',
  'var(--color-violet)',
  'var(--color-warning)',
  'var(--color-navy-soft)',
  'var(--color-danger)',
]

export const CHART_GRID_COLOR = 'var(--color-border)'
export const CHART_AXIS_COLOR = 'var(--color-muted)'
export const CHART_FONT_FAMILY = 'var(--font-sans), ui-sans-serif, system-ui, sans-serif'

export const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontFamily: CHART_FONT_FAMILY,
  fontSize: '13px',
  color: 'var(--color-ink)',
  boxShadow: 'var(--shadow-soft)',
}
