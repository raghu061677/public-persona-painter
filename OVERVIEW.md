# Go-Ads 360° - Platform Overview

## What is Go-Ads 360°?

Go-Ads 360° is a comprehensive SaaS platform designed for Out-of-Home (OOH) media management, serving media owners, agencies, and advertising clients. The platform streamlines the entire OOH advertising workflow from lead capture through campaign execution to financial management.

## Core Purpose

The platform solves critical pain points in the OOH advertising industry:
- Manual lead management and tracking
- Inefficient rate negotiations
- Lack of real-time campaign visibility
- Poor proof of performance tracking
- Fragmented financial workflows
- Asset inventory management challenges

## Target Users

1. **Media Owners** - Manage outdoor advertising assets (billboards, hoardings, digital displays)
2. **Advertising Agencies** - Plan and execute OOH campaigns for clients
3. **Brand Clients** - Track outdoor advertising investments with transparency
4. **Operations Teams** - Handle installation, maintenance, and proof uploads
5. **Finance Teams** - Manage quotations, invoices, and payments

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Build**: Vite
- **State**: Zustand for client-side state
- **Maps**: Leaflet for geographic visualization
- **Routing**: React Router DOM

### Backend (Lovable Cloud / Supabase)
- **Database**: PostgreSQL with Row Level Security
- **Authentication**: Email/password with role-based access
- **Storage**: File storage for images, documents, proofs
- **Edge Functions**: Serverless functions for AI, automation
- **Real-time**: Live updates for collaborative features

### AI Integration
- AI-powered rate suggestions
- Lead parsing and extraction
- Proof photo quality validation
- Natural language business queries

## Key Features by Module

### 1. Lead Management
- Multi-channel lead capture (WhatsApp, email, web)
- AI-powered lead parsing
- Lead qualification and conversion
- Automated nurturing

### 2. Client Management
- Complete client database with KYC
- Document management
- Contact person tracking
- GST and billing information

### 3. Media Assets Management
- Comprehensive asset inventory
- Geographic mapping
- Availability tracking
- Pricing and rate card management
- Power bill tracking
- Maintenance records

### 4. Plans & Quotations
- Interactive plan builder
- AI-powered vacant asset suggestions
- Dynamic pricing with prorata calculations
- Rate negotiation tracking
- Multi-format exports (PPT, Excel, PDF)
- Public sharing links
- Approval workflows
- Templates for reusability

### 5. Campaign Management
- Plan-to-campaign conversion
- Asset booking and scheduling
- Creative brief management
- Work order generation
- Installation tracking

### 6. Operations
- Mounter assignment
- Mobile proof upload interface
- 4-photo verification (newspaper, geotag, traffic views)
- EXIF data validation
- Proof of performance generation

### 7. Finance
- Quotation generation
- Invoice management with GST
- Payment tracking
- Expense management
- Integration-ready (Zoho Books)
- Financial year handling (April-March)

### 8. Reports & Analytics
- Vacant media availability
- Campaign performance
- Revenue analytics
- Asset utilization
- Occupancy rates
- Power bills analytics

## User Roles & Permissions

### Admin
- Full system access
- User management
- System configuration
- All CRUD operations

### Sales
- Lead and client management
- Plan creation and quotations
- Campaign viewing
- Client communication

### Operations
- Assigned campaign viewing
- Task management
- Proof upload
- Installation tracking

### Finance
- Invoice management
- Payment tracking
- Expense management
- Financial reporting

### Client (Portal)
- Campaign viewing
- Proof gallery access
- Invoice downloads
- Read-only access

## Data Security

- Row Level Security (RLS) on all tables
- Role-based access control
- Authenticated user sessions
- Audit logging for sensitive operations
- Secure file uploads with validation

## Financial Year System

- Indian financial year (April to March)
- All IDs include FY suffix (e.g., `EST-2024-25-001`)
- Automatic FY calculation
- Period-based reporting

## ID Formats

- **Media Assets**: `{CITY}-{TYPE}-{SEQ}` (e.g., `HYD-UP-0001`)
- **Clients**: `CLI-{SEQ}` (e.g., `CLI-001`)
- **Plans**: `PLAN-{YEAR}-{MONTH}-{SEQ}` (e.g., `PLAN-2024-April-001`)
- **Campaigns**: `CAM-{YEAR}-{MONTH}-{SEQ}`
- **Estimations**: `EST-{FY}-{SEQ}` (e.g., `EST-2024-25-045`)
- **Invoices**: `INV-{FY}-{SEQ}` (e.g., `INV-2024-25-0123`)
- **Expenses**: `EXP-{FY}-{SEQ}`

## Key Workflows

### Lead to Campaign Flow
1. Lead captured → Parsed by AI → Qualified
2. Convert to Client → Add KYC documents
3. Create Plan → Select assets → Negotiate rates
4. Generate Quotation → Share with client
5. Client approves → Convert to Campaign
6. Assign operations → Install assets
7. Upload proof → Generate PoP document
8. Create invoice → Track payment

### Asset Management Flow
1. Add asset → Upload images → Set pricing
2. Track availability → Link power bills
3. Add to plans → Book for campaigns
4. Track maintenance → Record expenses
5. View booking history → Generate reports

### Financial Flow
1. Create plan with pricing
2. Generate estimation/quotation
3. Client approval
4. Campaign execution
5. Track expenses (printing, mounting)
6. Generate invoice with GST
7. Record payments
8. Financial reporting

## Export Capabilities

- **PowerPoint**: Client presentations with asset images
- **Excel**: Detailed pricing breakdowns with GST
- **PDF**: Work orders and invoices
- **ZIP**: Combined campaign documentation

## Real-time Features

- Live plan updates during collaboration
- Asset availability status
- Campaign progress tracking
- Approval workflow notifications

## Offline Support

- Mobile proof upload with offline queue
- Local data caching
- Sync on reconnection

## Integration Points

- Zoho CRM/Books (planned)
- WhatsApp Cloud API (planned)
- Gmail API (planned)
- Payment gateways (planned)

## Performance Optimizations

- Table column visibility preferences
- Filter presets saved per user
- Lazy loading for large datasets
- Image optimization for uploads
- Indexed database queries

## Development Approach

- Component-based architecture
- Type-safe with TypeScript
- Reusable UI components (shadcn/ui)
- Utility-first CSS (Tailwind)
- Server actions for data mutations
- Edge functions for AI and automation

## Project Maturity

The platform is in active development with core modules implemented:
- ✅ Authentication & User Management
- ✅ Media Assets Management
- ✅ Client Management
- ✅ Plans & Quotations
- ✅ Campaign Management
- ✅ Finance Module
- ✅ Reports & Analytics
- 🔄 AI Assistant (partial)
- 🔄 External Integrations (planned)
- 🔄 WhatsApp/Email automation (planned)

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Run development server: `npm run dev`
4. Access at `http://localhost:5173`
5. Default admin login created on first auth signup

## Documentation Structure

- `OVERVIEW.md` - This file, high-level overview
- `docs/SUPABASE_SCHEMA.md` - Complete database schema
- `docs/FLOWS_PLANS.md` - Plans module business logic
- `docs/SOFTGEN_PROJECT_PROMPT.md` - AI project generation prompt
- `PROJECT_SUMMARY.md` - Detailed feature summary
- `PLAN_WORKFLOW_COMPLETE_GUIDE.md` - Plans workflow guide
- `PLANS_MODULE_AUDIT.md` - Plans feature audit
- `CLIENT_MODULE_AUDIT.md` - Client module audit
- `CRUD_OPERATIONS_GUIDE.md` - CRUD patterns guide
- `PLAN_EDITING_GUIDE.md` - Plan editing instructions

## Support & Maintenance

- Active development by Matrix Network Solutions
- Built on Lovable AI platform
- Continuous feature enhancements
- Regular security updates
