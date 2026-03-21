import { NextRequest } from 'next/server'

export function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization')
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}
