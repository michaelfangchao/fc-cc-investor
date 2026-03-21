import {
  Html, Head, Body, Container, Section, Text, Heading,
  Hr, Link, Preview, Row, Column,
} from '@react-email/components'
import { COLORS_BY_CIK, DEFAULT_COLOR, formatValue, quarterLabel } from '@/lib/ui-constants'

export interface InvestorUpdate {
  investorId: number
  investorName: string
  cik: string
  institution: string
  changes: {
    ticker: string | null
    nameOfIssuer: string
    changeType: 'NEW' | 'INCREASED' | 'DECREASED' | 'EXITED'
    pctChange: number | null
    valueUsd: number
  }[]
}

interface WeeklyReportProps {
  quarter: string
  updates: InvestorUpdate[]
  aiDigest: string
  siteUrl: string
}

const CHANGE_LABEL: Record<string, string> = {
  NEW: '新建仓', INCREASED: '加仓', DECREASED: '减仓', EXITED: '清仓',
}
const CHANGE_COLOR: Record<string, string> = {
  NEW: '#7c3aed', INCREASED: '#16a34a', DECREASED: '#d97706', EXITED: '#dc2626',
}
const CHANGE_BG: Record<string, string> = {
  NEW: '#ede9fe', INCREASED: '#dcfce7', DECREASED: '#fef3c7', EXITED: '#fee2e2',
}

export function WeeklyReport({ quarter, updates, aiDigest, siteUrl }: WeeklyReportProps) {
  return (
    <Html lang="zh">
      <Head />
      <Preview>{`13F 周报 ${quarterLabel(quarter)} — ${updates.length} 位投资人有更新`}</Preview>
      <Body style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif', backgroundColor: '#f8fafc', margin: 0, padding: '24px 0' }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden' }}>

          {/* Header */}
          <Section style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)', padding: '28px 32px' }}>
            <Text style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              13F 周报
            </Text>
            <Heading style={{ margin: '8px 0 4px', fontSize: 24, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
              {quarterLabel(quarter)} 持仓更新
            </Heading>
            <Text style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
              {updates.length} 位投资人本周有新变动
            </Text>
          </Section>

          {/* AI Digest */}
          {aiDigest && (
            <Section style={{ padding: '20px 32px', borderLeft: '4px solid #7c3aed', margin: '24px 32px 0', backgroundColor: '#faf5ff', borderRadius: 8 }}>
              <Text style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                🧠 AI 摘要
              </Text>
              <Text style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
                {aiDigest}
              </Text>
            </Section>
          )}

          <Hr style={{ borderColor: '#f1f5f9', margin: '24px 32px' }} />

          {/* Per-investor sections */}
          {updates.map(update => {
            const color = COLORS_BY_CIK[update.cik] ?? DEFAULT_COLOR
            const topChanges = update.changes.slice(0, 5)
            return (
              <Section key={update.investorId} style={{ padding: '0 32px 20px' }}>
                <Row style={{ marginBottom: 12 }}>
                  <Column>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', backgroundColor: color.bg, marginRight: 8, verticalAlign: 'middle' }} />
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', verticalAlign: 'middle' }}>{update.investorName}</span>
                    <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8 }}>{update.institution}</span>
                  </Column>
                </Row>
                {topChanges.map((c, i) => (
                  <Row key={i} style={{ marginBottom: 6 }}>
                    <Column style={{ width: 80 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, backgroundColor: '#f1f5f9', color: '#7c3aed', padding: '2px 6px', borderRadius: 4 }}>
                        {c.ticker ?? c.nameOfIssuer.slice(0, 8)}
                      </span>
                    </Column>
                    <Column style={{ width: 80 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: CHANGE_BG[c.changeType] ?? '#f1f5f9', color: CHANGE_COLOR[c.changeType] ?? '#64748b', padding: '2px 8px', borderRadius: 9999 }}>
                        {CHANGE_LABEL[c.changeType] ?? c.changeType}
                        {c.pctChange !== null && ` ${c.pctChange > 0 ? '+' : ''}${c.pctChange.toFixed(1)}%`}
                      </span>
                    </Column>
                    <Column>
                      <Text style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontFamily: 'monospace', textAlign: 'right' }}>
                        {formatValue(c.valueUsd)}
                      </Text>
                    </Column>
                  </Row>
                ))}
                {update.changes.length > 5 && (
                  <Text style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>
                    + {update.changes.length - 5} 项变动…
                  </Text>
                )}
                <Hr style={{ borderColor: '#f1f5f9', margin: '16px 0 0' }} />
              </Section>
            )
          })}

          {/* Footer CTA */}
          <Section style={{ padding: '16px 32px 32px', textAlign: 'center' }}>
            <Link
              href={siteUrl}
              style={{ display: 'inline-block', backgroundColor: '#7c3aed', color: '#ffffff', padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
            >
              查看完整报告 →
            </Link>
            <Text style={{ margin: '16px 0 0', fontSize: 11, color: '#cbd5e1' }}>
              投资雷达 · 数据来源 SEC EDGAR 13F · <Link href={siteUrl} style={{ color: '#94a3b8' }}>{siteUrl}</Link>
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}
