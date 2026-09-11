'use client'

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CHART_AXIS_COLOR, CHART_FONT_FAMILY, CHART_GRID_COLOR, CHART_SERIES_COLORS, CHART_TOOLTIP_STYLE } from './chart-theme'

export function AppBarChart({
  data,
  valueFormatter = (value: number) => String(value),
}: {
  data: { label: string; value: number }[]
  valueFormatter?: (value: number) => string
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid stroke={CHART_GRID_COLOR} vertical={false} />
        <XAxis dataKey="label" stroke={CHART_AXIS_COLOR} style={{ fontFamily: CHART_FONT_FAMILY, fontSize: 12 }} />
        <YAxis stroke={CHART_AXIS_COLOR} style={{ fontFamily: CHART_FONT_FAMILY, fontSize: 12 }} />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => valueFormatter(Number(value))} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={entry.label} fill={CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
