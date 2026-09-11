'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { CHART_SERIES_COLORS, CHART_TOOLTIP_STYLE } from './chart-theme'

export function AppPieChart({
  data,
  valueFormatter = (value: number) => String(value),
}: {
  data: { label: string; value: number }[]
  valueFormatter?: (value: number) => string
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" innerRadius={56} outerRadius={88} paddingAngle={2}>
          {data.map((entry, index) => (
            <Cell key={entry.label} fill={CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => valueFormatter(Number(value))} />
      </PieChart>
    </ResponsiveContainer>
  )
}
