import Link from 'next/link'
import { investors, INVESTOR_COLORS, formatValue } from '@/lib/mockData'

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">设置</h1>
        <p className="text-sm text-gray-500 mt-0.5">管理追踪的投资人 · 配置通知</p>
      </div>

      {/* Tracked investors */}
      <div className="bg-white rounded-xl p-5 shadow-sm mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">追踪的投资人</h2>
          <span className="text-sm text-gray-400">{investors.length} 人</span>
        </div>

        <div className="flex flex-col gap-3">
          {investors.map(inv => {
            const c = INVESTOR_COLORS[inv.id]
            return (
              <div key={inv.id} className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:bg-gray-50/50 transition-colors">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                  style={{ backgroundColor: c.bg }}
                >
                  {inv.nameCn[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-gray-900">{inv.nameCn}</p>
                    <span className="text-xs text-gray-400">{inv.nameEn}</span>
                  </div>
                  <p className="text-xs text-gray-400">{inv.institution}</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-gray-400">CIK</p>
                  <p className="text-xs font-mono font-semibold text-gray-700">{inv.cik}</p>
                </div>
                <div className="text-right hidden md:block">
                  <p className="text-xs text-gray-400">持仓市值</p>
                  <p className="text-xs font-mono font-semibold text-gray-700">{formatValue(inv.totalValue)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inv.updated ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {inv.updated ? '已同步' : '待同步'}
                  </span>
                  <Link
                    href={`/investor/${inv.id}`}
                    className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-700 transition-colors"
                  >
                    查看
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add investor */}
      <div className="bg-white rounded-xl p-5 shadow-sm mb-5">
        <h2 className="text-base font-bold text-gray-900 mb-1">添加投资人</h2>
        <p className="text-xs text-gray-500 mb-4">通过 CIK 编号从 SEC EDGAR 添加任意机构投资人</p>

        <div className="flex gap-2 mb-3">
          <input
            placeholder="输入 CIK，例如：0001067983"
            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            readOnly
          />
          <button
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white opacity-60 cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)' }}
            disabled
          >
            查询
          </button>
        </div>
        <p className="text-xs text-gray-400">
          在 <span className="font-mono text-gray-600">sec.gov</span> 或 <span className="font-mono text-gray-600">dataroma.com</span> 查找 CIK 编号。
          添加后系统将自动回溯抓取过去 8 个季度的历史数据。
        </p>
        <div className="mt-3 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
          <p className="text-xs text-amber-700">⚠️ 此功能将在连接后端数据库后启用（阶段三）</p>
        </div>
      </div>

      {/* Email reports */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 mb-1">邮件报告</h2>
        <p className="text-xs text-gray-500 mb-4">每周自动发送投资人持仓变动摘要到邮箱</p>

        <div className="flex gap-2 mb-3">
          <input
            placeholder="your@email.com"
            type="email"
            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            readOnly
          />
          <select
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-400"
            disabled
          >
            <option>每周一</option>
            <option>每天</option>
          </select>
        </div>
        <div className="mt-3 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
          <p className="text-xs text-amber-700">⚠️ 邮件功能将在阶段四（Resend 集成）后启用</p>
        </div>
      </div>
    </div>
  )
}
