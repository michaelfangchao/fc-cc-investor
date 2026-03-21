'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { COLORS_BY_CIK, DEFAULT_COLOR } from '@/lib/ui-constants'

type InvestorNav = { id: number; name_cn: string; cik: string }

function NavLinks({ investors, pathname, onNavigate }: {
  investors: InvestorNav[]
  pathname: string
  onNavigate?: () => void
}) {
  const [investorOpen, setInvestorOpen] = useState(true)
  const isInvestorActive = pathname.startsWith('/investor')
  const isStockActive = pathname.startsWith('/stock')

  return (
    <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
      <Link
        href="/"
        onClick={onNavigate}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${pathname === '/' ? 'bg-white text-purple-700 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/15'}`}
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
        仪表盘
      </Link>

      <div>
        <button
          onClick={() => setInvestorOpen(v => !v)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isInvestorActive ? 'bg-white text-purple-700 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/15'}`}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span className="flex-1 text-left">投资人</span>
          <svg className={`w-3 h-3 transition-transform ${investorOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>
        {investorOpen && (
          <div className="mt-0.5 ml-3 flex flex-col gap-0.5">
            {investors.map(inv => {
              const isActive = pathname === `/investor/${inv.id}`
              const color = COLORS_BY_CIK[inv.cik] ?? DEFAULT_COLOR
              return (
                <Link
                  key={inv.id}
                  href={`/investor/${inv.id}`}
                  onClick={onNavigate}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isActive ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color.bg }} />
                  {inv.name_cn}
                </Link>
              )
            })}
            {investors.length === 0 && <span className="text-white/30 text-xs px-3 py-1">加载中...</span>}
          </div>
        )}
      </div>

      <Link
        href="/stock"
        onClick={onNavigate}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isStockActive ? 'bg-white text-purple-700 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/15'}`}
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        个股视角
      </Link>

      <Link
        href="/analysis"
        onClick={onNavigate}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${pathname === '/analysis' ? 'bg-white text-purple-700 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/15'}`}
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
        AI 分析
      </Link>
    </nav>
  )
}

export default function Navbar() {
  const pathname = usePathname()
  const [investors, setInvestors] = useState<InvestorNav[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    fetch('/api/investors').then(r => r.json()).then(setInvestors).catch(() => {})
  }, [])

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false) }, [pathname])

  const logoLink = (
    <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
      <span className="text-xl">🧠</span>
      <span className="text-white font-bold text-base tracking-tight">持仓追踪</span>
    </Link>
  )

  const settingsLink = (onNavigate?: () => void) => (
    <div className="px-3 py-4 border-t border-white/10">
      <Link
        href="/settings"
        onClick={onNavigate}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${pathname === '/settings' ? 'bg-white text-purple-700 shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/15'}`}
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        设置
      </Link>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <aside
        className="hidden md:flex fixed top-0 left-0 h-screen w-52 flex-col z-40 shadow-xl"
        style={{ background: 'linear-gradient(180deg, #7c3aed 0%, #4338ca 100%)' }}
      >
        <div className="px-5 pt-6 pb-5 border-b border-white/10">
          {logoLink}
        </div>
        <NavLinks investors={investors} pathname={pathname} />
        {settingsLink()}
      </aside>

      {/* Mobile top bar — hidden on desktop */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 h-14 z-40 flex items-center px-4 shadow-lg"
        style={{ background: 'linear-gradient(90deg, #7c3aed 0%, #4338ca 100%)' }}
      >
        {logoLink}
        <button
          onClick={() => setDrawerOpen(v => !v)}
          className="ml-auto p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-all"
          aria-label="打开菜单"
        >
          {drawerOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
      </header>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-30" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}

      {/* Mobile drawer */}
      <div
        className={`md:hidden fixed top-14 left-0 bottom-0 w-64 z-40 flex flex-col shadow-2xl transition-transform duration-200 ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'linear-gradient(180deg, #7c3aed 0%, #4338ca 100%)' }}
      >
        <NavLinks investors={investors} pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
        {settingsLink(() => setDrawerOpen(false))}
      </div>
    </>
  )
}
