/**
 * Lead → Client Auto-Merge matching engine
 * Confidence scoring and match detection logic
 */

export interface MatchResult {
  clientId: string;
  clientName: string;
  company: string | null;
  gstNumber: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  confidence: number;
  reason: string;
}

export type MergeStatus = 'unmatched' | 'auto_merged' | 'needs_review' | 'manually_merged' | 'new_client_created';

export function getMergeAction(confidence: number): 'auto_merge' | 'needs_review' | 'create_new' {
  if (confidence >= 90) return 'auto_merge';
  if (confidence >= 60) return 'needs_review';
  return 'create_new';
}

function normalizeStr(s: string | null | undefined): string {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function similarityScore(a: string, b: string): number {
  const na = normalizeStr(a);
  const nb = normalizeStr(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  
  // Simple token overlap similarity
  const tokensA = new Set(na.split(/\s+/));
  const tokensB = new Set(nb.split(/\s+/));
  const intersection = [...tokensA].filter(t => tokensB.has(t)).length;
  const union = new Set([...tokensA, ...tokensB]).size;
  return union > 0 ? intersection / union : 0;
}

function getEmailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : null;
}

interface LeadData {
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  metadata?: Record<string, any> | null;
}

interface ClientData {
  id: string;
  name: string;
  company: string | null;
  gst_number: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  billing_city: string | null;
}

export function scoreMatch(lead: LeadData, client: ClientData): MatchResult | null {
  let bestConfidence = 0;
  let bestReason = '';

  const leadGst = (lead.metadata as any)?.gst || (lead.metadata as any)?.gst_number || null;

  // 1. GST exact match = 100
  if (leadGst && client.gst_number) {
    if (normalizeStr(leadGst) === normalizeStr(client.gst_number)) {
      bestConfidence = 100;
      bestReason = 'gst_match';
    }
  }

  // 2. Email exact match = 95
  if (bestConfidence < 95 && lead.email && client.email) {
    if (normalizeStr(lead.email) === normalizeStr(client.email)) {
      bestConfidence = 95;
      bestReason = 'email_match';
    }
  }

  // 3. Phone exact match = 90
  if (bestConfidence < 90 && lead.phone && client.phone) {
    const normLeadPhone = (lead.phone || '').replace(/[\s\-\(\)\+]/g, '').slice(-10);
    const normClientPhone = (client.phone || '').replace(/[\s\-\(\)\+]/g, '').slice(-10);
    if (normLeadPhone.length >= 10 && normLeadPhone === normClientPhone) {
      bestConfidence = 90;
      bestReason = 'phone_match';
    }
  }

  // 4. Company name exact match = 88
  if (bestConfidence < 88) {
    const leadCompanyName = lead.company || lead.name || '';
    if (normalizeStr(leadCompanyName) === normalizeStr(client.name) || 
        (client.company && normalizeStr(leadCompanyName) === normalizeStr(client.company))) {
      bestConfidence = 88;
      bestReason = 'company_name_match';
    }
  }

  // 5. Similar name + same city = 75
  if (bestConfidence < 75) {
    const leadCompanyName = lead.company || lead.name || '';
    const nameSim = Math.max(
      similarityScore(leadCompanyName, client.name),
      client.company ? similarityScore(leadCompanyName, client.company) : 0
    );
    const leadCity = normalizeStr(lead.location);
    const clientCity = normalizeStr(client.city || client.billing_city);
    const sameCity = leadCity && clientCity && (leadCity.includes(clientCity) || clientCity.includes(leadCity));
    
    if (nameSim >= 0.6 && sameCity) {
      bestConfidence = 75;
      bestReason = 'name_city_match';
    }
  }

  // 6. Same email domain + same city = 70
  if (bestConfidence < 70) {
    const leadDomain = getEmailDomain(lead.email);
    const clientDomain = getEmailDomain(client.email);
    const leadCity = normalizeStr(lead.location);
    const clientCity = normalizeStr(client.city || client.billing_city);
    const sameCity = leadCity && clientCity && (leadCity.includes(clientCity) || clientCity.includes(leadCity));
    
    if (leadDomain && clientDomain && leadDomain === clientDomain && 
        !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(leadDomain) &&
        sameCity) {
      bestConfidence = 70;
      bestReason = 'domain_match';
    }
  }

  // 7. Similar address = 55
  if (bestConfidence < 55 && lead.location && client.address) {
    const addressSim = similarityScore(lead.location, client.address);
    if (addressSim >= 0.5) {
      bestConfidence = 55;
      bestReason = 'address_match';
    }
  }

  if (bestConfidence < 40) return null;

  return {
    clientId: client.id,
    clientName: client.name,
    company: client.company,
    gstNumber: client.gst_number,
    email: client.email,
    phone: client.phone,
    city: client.city,
    confidence: bestConfidence,
    reason: bestReason,
  };
}

export function findBestMatches(lead: LeadData, clients: ClientData[]): MatchResult[] {
  const results: MatchResult[] = [];
  
  for (const client of clients) {
    const match = scoreMatch(lead, client);
    if (match) {
      results.push(match);
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}
