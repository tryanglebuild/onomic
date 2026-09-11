'use client'

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { CHART_AXIS_COLOR, CHART_FONT_FAMILY, CHART_GRID_COLOR, CHART_SERIES_COLORS, CHART_TOOLTIP_STYLE } from './chart-theme'

export function AppRadarChart({ data }: { data: { axis: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke={CHART_GRID_COLOR} />
        <PolarAngleAxis
          dataKey="axis"
          stroke={CHART_AXIS_COLOR}
          tick={{ width: 76, style: { fontFamily: CHART_FONT_FAMILY, fontSize: 12 } }}
        />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => `${Number(value)}%`} />
        <Radar dataKey="value" stroke={CHART_SERIES_COLORS[0]} fill={CHART_SERIES_COLORS[0]} fillOpacity={0.35} />
      </RadarChart>
    </ResponsiveContainer>
  )
}
