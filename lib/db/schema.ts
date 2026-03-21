import { pgTable, serial, text, integer, bigint, real, timestamp, jsonb, unique, index } from 'drizzle-orm/pg-core'

export const investors = pgTable('investors', {
  id:                      serial('id').primaryKey(),
  name_cn:                 text('name_cn').notNull(),
  name_en:                 text('name_en').notNull(),
  institution:             text('institution').notNull(),
  cik:                     text('cik').notNull().unique(),
  description:             text('description'),
  backfill_status:         text('backfill_status').notNull().default('idle'), // 'idle' | 'running' | 'done' | 'error'
  backfill_quarters_done:  integer('backfill_quarters_done').notNull().default(0),
  created_at:              timestamp('created_at').defaultNow(),
})

export const filings = pgTable('filings', {
  id:               serial('id').primaryKey(),
  investor_id:      integer('investor_id').notNull().references(() => investors.id),
  period:           text('period').notNull(),       // e.g. "2024Q4"
  filed_date:       text('filed_date'),             // e.g. "2025-02-14"
  accession_number: text('accession_number').notNull(),
  created_at:       timestamp('created_at').defaultNow(),
}, (t) => [
  index('filings_investor_period_idx').on(t.investor_id, t.period),
  unique('filings_investor_period_unique').on(t.investor_id, t.period),
])

export const stocks = pgTable('stocks', {
  id:       serial('id').primaryKey(),
  ticker:   text('ticker').unique(),               // null until resolved via OpenFIGI
  name_en:  text('name_en').notNull(),
  cusip:    text('cusip').notNull().unique(),
  sector:   text('sector'),
})

export const positions = pgTable('positions', {
  id:                serial('id').primaryKey(),
  filing_id:         integer('filing_id').notNull().references(() => filings.id),
  stock_id:          integer('stock_id').notNull().references(() => stocks.id),
  shares:            bigint('shares', { mode: 'number' }).notNull(),
  value_usd:         bigint('value_usd', { mode: 'number' }).notNull(), // in thousands (SEC format)
  pct_of_portfolio:  real('pct_of_portfolio'),
}, (t) => [
  index('positions_filing_idx').on(t.filing_id),
  unique('positions_filing_stock_unique').on(t.filing_id, t.stock_id),
])

export const position_changes = pgTable('position_changes', {
  id:           serial('id').primaryKey(),
  investor_id:  integer('investor_id').notNull().references(() => investors.id),
  stock_id:     integer('stock_id').notNull().references(() => stocks.id),
  quarter:      text('quarter').notNull(),          // e.g. "2024Q4"
  change_type:  text('change_type').notNull(),      // NEW | INCREASED | DECREASED | EXITED
  prev_shares:  bigint('prev_shares', { mode: 'number' }),
  curr_shares:  bigint('curr_shares', { mode: 'number' }),
  pct_change:   real('pct_change'),
}, (t) => [
  index('changes_investor_quarter_idx').on(t.investor_id, t.quarter),
  unique('changes_unique').on(t.investor_id, t.stock_id, t.quarter),
])

export const ai_summaries = pgTable('ai_summaries', {
  id:          serial('id').primaryKey(),
  investor_id: integer('investor_id').notNull().references(() => investors.id),
  filing_id:   integer('filing_id').notNull().references(() => filings.id),
  created_at:  timestamp('created_at').defaultNow(),
  analysis:    jsonb('analysis'),  // { summary_cn, bull_points[], bear_points[], recommendation, key_moves[] }
}, (t) => [
  unique('ai_summaries_investor_filing_unique').on(t.investor_id, t.filing_id),
])
