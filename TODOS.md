# TODOS

Items deferred from planning/review. Each has enough context to pick up in 3 months.

---

## P2/L — Conversational AI: "Ask AI" on investor detail page

**What:** A text input on the investor detail page where the user types a natural-language question ("why did Buffett buy OXY?", "what's his thesis on energy?") and gets a Claude response grounded in the actual holding history from the DB.

**Why:** This is the single feature that would make this platform genuinely different from dataroma or any existing 13F tracker. Currently the platform shows data; this would make it explain data.

**Pros:** Dramatically increases the platform's value for actual investment research. Claude already has all the position data in the DB — grounding is straightforward.

**Cons:** AI response quality depends on prompt design and varies by question type. Adds a new API route and a client-side chat UI pattern.

**Context:** Static AI summaries (Cluster 1 in v1.1) must ship first so there's structured JSONB to ground the chat against. The `ai_summaries` table stores `{ summary_cn, bull_points, bear_points, recommendation, key_moves }` — the chat API should include this JSONB plus the last N quarters of position history as context.

Implementation: Add `/api/ai-chat/route.ts` that accepts `{ investor_id, filing_id, question }`, builds a grounded prompt from DB data, calls Claude, and returns the response. Add a simple `<ChatBox />` client component on the investor detail page below the AI summary card.

**Effort:** L (human: ~2 weeks / CC: ~45 min) | **Priority:** P2 | **Depends on:** v1.1 Cluster 1 (AI summaries) must be live

---

## P2/M — Investor name search (efts.sec.gov)

**What:** Instead of requiring users to look up CIK numbers manually on sec.gov, add a search input to the Settings page that queries `efts.sec.gov` by institution name and returns matching CIKs.

**Why:** Lowers the barrier to adding new investors. Currently requires opening a browser, navigating to sec.gov or dataroma, and manually copying a 10-digit number.

**Pros:** Much better UX for adding new investors.

**Cons:** EDGAR's full-text search API (`efts.sec.gov`) has pagination and quirks; some names don't match exactly.

**Context:** The `efts.sec.gov` API endpoint: `https://efts.sec.gov/LATEST/search-index?q=%22institution+name%22&dateRange=custom&startdt=2024-01-01&forms=13F-HR`. Returns filing records with filer CIK and name. Rate limit applies.

**Effort:** M (human: ~1 week / CC: ~30 min) | **Priority:** P2 | **Depends on:** Settings page real-DB migration (in v1.1)

---

## P3/XS — Stock page header enrichment

**What:** Replace the 2-letter gray monogram in the stock page header with richer context: full company name (already stored in `stocks.name_en`), sector tag if available, and optionally market cap from a free API (e.g., Yahoo Finance summary endpoint or Financial Modeling Prep free tier).

**Why:** After adding the Recharts chart, the stock page has a real visual anchor — but the header area looks sparse. A proper company name + sector tag would make the page feel complete rather than placeholder-level.

**Pros:** Better visual hierarchy. The company name is already in the DB (`stocks.name_en`) so no new API needed for the basic improvement.

**Cons:** Full enrichment (sector, market cap) requires a third-party API, adding a dependency. Basic improvement (just show full name prominently) is trivial.

**Context:** The current header shows a `w-12 h-12 rounded-xl bg-gray-100` box with `{ticker.slice(0, 2)}` in gray. After v1.1 ships the Recharts chart, this header area will be visually inconsistent with the rest of the page.

**Effort:** XS for basic (just display name_en prominently); S-M for full enrichment with API | **Priority:** P3 | **Depends on:** Stock page chart (v1.1 Cluster 4)

---

## P3/S — React Query client-side caching (5 minutes)

**What:** Add `@tanstack/react-query` to cache API responses on the client for 5 minutes so navigating back to a page doesn't re-fetch from the DB.

**Why:** Currently every navigation triggers a full server-side DB query. For a personal tool this is fine, but the investor detail page loads ~300ms on Vercel cold starts.

**Pros:** Snappier navigation. Standard pattern.

**Cons:** Adds a dependency and state management layer for a personal tool that may not need it.

**Context:** Only add this if navigation latency becomes noticeable in practice. Confirm with a Vercel speed insight measurement first.

**Effort:** S (human: ~2 days / CC: ~15 min) | **Priority:** P3 | **Depends on:** Nothing
