'use client'

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CHART_AXIS_COLOR, CHART_FONT_FAMILY, CHART_GRID_COLOR, CHART_SERIES_COLORS, CHART_TOOLTIP_STYLE } from './chart-theme'

export function AppLineChart({
  data,
  valueFormatter = (value: number) => String(value),
}: {
  data: { month: string; balance: number }[]
  valueFormatter?: (value: number) => string
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid stroke={CHART_GRID_COLOR} vertical={false} />
        <XAxis dataKey="month" stroke={CHART_AXIS_COLOR} style={{ fontFamily: CHART_FONT_FAMILY, fontSize: 12 }} />
        <YAxis stroke={CHART_AXIS_COLOR} style={{ fontFamily: CHART_FONT_FAMILY, fontSize: 12 }} />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => valueFormatter(Number(value))} />
        <Line type="monotone" dataKey="balance" stroke={CHART_SERIES_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
