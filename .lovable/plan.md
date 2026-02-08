

## Fix Landing Page Scroll + Mobile Navigation

### Problem
The landing page stops scrolling after the "Why Go-Ads Exists" section. On mobile Safari, the menu buttons are not visible/accessible.

### Root Causes

1. **DaisyUI overflow variable**: The override sets `--page-overflow: visible`, but `overflow: visible` on the root element does NOT produce a scrollbar -- it must be `auto` or `scroll` to allow the user to scroll through overflowing content.

2. **Nested scroll trap**: The Landing page wrapper `<div className="overflow-x-hidden">` implicitly converts `overflow-y` from `visible` to `auto` (CSS spec behavior). This creates a second scroll container inside the document, which can fight with the browser's viewport scroll and cause content to appear stuck.

3. **Mobile nav clipping**: The hamburger menu button lacks explicit width/height constraints, and on very small screens the nav items can get pushed off-screen.

### Plan

#### 1. Fix `src/index.css` -- DaisyUI overflow override (lines 576-585)

Change `--page-overflow` from `visible` to `auto` so the root element actually enables scrolling:

```css
:root {
  --page-overflow: auto !important;
}

html {
  min-height: 100% !important;
  min-height: -webkit-fill-available !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
}
```

Also add explicit `body` and `#root` overrides outside `@layer` to guarantee no scroll blocking:

```css
body {
  overflow-x: hidden !important;
  overflow-y: auto !important;
  min-height: 100% !important;
}

#root {
  min-height: 100% !important;
  overflow: visible !important;
}
```

#### 2. Fix `src/pages/Landing.tsx` -- Remove nested scroll container

Remove `overflow-x-hidden` from the Landing page wrapper div. The html/body already handle `overflow-x: hidden`, so the Landing page does not need its own. This eliminates the nested scroll trap:

```diff
- <div className="min-h-screen bg-background overflow-x-hidden">
+ <div className="min-h-screen bg-background">
```

#### 3. Fix `src/layouts/PublicLayout.tsx` -- Same nested scroll fix

Remove `overflow-x-hidden` from the PublicLayout wrapper for the same reason:

```diff
- <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
+ <div className="min-h-screen flex flex-col bg-background">
```

#### 4. Fix mobile nav in `src/pages/Landing.tsx` -- Ensure menu button visibility

Add explicit sizing and flex-shrink-0 to the mobile hamburger menu button so it never gets clipped:

```tsx
<button className="p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center">
  <Menu className="h-6 w-6" />
</button>
```

Also ensure the mobile nav container doesn't overflow:

```tsx
<div className="md:hidden flex items-center gap-2 flex-shrink-0">
```

### Files Changed
- `src/index.css` -- Fix DaisyUI overflow variable and add body/#root overrides outside @layer
- `src/pages/Landing.tsx` -- Remove overflow-x-hidden, fix mobile menu button sizing
- `src/layouts/PublicLayout.tsx` -- Remove overflow-x-hidden

### What This Does NOT Touch
- No database/Supabase changes
- No business logic changes
- No billing, invoices, campaigns, or plan logic
- No component refactoring outside of these 3 files

