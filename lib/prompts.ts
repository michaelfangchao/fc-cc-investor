// All Claude prompt templates

export function investorSummaryPrompt(params: {
  investorName: string
  institution: string
  quarter: string
  positions: { ticker: string | null; nameOfIssuer: string; shares: number; valueUsd: number; pctOfPortfolio: number }[]
  changes: { ticker: string | null; nameOfIssuer: string; changeType: string; prevShares: number | null; currShares: number | null; pctChange: number | null }[]
}): string {
  const topPositions = params.positions
    .sort((a, b) => b.valueUsd - a.valueUsd)
    .slice(0, 10)
    .map(p => `  ${p.ticker ?? p.nameOfIssuer}: ${p.pctOfPortfolio.toFixed(1)}% ($${(p.valueUsd / 1e9).toFixed(2)}B, ${(p.shares / 1e6).toFixed(2)}M股)`)
    .join('\n')

  const changeLines = params.changes
    .map(c => {
      const label = { NEW: '新建仓', INCREASED: '加仓', DECREASED: '减仓', EXITED: '清仓' }[c.changeType] ?? c.changeType
      const pct = c.pctChange !== null ? ` (${c.pctChange > 0 ? '+' : ''}${c.pctChange.toFixed(1)}%)` : ''
      return `  ${c.ticker ?? c.nameOfIssuer}: ${label}${pct}`
    })
    .join('\n')

  return `你是一位专业的价值投资分析师，精通巴菲特、段永平等大师的投资哲学。
请分析以下投资人的最新13F持仓，用中文输出JSON格式的分析报告。

投资人：${params.investorName}（${params.institution}）
季度：${params.quarter}

前十大持仓：
${topPositions}

本季度变动：
${changeLines}

请输出以下JSON格式（不要有任何其他文字，直接输出JSON）：
{
  "summary_cn": "2-3句话的总体分析，重点说明本季度最重要的战略动向",
  "bull_points": ["看多观点1", "看多观点2", "看多观点3"],
  "bear_points": ["风险提示1", "风险提示2"],
  "recommendation": "买入/持有/观望/谨慎",
  "key_moves": ["最重要的操作1（一句话）", "最重要的操作2", "最重要的操作3"]
}`
}

export function emailDigestPrompt(params: {
  quarter: string
  updates: { investorName: string; institution: string; newPositions: number; increasedPositions: number; decreasedPositions: number; exitedPositions: number; topMoves: string[] }[]
}): string {
  const updatesText = params.updates.map(u =>
    `${u.investorName}（${u.institution}）：新建${u.newPositions}、加仓${u.increasedPositions}、减仓${u.decreasedPositions}、清仓${u.exitedPositions}。主要动作：${u.topMoves.join('；')}`
  ).join('\n\n')

  return `你是一位投资研究助理，帮用户整理本周13F持仓更新摘要。请用流畅的中文写一段150字左右的摘要段落，概括以下${params.updates.length}位投资人的最新动向，突出最值得关注的操作。

季度：${params.quarter}

各投资人动向：
${updatesText}

直接输出摘要段落文字，不要JSON，不要标题，不要换行符。`
}
