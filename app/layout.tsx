import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: '持仓追踪 — 大师投资人动向',
  description: '追踪顶级投资人13F持仓变动，AI中文分析',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 min-h-screen`}>
        <Navbar />
        {/* Offset content for fixed 208px sidebar */}
        <div className="ml-52">
          <main className="max-w-5xl mx-auto px-6 py-6">
            {children}
          </main>
          <footer className="max-w-5xl mx-auto px-6 py-4 border-t border-gray-200 mt-8">
            <p className="text-xs text-gray-400">🧠 持仓追踪 · 数据来源 SEC EDGAR 13F</p>
          </footer>
        </div>
      </body>
    </html>
  )
}
