# Phase 3: AI Assistant & Business Intelligence

## Overview
Implement an intelligent chat assistant that understands natural language queries and provides real-time business insights from the database.

## Goals
1. Natural language interface for querying business data
2. Support for common queries (vacant media, invoices, clients, campaigns)
3. AI-powered intent detection and response formatting
4. Real-time data fetching and visualization

## Implementation Plan

### Week 1: Backend Infrastructure
- ✅ Database: `ai_assistant_logs` table (already exists)
- [ ] Edge Function: `ask-ai` for query processing
- [ ] Intent detection system (local + AI-powered)
- [ ] Query builders for different data types

### Week 2: Frontend Components
- [ ] Chat interface component
- [ ] Response renderers (tables, cards, text)
- [ ] Query suggestions/shortcuts
- [ ] Integration into main app

### Week 3: Query Types Support
- [ ] Vacant media queries
- [ ] Client summary queries
- [ ] Invoice/payment queries
- [ ] Campaign status queries
- [ ] Expense tracking queries

## Supported Query Examples

### Media Assets
- "How many assets are vacant today?"
- "Show vacant media in Hyderabad"
- "List all available bus shelters in Kukatpally"

### Campaigns
- "Which campaigns are active this week?"
- "Show campaign status for Matrix Enterprises"
- "How many campaigns are running?"

### Finance
- "Show pending invoices for ABC Client"
- "What's the total receivable this month?"
- "List overdue payments"

### Clients
- "Tell me about client XYZ Outdoor Ads"
- "How many active clients do we have?"
- "Show clients by city"

## Technical Architecture

### Intent Detection Flow
1. User enters natural language query
2. Local pattern matching attempts to detect intent
3. If unclear, use Lovable AI (Gemini) for intent parsing
4. Return structured intent: `{ action, filters, format }`

### Query Execution Flow
1. Receive structured intent
2. Build appropriate Supabase query with company_id filter
3. Execute query with RLS enforcement
4. Format results based on response type
5. Return to frontend with metadata

### Response Types
- **table**: For lists of items (assets, campaigns, invoices)
- **cards**: For summary metrics (KPIs, totals, counts)
- **text**: For simple answers or explanations

## Security
- All queries respect RLS policies
- Company_id filtering enforced
- User authentication required
- Query logging for audit trail

## Next Steps
1. Create `ask-ai` Edge Function
2. Implement chat UI component
3. Add query shortcuts
4. Test with sample queries
