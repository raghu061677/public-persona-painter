

## Create GO-ADS Public Website Pages

### Overview
Create 8 new public-facing pages (mapped to 10 content sections) for the GO-ADS platform. All pages will use the existing `PublicLayout` wrapper (which provides the nav bar, announcement banner, and footer) and follow the same design language as the Landing page -- Tailwind + shadcn/ui, framer-motion animations, enterprise-grade aesthetic.

### Route Structure

| Route | Page Component | Content Sections |
|-------|---------------|-----------------|
| `/about` | About.tsx | About GO-ADS |
| `/our-story` | OurStory.tsx | Origin story |
| `/team` | Team.tsx | Team overview |
| `/careers` | CareersAndFeatures.tsx | Careers + Features (combined) |
| `/campaign-planning` | CampaignPlanning.tsx | Campaign planning feature |
| `/asset-management` | AssetManagement.tsx | Asset management feature |
| `/proof-collection` | ProofAndContact.tsx | Proof collection + Contact (combined) |
| `/support` | Support.tsx | Support offerings |
| `/sales` | Sales.tsx | Sales / demo requests |
| `/partners` | Partners.tsx | Partnership opportunities |

### Files to Create (10 new page files)

1. **`src/pages/public/About.tsx`** -- Mission statement, what GO-ADS is, key value props
2. **`src/pages/public/OurStory.tsx`** -- Timeline-style narrative of how GO-ADS was born
3. **`src/pages/public/Team.tsx`** -- Multidisciplinary team description (no individual names, role-based)
4. **`src/pages/public/CareersAndFeatures.tsx`** -- Two-section page: open positions invite + feature summary grid
5. **`src/pages/public/CampaignPlanning.tsx`** -- Feature deep-dive: asset discovery, flexible durations, pricing, exports
6. **`src/pages/public/AssetManagement.tsx`** -- Feature deep-dive: inventory, availability, history, QR codes
7. **`src/pages/public/ProofAndContact.tsx`** -- Two-section: proof collection workflow + Matrix Network Solutions contact details
8. **`src/pages/public/Support.tsx`** -- Support tiers: onboarding, guidance, issue resolution
9. **`src/pages/public/Sales.tsx`** -- Demo request section, consultative sales messaging
10. **`src/pages/public/Partners.tsx`** -- Partnership types + Matrix Network Solutions as strategic partner

### Files to Modify (3 existing files)

1. **`src/App.tsx`** -- Add lazy imports for all 10 new pages; add 10 new `<Route>` entries wrapped in `<PublicLayout>`
2. **`src/lib/routes.ts`** -- Add route constants for all new public pages
3. **`src/components/landing/cosmic/PremiumFooter.tsx`** -- Wire all footer link buttons to navigate to the new routes

### Design Approach

Each page will follow this consistent structure:

```text
+----------------------------------------------+
|  Hero Banner (gradient bg, title, subtitle)  |
+----------------------------------------------+
|  Content Sections (cards, grids, or lists)   |
|  using motion.div for scroll-in animations   |
+----------------------------------------------+
|  CTA Section (Get Started / Contact)         |
+----------------------------------------------+
```

- Use `framer-motion` for `whileInView` entrance animations (matching Landing page sections)
- Use Lucide icons for visual anchors in feature/benefit cards
- Use the existing color palette: Deep Blue (#1E40AF), Gold (#F4C542), gradients from Landing
- Enterprise tone throughout, no emojis, short paragraphs, scannable headings
- Responsive: desktop-first grid layouts that stack on mobile
- All pages wrapped in `PublicLayout` so they get the shared nav + footer automatically

### Content Details per Page

**About** -- 3 sections: Hero with mission, "What We Do" grid (4 cards), "Built for Scale" metrics strip

**Our Story** -- Timeline with 4 milestones: The Challenge, The Idea, Building the Platform, Where We Are Today

**Team** -- 4 role-based cards: OOH Domain Experts, Technology & Engineering, Campaign Operations, Strategic Leadership. Each with icon, title, description. No names.

**Careers + Features** -- Split page. Top half: careers invitation with "Why Join Us" benefits. Bottom half: 6-card feature grid (Campaign Planning, Asset Management, Proof of Execution, Reporting & Exports, GST & Finance, AI Assistant)

**Campaign Planning** -- Feature hero + 4-step workflow cards (Discover Assets, Plan Campaigns, Manage Pricing, Generate Proposals)

**Asset Management** -- Feature hero + 4 capability cards (Centralized Inventory, Availability Tracking, Historical Performance, QR-Based Identification)

**Proof & Contact** -- Two distinct sections. Proof: 4 capability cards (Mobile Uploads, Geo-tagged Images, Campaign Galleries, Auto-generated PPTs). Contact: Matrix Network Solutions address card with map placeholder and phone number.

**Support** -- 4 support pillars as cards (Onboarding, Product Guidance, Issue Resolution, Ongoing Assistance)

**Sales** -- Hero with "See GO-ADS in Action" + 3 benefit cards + CTA to navigate to `/auth`

**Partners** -- 3 partnership types (Media Owners, Agencies, Enterprise) + Matrix Network Solutions highlighted as principal strategic partner

### Technical Details

**Route Registration in App.tsx:**
```tsx
// New public page lazy imports
const About = lazy(() => import("./pages/public/About"));
const OurStory = lazy(() => import("./pages/public/OurStory"));
// ... (8 more)

// Inside <Routes>, after existing public routes:
<Route path="/about" element={<PublicLayout><About /></PublicLayout>} />
<Route path="/our-story" element={<PublicLayout><OurStory /></PublicLayout>} />
<Route path="/team" element={<PublicLayout><Team /></PublicLayout>} />
<Route path="/careers" element={<PublicLayout><CareersAndFeatures /></PublicLayout>} />
<Route path="/campaign-planning" element={<PublicLayout><CampaignPlanning /></PublicLayout>} />
<Route path="/asset-management" element={<PublicLayout><AssetManagement /></PublicLayout>} />
<Route path="/proof-collection" element={<PublicLayout><ProofAndContact /></PublicLayout>} />
<Route path="/support" element={<PublicLayout><Support /></PublicLayout>} />
<Route path="/sales" element={<PublicLayout><Sales /></PublicLayout>} />
<Route path="/partners" element={<PublicLayout><Partners /></PublicLayout>} />
```

**Footer Link Wiring in PremiumFooter.tsx:**
Each existing footer button (Our Story, Team, Careers, Campaign Planning, etc.) will get an `onClick={() => navigate("/route")}` handler pointing to the correct new page.

**Route Constants in routes.ts:**
```typescript
// Public Website Pages
ABOUT: "/about",
OUR_STORY: "/our-story",
TEAM: "/team",
CAREERS: "/careers",
CAMPAIGN_PLANNING: "/campaign-planning",
ASSET_MANAGEMENT: "/asset-management",
PROOF_COLLECTION: "/proof-collection",
SUPPORT: "/support",
SALES: "/sales",
PARTNERS: "/partners",
```

### What This Does NOT Touch
- No database or backend changes
- No authentication changes
- No admin/dashboard pages
- No existing Landing page content
- No business logic modifications

