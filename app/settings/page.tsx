'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type InvestorRow = {
  id: number
  name_cn: string
  name_en: string
  institution: string
  cik: string
  backfill_status: string
  backfill_quarters_done: number
}

type EdgarPreview = {
  cik: string
  name: string
  has13F: boolean
  filingCount: number
}

function useBackfillPoller(id: number | null, onDone: () => void) {
  useEffect(() => {
    if (!id) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/investors/${id}`)
        const data = await res.json()
        if (data.backfill_status === 'done' || data.backfill_status === 'error') {
          clearInterval(interval)
          onDone()
        }
      } catch { clearInterval(interval) }
    }, 3000)
    return () => clearInterval(interval)
  }, [id, onDone])
}

function BackfillBadge({ status, done }: { status: string; done: number }) {
  if (status === 'done') return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">已完成</span>
  if (status === 'running') return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
      回溯中 {done}/8
    </span>
  )
  if (status === 'error') return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">出错</span>
  return <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">待初始化</span>
}

function RetryButton({ investorId, onRetry }: { investorId: number; onRetry: () => void }) {
  const [retrying, setRetrying] = useState(false)

  async function handleRetry() {
    setRetrying(true)
    try {
      const res = await fetch(`/api/investors/${investorId}/retry`, { method: 'POST' })
      if (res.ok) {
        onRetry()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(`重试失败：${data.error || res.status}`)
      }
    } catch {
      alert('网络错误，请稍后重试')
    } finally {
      setRetrying(false)
    }
  }

  return (
    <button
      onClick={handleRetry}
      disabled={retrying}
      className="text-xs px-2 py-1 rounded-full border border-orange-200 text-orange-600 hover:border-orange-400 hover:bg-orange-50 transition-colors disabled:opacity-60"
    >
      {retrying ? '重试中...' : '重试'}
    </button>
  )
}

function InvestorItem({ investor, onDelete }: { investor: InvestorRow; onDelete: (id: number) => void }) {
  const [status, setStatus] = useState(investor.backfill_status)
  const [done, setDone] = useState(investor.backfill_quarters_done)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/investors/${investor.id}`)
    const data = await res.json()
    setStatus(data.backfill_status)
    setDone(data.backfill_quarters_done)
  }, [investor.id])

  useBackfillPoller(status === 'running' ? investor.id : null, refresh)

  async function handleDelete() {
    setDeleting(true)
    setDeleteError('')
    const res = await fetch(`/api/investors/${investor.id}`, { method: 'DELETE' })
    if (res.ok) {
      onDelete(investor.id)
    } else {
      const data = await res.json().catch(() => ({}))
      setDeleteError(data.error || `删除失败 (${res.status})`)
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm text-gray-900">{investor.name_cn}</p>
          <span className="text-xs text-gray-400 hidden sm:inline">{investor.name_en}</span>
          <BackfillBadge status={status} done={done} />
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <p className="text-xs text-gray-400">{investor.institution}</p>
          <span className="text-xs font-mono text-gray-500">{investor.cik}</span>
        </div>
        {status === 'running' && (
          <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden w-32">
            <div
              className="h-full bg-blue-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((done / 8) * 100, 100)}%` }}
            />
          </div>
        )}
        {deleteError && <p className="text-xs text-red-500 mt-1">{deleteError}</p>}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {status === 'error' && (
          <RetryButton investorId={investor.id} onRetry={() => { setStatus('running'); setDone(0) }} />
        )}
        <Link
          href={`/investor/${investor.id}`}
          className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-700 transition-colors"
        >
          查看
        </Link>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs px-2 py-1 rounded-full border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 transition-colors"
          >
            删除
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs px-2 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs px-2 py-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60"
            >
              {deleting ? '...' : '确认删除'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [investors, setInvestors] = useState<InvestorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [cikInput, setCikInput] = useState('')
  const [preview, setPreview] = useState<EdgarPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [nameCn, setNameCn] = useState('')
  const [institution, setInstitution] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  useEffect(() => {
    fetch('/api/investors')
      .then(r => r.json())
      .then(data => { setInvestors(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handlePreview() {
    const cik = cikInput.trim()
    if (!cik) return
    setPreviewError('')
    setPreview(null)
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/edgar-preview?cik=${encodeURIComponent(cik)}`)
      const data = await res.json()
      if (!res.ok) { setPreviewError(data.error || '查询失败'); return }
      setPreview(data)
      if (data.name) setInstitution(data.name)
    } catch {
      setPreviewError('网络错误，请稍后重试')
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleAdd() {
    if (!preview || !nameCn.trim() || !institution.trim()) return
    setAddError('')
    setAdding(true)
    try {
      const res = await fetch('/api/investors/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cik: preview.cik,
          name_cn: nameCn.trim(),
          name_en: preview.name,
          institution: institution.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setAddError(data.error || '添加失败'); return }
      const listRes = await fetch('/api/investors')
      setInvestors(await listRes.json())
      setCikInput(''); setPreview(null); setNameCn(''); setInstitution('')
    } catch {
      setAddError('网络错误，请稍后重试')
    } finally {
      setAdding(false)
    }
  }

  function handleDelete(id: number) {
    setInvestors(prev => prev.filter(inv => inv.id !== id))
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">设置</h1>
        <p className="text-sm text-gray-500 mt-0.5">管理追踪的投资人 · 配置通知</p>
      </div>

      {/* Tracked investors */}
      <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">追踪的投资人</h2>
          <span className="text-sm text-gray-400">{investors.length} 人</span>
        </div>
        {loading ? (
          <div className="text-center text-gray-400 py-8 text-sm">加载中...</div>
        ) : investors.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p className="text-sm mb-1">暂无追踪的投资人</p>
            <p className="text-xs">在下方添加投资人以开始追踪</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {investors.map(inv => (
              <InvestorItem key={inv.id} investor={inv} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {/* Add investor */}
      <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm mb-5">
        <h2 className="text-base font-bold text-gray-900 mb-1">添加投资人</h2>
        <p className="text-xs text-gray-500 mb-4">
          通过 CIK 编号从 SEC EDGAR 添加任意机构投资人。添加后系统将自动回溯抓取过去 8 个季度的历史数据。
        </p>

        <div className="flex gap-2 mb-3">
          <input
            value={cikInput}
            onChange={e => { setCikInput(e.target.value); setPreview(null); setPreviewError('') }}
            onKeyDown={e => e.key === 'Enter' && handlePreview()}
            placeholder="输入 CIK，例如：0001067983"
            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent min-w-0"
          />
          <button
            onClick={handlePreview}
            disabled={!cikInput.trim() || previewLoading}
            className="px-4 md:px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)' }}
          >
            {previewLoading ? '查询中...' : '查询'}
          </button>
        </div>

        {previewError && <p className="text-xs text-red-500 mb-3">{previewError}</p>}

        {preview && (
          <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 mb-3">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{preview.name || '未知机构'}</p>
                <p className="text-xs text-gray-500 font-mono mt-0.5">CIK: {preview.cik}</p>
              </div>
              {preview.has13F ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium flex-shrink-0">
                  {preview.filingCount} 份 13F
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium flex-shrink-0">无 13F</span>
              )}
            </div>

            {preview.has13F && (
              <>
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <input
                    value={nameCn}
                    onChange={e => setNameCn(e.target.value)}
                    placeholder="中文名称，例如：沃伦·巴菲特"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  />
                  <input
                    value={institution}
                    onChange={e => setInstitution(e.target.value)}
                    placeholder="机构名称"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  />
                </div>
                {addError && <p className="text-xs text-red-500 mb-2">{addError}</p>}
                <button
                  onClick={handleAdd}
                  disabled={!nameCn.trim() || !institution.trim() || adding}
                  className="w-full py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)' }}
                >
                  {adding ? '添加中...' : `添加 ${nameCn || '投资人'}`}
                </button>
              </>
            )}
          </div>
        )}

        <p className="text-xs text-gray-400">
          在 <span className="font-mono text-gray-600">sec.gov</span> 或 <span className="font-mono text-gray-600">dataroma.com</span> 查找 CIK 编号。
        </p>
      </div>

      {/* Email reports */}
      <div className="bg-white rounded-xl p-4 md:p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 mb-1">邮件报告</h2>
        <p className="text-xs text-gray-500 mb-4">每周一自动发送持仓变动摘要（Vercel Cron: 周一 11:00 UTC）</p>

        <div className="flex flex-col gap-2 mb-3">
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100">
            <div>
              <p className="text-xs font-medium text-gray-700">收件人邮箱</p>
              <p className="text-xs text-gray-400 font-mono mt-0.5">REPORT_EMAIL</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">在 Vercel 配置</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100">
            <div>
              <p className="text-xs font-medium text-gray-700">Resend API Key</p>
              <p className="text-xs text-gray-400 font-mono mt-0.5">RESEND_API_KEY</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">在 Vercel 配置</span>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          在 Vercel 控制台 → Project → Settings → Environment Variables 中配置以上变量。
        </p>
      </div>
    </div>
  )
}
