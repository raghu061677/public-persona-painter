## Finding

The home page (`/`) and all public pages use `src/layouts/PublicLayout.tsx` → `src/components/landing/cosmic/PremiumFooter.tsx`, which currently has **zero social media icons**. The alternate `god-mode/PremiumFooter.tsx` has only LinkedIn + Twitter. There is no Instagram, Facebook, WhatsApp, or YouTube anywhere on the public site, and no floating WhatsApp chat button.

## Plan

### 1. Add social icons row to the public footer
File: `src/components/landing/cosmic/PremiumFooter.tsx`

- Add an "Follow us" / social row with 4 icon buttons:
  - **Instagram** → `Instagram` icon from lucide-react
  - **Facebook** → `Facebook` icon
  - **WhatsApp** → `MessageCircle` icon (lucide doesn't ship a WhatsApp glyph; use `MessageCircle` styled green, or inline SVG of WhatsApp logo — I'll use an inline brand SVG for accuracy)
  - **LinkedIn** → `Linkedin` icon
- Each icon is a rounded button using semantic tokens (`bg-muted hover:bg-primary/10 text-foreground hover:text-primary`), `target="_blank" rel="noopener noreferrer"`, with `aria-label`.
- URLs come from a single constant block at the top of the file (placeholders for now — easy to swap):
  ```ts
  const SOCIAL_LINKS = {
    instagram: "https://instagram.com/goads360",
    facebook:  "https://facebook.com/goads360",
    whatsapp:  "https://wa.me/919876543210",
    linkedin:  "https://linkedin.com/company/goads360",
  };
  ```
  You can later edit these four lines with your real handles/number.

### 2. Floating WhatsApp chat button on all public pages
New file: `src/components/landing/FloatingWhatsApp.tsx`

- Fixed bottom-right (`fixed bottom-6 right-6 z-50`), 56×56 rounded-full button.
- WhatsApp brand green (`#25D366`), inline WhatsApp SVG, subtle pulse/shadow.
- Tooltip "Chat with us on WhatsApp" on hover.
- `href={SOCIAL_LINKS.whatsapp}` with `?text=Hi%20Go-Ads%20team` prefilled.
- Mounted once inside `src/layouts/PublicLayout.tsx` (so it appears on `/`, `/marketplace`, `/auth`, and every other public route — never inside `AppLayout`, so it won't show in admin).

### 3. URLs are placeholders
Since no real URLs were provided, the four links above will be inserted as placeholders. Update them in `SOCIAL_LINKS` (footer) and `FloatingWhatsApp.tsx` whenever the real handles are ready — one constant per platform, two files only.

### 4. Out of scope (kept untouched)
- Admin/app layout, sidebar, navigation
- `god-mode/PremiumFooter.tsx` (not used by `/`)
- WhatsApp Cloud API integration, settings, ask-ai, business-assistant — unchanged
- No backend, no env, no routes

## Files to modify
- `src/components/landing/cosmic/PremiumFooter.tsx` — add social row
- `src/layouts/PublicLayout.tsx` — mount `<FloatingWhatsApp />`
- `src/components/landing/FloatingWhatsApp.tsx` — new component

## Verification
- Visit `/` → see 4 social icons in footer + floating WhatsApp button bottom-right
- Visit `/admin/...` → no floating button (confirms scope isolation)
- Click each icon → opens correct URL in new tab
