# Performance infra checklist (Render + Cloudflare)

These are the changes only you can make (billing + account access). They address
the root cause of the "very difficult to fetch data" problem. Ordered by impact.
The code-side fixes (service worker API caching, shorter timeout + slow-network
message, Redis caching on hot reads) are already merged; they help, but the items
below are where most of the latency actually comes from.

---

## 1. Upgrade the backend off the free plan  ← biggest win

**What:** In `render.yaml`, `pharmacy-aggregator-backend` is `plan: free`
(line 7). Render free web services **spin down after ~15 min idle**. The next
request pays a **30–60s cold start** while the container boots and Django loads.
That single cold start is almost certainly what users experience as "the app is
stuck / won't load data."

**Do:**
- In the Render dashboard, change the backend service to **Starter** (or higher).
  Update `plan: free` → `plan: starter` on line 7 of `render.yaml` and redeploy,
  or change it in the dashboard.
- Starter services do **not** spin down, so there is no cold start.

**Expected impact:** Eliminates the 30–60s "won't load" episodes after idle
periods. This is the change most likely to make the app feel fixed.

---

## 2. Upgrade Redis off the free plan

**What:** `pharmacy-cache` is `plan: free` (line 74). Free Redis has a very small
connection cap and evicts aggressively. The new server-side caching (dashboard
overview, inventory summary) relies on Redis being reachable — on free it may be
evicted or refuse connections under load, silently falling back to hitting
Postgres every time (`IGNORE_EXCEPTIONS: True` hides the failure).

**Do:**
- Upgrade `pharmacy-cache` to a paid Redis tier, or confirm the free instance is
  actually up and reachable from the backend.
- Verify `REDIS_URL` resolves in the backend at runtime. The wiring in
  `render.yaml` (lines 33–46) is correct; the question is whether the instance
  is alive.

**Expected impact:** The caching we added actually takes effect, cutting repeated
Postgres load on dashboards and summaries.

---

## 3. Reduce cross-Atlantic latency (region is `ohio`)

**What:** Backend and worker are in `region: ohio` (lines 6, 80). If users are in
East Africa, every API call crosses the Atlantic — roughly **200–350 ms round
trip before any work happens**. A screen that makes 5–6 calls burns 1–2 seconds
in pure network latency, on top of everything else.

Render has no Africa region, so the realistic levers are:

**Do:**
- Put **Cloudflare (free tier)** in front of the frontend and, ideally, the API.
  Cloudflare terminates TLS at an edge location near the user and reuses a warm
  connection back to Ohio, which cuts perceived latency and adds compression.
- Enable Brotli/gzip compression and HTTP/2 at the edge (Cloudflare does this by
  default once proxied).
- Keep reducing the number of round-trips per screen (batch related reads, rely
  on the client-side React Query + service-worker cache we added).

**Expected impact:** Faster first byte and fewer, cheaper round trips for users
far from Ohio.

---

## 4. Confirm static frontend caching headers

**What:** The frontend is a `static` service (line 51) with a `Cache-Control`
header rule (line 63). Make sure hashed build assets are served with a long
`max-age` (immutable) and that `index.html` is **not** cached long, so new
deploys are picked up.

**Do:**
- Verify in the dashboard / `render.yaml` headers block that JS/CSS assets get a
  long immutable cache and `index.html` gets `no-cache`.
- The service worker (v4) already handles SPA shell + API read caching on the
  client; this just complements it at the CDN layer.

---

## Quick verification after changes

1. **Cold start gone:** leave the app idle 20 min, then load it — first request
   should return in well under a second, not 30–60s.
2. **Redis live:** hit the admin dashboard twice; the second load should be
   noticeably faster and should not re-run the heavy aggregation (check backend
   logs / Redis `INFO keyspace`).
3. **Edge latency:** run `curl -w "%{time_total}\n" -o /dev/null -s <api-url>`
   from a machine near your users before and after Cloudflare.
