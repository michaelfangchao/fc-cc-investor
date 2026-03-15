import { NextRequest, NextResponse } from 'next/server'
import { db, investors } from '@/lib/db'
import { eq } from 'drizzle-orm'

// GET /api/investors — list all
export async function GET() {
  const rows = await db.select().from(investors)
  return NextResponse.json(rows)
}

// POST /api/investors — add new investor by CIK
export async function POST(req: NextRequest) {
  const { cik, name_cn, name_en, institution } = await req.json()
  if (!cik) return NextResponse.json({ error: 'CIK required' }, { status: 400 })

  // Check duplicate
  const [existing] = await db.select().from(investors).where(eq(investors.cik, cik))
  if (existing) return NextResponse.json({ error: 'Already tracked' }, { status: 409 })

  const [created] = await db.insert(investors)
    .values({ cik, name_cn: name_cn || cik, name_en: name_en || cik, institution: institution || '' })
    .returning()

  return NextResponse.json(created)
}
