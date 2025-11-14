# UI Framework Guide - Go-Ads 360°

## Overview
This guide defines the standardized UI components and patterns used throughout the Go-Ads 360° application to ensure consistency, proper rendering, and optimal user experience across all devices.

## Layout Components

### AppLayout
The main application layout wrapper that provides the overall structure.

**Key Features:**
- Full viewport height with no overflow
- Flexible sidebar integration
- Responsive padding and spacing
- Mobile FAB for quick actions

**Usage:**
```tsx
import AppLayout from "@/layouts/AppLayout";

<AppLayout>
  <YourPageContent />
</AppLayout>
```

### PageContainer
A standardized container for page content with consistent width constraints and padding.

**Props:**
- `maxWidth`: "sm" | "md" | "lg" | "xl" | "2xl" | "full" (default: "2xl")
- `noPadding`: boolean (default: false)

**Usage:**
```tsx
import { PageContainer } from "@/components/ui/page-container";

<PageContainer maxWidth="xl">
  <YourContent />
</PageContainer>
```

### PageHeader
Standardized page header with title, description, and actions.

**Props:**
- `title`: string
- `description`: string
- `actions`: React.ReactNode

**Usage:**
```tsx
import { PageHeader } from "@/components/ui/page-container";

<PageHeader
  title="Media Assets"
  description="Manage your outdoor advertising inventory"
  actions={
    <>
      <Button>Import</Button>
      <Button>New Asset</Button>
    </>
  }
/>
```

### PageContent
Wrapper for page content with loading state support.

**Props:**
- `loading`: boolean

**Usage:**
```tsx
import { PageContent } from "@/components/ui/page-container";

<PageContent loading={isLoading}>
  <YourContent />
</PageContent>
```

## Grid and Layout Components

### ResponsiveGrid
Adaptive grid that adjusts columns based on screen size.

**Props:**
- `cols`: Object with breakpoint-specific column counts
- `gap`: "none" | "xs" | "sm" | "md" | "lg" | "xl"

**Usage:**
```tsx
import { ResponsiveGrid } from "@/components/ui/responsive-grid";

<ResponsiveGrid
  cols={{ default: 1, sm: 2, md: 3, lg: 4 }}
  gap="md"
>
  {items.map(item => <Card key={item.id} {...item} />)}
</ResponsiveGrid>
```

### ResponsiveStack
Vertical stack with consistent spacing.

**Props:**
- `spacing`: "none" | "xs" | "sm" | "md" | "lg" | "xl"
- `divider`: boolean

**Usage:**
```tsx
import { ResponsiveStack } from "@/components/ui/responsive-grid";

<ResponsiveStack spacing="md" divider>
  <Section1 />
  <Section2 />
  <Section3 />
</ResponsiveStack>
```

## Card Components

### Card
Base card component with hover effects.

**Features:**
- Automatic width fitting
- Overflow handling
- Responsive hover effects (disabled on mobile)
- Consistent shadow and border

### ResponsiveCard
Enhanced card with built-in header, content, and footer sections.

**Props:**
- `title`: string
- `description`: string
- `footer`: React.ReactNode
- `headerAction`: React.ReactNode
- `hover`: boolean (default: true)

**Usage:**
```tsx
import { ResponsiveCard } from "@/components/ui/responsive-card";

<ResponsiveCard
  title="Campaign Overview"
  description="Track your campaign performance"
  headerAction={<Button size="sm">View Details</Button>}
  footer={<Button variant="outline" className="w-full">Learn More</Button>}
>
  <YourContent />
</ResponsiveCard>
```

### SectionHeader
Standardized section header for use within pages.

**Props:**
- `title`: string
- `description`: string
- `actions`: React.ReactNode
- `withSeparator`: boolean (default: true)

**Usage:**
```tsx
import { SectionHeader } from "@/components/ui/section-header";

<SectionHeader
  title="Recent Activity"
  description="View your latest actions"
  actions={<Button size="sm">View All</Button>}
/>
```

## Layout Utilities

### Container Widths
```typescript
import { CONTAINER_WIDTHS } from "@/lib/layout-utils";

// Available widths:
CONTAINER_WIDTHS.sm    // 640px
CONTAINER_WIDTHS.md    // 768px
CONTAINER_WIDTHS.lg    // 1024px
CONTAINER_WIDTHS.xl    // 1280px
CONTAINER_WIDTHS["2xl"] // 1536px
CONTAINER_WIDTHS.full  // 100%
```

### Responsive Padding
```typescript
import { getResponsivePadding } from "@/lib/layout-utils";

className={getResponsivePadding("md")}
// Returns: "p-3 sm:p-4 md:p-6 lg:p-8"
```

### Responsive Gap
```typescript
import { getResponsiveGap } from "@/lib/layout-utils";

className={getResponsiveGap("md")}
// Returns: "gap-3 md:gap-4 lg:gap-6"
```

### Grid Columns
```typescript
import { getGridColumns } from "@/lib/layout-utils";

className={getGridColumns({ default: 1, md: 2, lg: 3, xl: 4 })}
// Returns: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
```

## Best Practices

### Width and Height Management
1. **Always use `w-full`** on containers to ensure they fill their parent
2. **Add `min-w-0`** to flex children to prevent overflow issues
3. **Use `shrink-0`** on elements that shouldn't shrink in flex layouts
4. **Add `truncate` or `line-clamp-*`** to prevent text overflow

### Responsive Design
1. **Mobile-first approach**: Start with mobile styles, add breakpoints for larger screens
2. **Use semantic spacing**: Prefer the spacing utilities over hardcoded values
3. **Test at all breakpoints**: 320px, 640px, 768px, 1024px, 1280px, 1536px, 1920px+

### Performance
1. **Minimize unnecessary re-renders**: Use React.memo for expensive components
2. **Lazy load off-screen content**: Use the VirtualTable for large lists
3. **Optimize images**: Always compress and resize appropriately

### Accessibility
1. **Always add `aria-label`** to icon-only buttons
2. **Use semantic HTML**: `<nav>`, `<main>`, `<header>`, `<section>`
3. **Ensure keyboard navigation** works for all interactive elements
4. **Maintain color contrast**: Test with accessibility tools

## Common Patterns

### Standard Page Layout
```tsx
<PageContainer maxWidth="2xl">
  <PageHeader
    title="Page Title"
    description="Page description"
    actions={<Button>Action</Button>}
  />
  
  <PageContent loading={isLoading}>
    <ResponsiveGrid cols={{ default: 1, md: 2, lg: 3 }} gap="md">
      {items.map(item => (
        <ResponsiveCard key={item.id} title={item.name}>
          {item.content}
        </ResponsiveCard>
      ))}
    </ResponsiveGrid>
  </PageContent>
</PageContainer>
```

### Dashboard Layout
```tsx
<PageContainer maxWidth="full">
  <PageHeader title="Dashboard" />
  
  <ResponsiveStack spacing="lg">
    <SectionHeader title="Quick Stats" />
    <ResponsiveGrid cols={{ default: 1, sm: 2, lg: 4 }} gap="md">
      <StatCard />
      <StatCard />
      <StatCard />
      <StatCard />
    </ResponsiveGrid>
    
    <SectionHeader title="Recent Activity" />
    <Card>
      <ActivityList />
    </Card>
  </ResponsiveStack>
</PageContainer>
```

### Form Layout
```tsx
<PageContainer maxWidth="md">
  <PageHeader title="Create New Asset" />
  
  <Card>
    <CardHeader>
      <CardTitle>Asset Details</CardTitle>
    </CardHeader>
    <CardContent>
      <ResponsiveStack spacing="md">
        <FormField />
        <FormField />
        <FormField />
      </ResponsiveStack>
    </CardContent>
    <CardFooter className="justify-end gap-2">
      <Button variant="outline">Cancel</Button>
      <Button>Save</Button>
    </CardFooter>
  </Card>
</PageContainer>
```

## Troubleshooting

### Issue: Horizontal scrollbar appears
**Solution:** Ensure all containers have `overflow-x-hidden` and use `min-w-0` on flex children

### Issue: Content doesn't fill height
**Solution:** Use `h-full` or `flex-1` on the content wrapper and ensure parent has defined height

### Issue: Cards not responsive
**Solution:** Use `ResponsiveCard` or `ResponsiveGrid` instead of manual grid classes

### Issue: Text overflow
**Solution:** Add `truncate` for single line or `line-clamp-*` for multiple lines

### Issue: Mobile layout breaks
**Solution:** Test with `useIsMobile()` hook and adjust layouts accordingly
