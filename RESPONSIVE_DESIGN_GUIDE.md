# Responsive Design Guide - Go-Ads 360°

## Overview
This application is fully responsive and optimized for all screen sizes from mobile (320px) to large desktop screens (2560px+).

## Breakpoints

### Tailwind Default Breakpoints
- **xs**: < 640px (Mobile)
- **sm**: ≥ 640px (Large Mobile / Small Tablet)
- **md**: ≥ 768px (Tablet)
- **lg**: ≥ 1024px (Laptop)
- **xl**: ≥ 1280px (Desktop)
- **2xl**: ≥ 1536px (Large Desktop)

## Responsive Components

### Layout Components

#### AppLayout
- Mobile: Sidebar slides in from left with backdrop overlay
- Desktop: Sidebar remains visible and resizable
- Mobile FAB (Floating Action Button) for quick actions

#### SidebarLayout
- Mobile: Full-width overlay sidebar (hidden by default)
- Desktop: Fixed width sidebar (collapsible to icon-only)
- Smooth transitions between states

#### Topbar
- Mobile: Compact header (h-14) with condensed search
- Desktop: Full header (h-16) with keyboard shortcuts visible
- Responsive action buttons visibility

### UI Components

#### Card
- Automatically adapts width to container
- Hover effects disabled on mobile (no scale transform)
- Touch-optimized spacing

#### ResponsiveCard
- Proper padding adjustments across screen sizes
- Header actions stack on mobile
- Footer becomes full-width on mobile

#### MobileContainer
- Fluid padding: `px-4 sm:px-6 lg:px-8`
- Max width constraint: `max-w-7xl`
- Full-width on mobile with edge-to-edge content

#### ResponsiveGrid
- 1 column on mobile
- 2 columns on tablet (md)
- 3-4 columns on desktop (lg/xl)
- Adaptive gap spacing

#### MobileSheet
- Sheet component on mobile (bottom/side drawer)
- Dialog on desktop (centered modal)
- Automatic adaptation based on screen size

### Form Components

#### Inputs & Buttons
- Increased touch targets on mobile (min 44px)
- `touch-manipulation` for better tap response
- Disabled tap highlight color
- Optimized keyboard for input types

### Table Components

#### ResponsiveTable
- Horizontal scroll on mobile
- Full-width on larger screens
- Shadow and border radius on desktop

#### Media Assets Table
- Column visibility controls
- Horizontal scroll with custom scrollbar
- Mobile-optimized row height

## Typography

### Responsive Font Sizes
- Mobile (< 768px): Base 14px
- Desktop (768px - 1920px): Base 16px
- Large Desktop (> 1920px): Base 18px

### Text Scaling
Use relative units (rem, em) for all text sizes to respect base font size changes.

## Spacing

### Mobile-First Approach
```tsx
// Mobile: 4, Tablet: 6, Desktop: 8
<div className="space-y-4 md:space-y-6 lg:space-y-8">
```

### Container Padding
```tsx
// Mobile edge-to-edge with minimal padding
<div className="px-4 sm:px-6 lg:px-8">
```

## Touch Optimization

### Tap Targets
- Minimum 44px × 44px for all interactive elements
- Increased padding on mobile buttons
- Proper spacing between adjacent touch targets

### Touch Actions
```css
@media (hover: none) and (pointer: coarse) {
  * {
    -webkit-tap-highlight-color: transparent;
  }
  
  button, a, input, select, textarea {
    touch-action: manipulation;
  }
}
```

## Performance Optimizations

### Mobile Specific
- Reduced animations on mobile (optional: `prefers-reduced-motion`)
- Optimized images with proper sizing
- Lazy loading for off-screen content
- Efficient touch event handling

### Viewport
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
```

## Best Practices

### Do's ✅
- Use semantic HTML for better accessibility
- Test on actual devices, not just browser dev tools
- Use `useIsMobile()` hook for conditional rendering
- Apply touch-specific styles with media queries
- Use relative units (rem, em, %) for flexible layouts

### Don'ts ❌
- Don't rely solely on hover states (use `:active` for touch)
- Don't use fixed widths unless absolutely necessary
- Don't ignore landscape orientation on mobile
- Don't use tiny touch targets (< 44px)
- Don't disable zoom unless required for specific UX

## Testing Checklist

### Mobile (320px - 767px)
- [ ] Content fits without horizontal scroll
- [ ] Touch targets are at least 44px
- [ ] Text is readable without zooming
- [ ] Forms are easy to fill
- [ ] Navigation is accessible
- [ ] Images load properly

### Tablet (768px - 1023px)
- [ ] Layout adapts to landscape
- [ ] Sidebar behaves correctly
- [ ] Tables are readable
- [ ] Multi-column layouts work

### Desktop (1024px+)
- [ ] Full feature set is accessible
- [ ] Hover states work properly
- [ ] Keyboard navigation functions
- [ ] Content doesn't stretch too wide
- [ ] Sidebar resizing works

### Large Desktop (1920px+)
- [ ] Content remains centered
- [ ] Text doesn't become too large
- [ ] Images maintain quality
- [ ] Layout doesn't break

## Common Patterns

### Conditional Mobile/Desktop Rendering
```tsx
import { useIsMobile } from "@/hooks/use-mobile";

function MyComponent() {
  const isMobile = useIsMobile();
  
  return isMobile ? <MobileView /> : <DesktopView />;
}
```

### Responsive Spacing
```tsx
<div className="p-3 sm:p-4 md:p-6 lg:p-8">
  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
    Responsive Heading
  </h1>
</div>
```

### Responsive Grid
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

### Responsive Flex
```tsx
<div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
  <div className="flex-1">Content</div>
  <div className="w-full md:w-auto">Actions</div>
</div>
```

## Mobile Navigation Pattern

The app uses a hybrid navigation approach:
1. **Mobile**: Hidden sidebar with toggle + backdrop overlay
2. **Tablet**: Collapsible sidebar (icon-only or full)
3. **Desktop**: Always-visible sidebar with expand/collapse

## Utilities

### Custom Hooks
- `useIsMobile()` - Detects mobile viewport
- `useTableSettings()` - Manages responsive table state

### Custom Components
- `<MobileContainer>` - Responsive container wrapper
- `<MobileStack>` - Vertical spacing component
- `<ResponsiveGrid>` - Adaptive grid layout
- `<MobileSheet>` - Sheet on mobile, Dialog on desktop
- `<ResponsiveTable>` - Mobile-optimized tables
- `<BottomActionBar>` - Mobile-only bottom toolbar

## Resources

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Web.dev - Responsive Web Design](https://web.dev/responsive-web-design-basics/)
- [Material Design - Touch Targets](https://material.io/design/usability/accessibility.html#layout-and-typography)
