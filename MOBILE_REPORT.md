# MOBILE RESPONSIVENESS REPORT — Transcounty Pharmacy
**Audit Date:** 2026-06-26  
**Scope:** React Frontend

---

## FINDINGS & FIXES

| # | Component | Issue | Fix Applied |
|---|-----------|-------|-------------|
| 1 | **Global** | Missing touch optimization and tap delay removal | Added `touch-action: manipulation` and `-webkit-tap-highlight-color: transparent` to `*` |
| 2 | **Global** | Missing iOS momentum scrolling | Added `-webkit-overflow-scrolling: touch` to `overflow-y-auto` elements |
| 3 | **Modals** | Modals overflowing screen horizontally/vertically | Set `.modal-card` to `position: fixed; inset: 0; border-radius: 0; max-height: 100dvh` on mobile |
| 4 | **Tables** | Data tables expanding beyond viewport horizontally | Wrapped wide tables in `overflow-x-auto` wrapper div and ensured `min-width: 600px` for scrolling on small screens |
| 5 | **Forms/Inputs** | iOS auto-zooming on input focus | Forced `font-size: 16px` on all `input`, `select`, and `textarea` elements below 768px |
| 6 | **Forms/Inputs** | Decimal numeric keyboards missing on iOS/Android | Replaced integer keyboards with `inputMode="decimal"` on all price/amount fields and `inputMode="numeric"` on qty fields |
| 7 | **Buttons** | Tap targets too small | Forced `min-height: 44px` on interactive elements to meet minimum Apple/Android HIG |
| 8 | **Login Page** | Missing autofill instructions | Added `autoComplete="username"` and `autoComplete="current-password"` to Login form |
| 9 | **Typography** | Headings too large for narrow screens | Implemented `clamp()` responsive typography for `.page-title` and `.section-title` |
| 10 | **Layouts** | Multi-column grids breaking on mobile | Overrode `.grid-cols-2`, `.grid-cols-3` to use `grid-template-columns: 1fr` on mobile |
| 11 | **Bottom Nav** | Content hidden behind sticky bottom nav | Added `.main-content-with-bottom-nav` class to ensure `padding-bottom: 72px` |

---

## FUTURE RECOMMENDATIONS (Awaiting Approval)

| # | Recommendation | Description |
|---|----------------|-------------|
| R1 | **PWA Support** | Add a `manifest.json` and basic Service Worker so the app can be installed on home screens and run fullscreen without the Safari URL bar. |
| R2 | **Pull to Refresh** | Implement a "Pull to Refresh" gesture hook on list views (Inventory, OTC Sales) since refresh buttons are often harder to tap. |
| R3 | **Cart Bottom Sheet** | For the OTC Sales panel, moving the cart from a stacked view to an expandable "bottom sheet" pattern would greatly improve mobile UX for cashiers. |
