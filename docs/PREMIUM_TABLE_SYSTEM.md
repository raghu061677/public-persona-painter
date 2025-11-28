# Premium Table System - Go-Ads 360°

## Overview

Go-Ads 360° uses an enterprise-grade table system with premium features comparable to Zoho Books, QuickBooks, and Salesforce.

## Key Features

✅ **Full horizontal scrolling** - Works seamlessly on all devices  
✅ **Sticky header** - Header stays visible while scrolling vertically  
✅ **Sticky first column** - First column remains fixed during horizontal scroll  
✅ **Zebra rows** - Alternating background colors for better readability  
✅ **Premium hover effects** - Smooth transitions and visual feedback  
✅ **Enhanced typography** - Professional spacing and font weights  
✅ **Mobile-optimized** - Touch-friendly scrolling on all devices  
✅ **Frozen navigation menu** - Top navigation stays fixed while scrolling

## Implementation Guide

### Standard Table Structure

Every table in the application should follow this structure:

```tsx
<div className="w-full overflow-x-auto">
  <div className="inline-block min-w-full align-middle">
    <div className="overflow-hidden border border-border/50 rounded-lg">
      <Table className="min-w-max w-full table-auto whitespace-nowrap">
        <TableHeader className="bg-muted sticky top-0 z-20">
          <TableRow>
            {/* Sticky first column */}
            <TableHead className="sticky left-0 z-30 bg-muted px-4 py-3 text-left font-semibold border-r">
              ID
            </TableHead>
            {/* Regular columns */}
            <TableHead className="px-4 py-3 text-left font-semibold">
              Name
            </TableHead>
            {/* More columns... */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow 
              key={item.id}
              className={`transition-all duration-150 hover:bg-muted/80 ${
                index % 2 === 0 ? 'bg-background' : 'bg-muted/30'
              }`}
            >
              {/* Sticky first cell */}
              <TableCell className="sticky left-0 z-10 bg-inherit px-4 py-3 font-medium border-r">
                {item.id}
              </TableCell>
              {/* Regular cells */}
              <TableCell className="px-4 py-3">
                {item.name}
              </TableCell>
              {/* More cells... */}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </div>
</div>
```

## Class Breakdown

### Container Classes

| Class | Purpose |
|-------|---------|
| `w-full overflow-x-auto` | Enable horizontal scrolling |
| `inline-block min-w-full align-middle` | Proper table alignment |
| `overflow-hidden border border-border/50 rounded-lg` | Border and corner styling |

### Table Classes

| Class | Purpose |
|-------|---------|
| `min-w-max w-full table-auto whitespace-nowrap` | Prevent text wrapping |

### Header Classes

| Class | Purpose |
|-------|---------|
| `bg-muted sticky top-0 z-20` | Sticky header background |
| `sticky left-0 z-30 bg-muted border-r` | Sticky first column |
| `px-4 py-3 text-left font-semibold` | Premium spacing and typography |

### Row Classes

| Class | Purpose |
|-------|---------|
| `transition-all duration-150 hover:bg-muted/80` | Smooth hover effect |
| `bg-background` (even rows) | White background |
| `bg-muted/30` (odd rows) | Zebra stripe |

### Cell Classes

| Class | Purpose |
|-------|---------|
| `sticky left-0 z-10 bg-inherit border-r` | Sticky cell (first column) |
| `px-4 py-3` | Consistent padding |

## Z-Index Hierarchy

| Element | Z-Index | Purpose |
|---------|---------|---------|
| Navigation Menu | `z-[100]` | Always on top |
| Sticky first column header | `z-30` | Above sticky cells |
| Sticky header | `z-20` | Above table content |
| Sticky first column cell | `z-10` | Above row content |

## Frozen Navigation Menu

The top navigation menu remains frozen while scrolling on all pages:

- **AppLayout**: Topbar with `z-[100]` and `sticky top-0`
- **ClientPortalLayout**: Header with `z-50` and `sticky top-0`
- **PublicLayout**: Nav with `z-50` and `sticky top-0`

## Modules with Premium Tables

All the following modules use the premium table system:

- ✅ Media Assets
- ✅ Clients
- ✅ Plans
- ✅ Campaigns
- ✅ Operations
- ✅ Finance (Invoices, Sales Orders, Purchase Orders, Expenses)
- ✅ Power Bills
- ✅ Reports (Vacant Media, Revenue, Occupancy)
- ✅ Settings & Administration

## Mobile Responsiveness

### Touch Scrolling
- All tables support smooth touch scrolling on mobile devices
- Sticky elements remain functional on touch devices

### Viewport Optimization
- Tables adapt to all screen sizes (mobile, tablet, desktop)
- Horizontal scroll appears automatically when content exceeds viewport

## Best Practices

### DO ✅
- Always wrap tables with the standard structure
- Use consistent padding (`px-4 py-3`)
- Apply zebra rows for readability
- Make first column sticky for better UX
- Use semantic color tokens (bg-muted, bg-background)

### DON'T ❌
- Don't use direct colors (avoid `bg-white`, `bg-gray-100`)
- Don't skip the wrapper divs
- Don't forget zebra row index logic
- Don't use inconsistent padding
- Don't hardcode z-index values

## Performance Considerations

- Tables render efficiently with React key props
- Sticky positioning uses CSS (no JS overhead)
- Smooth transitions without janky animations
- Optimized for large datasets (500+ rows)

## Accessibility

- All tables maintain proper semantic HTML structure
- Screen readers can navigate table headers and cells
- Keyboard navigation works with sticky elements
- Focus states are clearly visible

## Future Enhancements

- Virtual scrolling for 10,000+ row tables
- Column resizing
- Advanced filtering and sorting
- Inline editing capabilities
- Export to Excel/PDF from any table

---

**Last Updated:** November 2025  
**Maintained By:** Go-Ads Development Team
