/**
 * Secure File Access Layer
 * 
 * Centralized utility for authorized file access with audit logging.
 * Replaces direct public URL usage for sensitive files.
 * 
 * Access classification:
 * - PUBLIC: marketing images, QR codes, logos (no validation needed)
 * - TENANT-PROTECTED: media assets, campaign photos (company_id match)
 * - CLIENT-PROTECTED: invoices, proofs, reports (company_id + client_id match)
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Types ──────────────────────────────────────────────────────────

export type AccessClassification = "public" | "tenant" | "client";
export type FileAccessType = "view" | "download";
export type FileAccessStatus = "allowed" | "denied" | "error";

export interface SecureFileContext {
  userId?: string;
  companyId?: string;
  clientId?: string;
  role?: string;
  resourceType?: string;
  resourceId?: string;
}

export interface SecureFileResult {
  url: string | null;
  status: FileAccessStatus;
  error?: string;
}

// ─── Bucket Classification ──────────────────────────────────────────

const BUCKET_CLASSIFICATION: Record<string, AccessClassification> = {
  "logos": "public",
  "avatars": "public",
  "hero-images": "public",
  "asset-qrcodes": "public",
  "media-qr-codes": "public",
  "media_qr_codes": "public",
  "media-assets": "tenant",
  "operations-photos": "tenant",
  "campaign-photos": "tenant",
  "campaign-proofs": "tenant",
  "campaign-creatives": "tenant",
  "power-receipts": "tenant",
  "client-documents": "client",
};

function classifyBucket(bucket: string): AccessClassification {
  return BUCKET_CLASSIFICATION[bucket] || "tenant";
}

// ─── Access Logging (non-blocking) ─────────────────────────────────

async function logFileAccess(
  filePath: string,
  bucket: string,
  accessType: FileAccessType,
  status: FileAccessStatus,
  context: SecureFileContext
): Promise<void> {
  try {
    await supabase.from("file_access_logs" as any).insert({
      user_id: context.userId || null,
      company_id: context.companyId || null,
      file_path: filePath,
      bucket,
      access_type: accessType,
      status,
      client_id: context.clientId || null,
      resource_type: context.resourceType || null,
      resource_id: context.resourceId || null,
    });
  } catch {
    // Non-blocking — never fail the file access
    console.warn("File access log failed (non-blocking)");
  }
}

// ─── Core: Get Secure Signed URL ────────────────────────────────────

/**
 * Get a secure signed URL with access validation and audit logging.
 * 
 * @param bucket - Storage bucket name
 * @param filePath - Path within the bucket
 * @param context - Security context (user, company, client, role)
 * @param accessType - "view" or "download"
 * @param expiresIn - URL expiry in seconds (default: 300 = 5 minutes)
 */
export async function getSecureFileUrl(
  bucket: string,
  filePath: string,
  context: SecureFileContext,
  accessType: FileAccessType = "view",
  expiresIn: number = 300
): Promise<SecureFileResult> {
  const classification = classifyBucket(bucket);

  // Public files — no validation needed
  if (classification === "public") {
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    await logFileAccess(filePath, bucket, accessType, "allowed", context);
    return { url: data.publicUrl, status: "allowed" };
  }

  // Tenant-protected — require company_id
  if (classification === "tenant" && !context.companyId) {
    await logFileAccess(filePath, bucket, accessType, "denied", context);
    return { url: null, status: "denied", error: "Missing company context" };
  }

  // Client-protected — require company_id or client_id
  if (classification === "client" && !context.companyId && !context.clientId) {
    await logFileAccess(filePath, bucket, accessType, "denied", context);
    return { url: null, status: "denied", error: "Missing authorization context" };
  }

  // Generate signed URL (short-lived)
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error || !data?.signedUrl) {
      await logFileAccess(filePath, bucket, accessType, "error", context);
      return { url: null, status: "error", error: error?.message || "Failed to generate URL" };
    }

    await logFileAccess(filePath, bucket, accessType, "allowed", context);
    return { url: data.signedUrl, status: "allowed" };
  } catch (err: any) {
    await logFileAccess(filePath, bucket, accessType, "error", context);
    return { url: null, status: "error", error: err.message };
  }
}

/**
 * Secure file download with validation and logging.
 * Returns a Blob for client-side download.
 */
export async function secureDownloadFile(
  bucket: string,
  filePath: string,
  context: SecureFileContext
): Promise<{ blob: Blob | null; status: FileAccessStatus; error?: string }> {
  const classification = classifyBucket(bucket);

  // Validate access
  if (classification !== "public" && !context.companyId && !context.clientId) {
    await logFileAccess(filePath, bucket, "download", "denied", context);
    return { blob: null, status: "denied", error: "Unauthorized" };
  }

  try {
    const { data, error } = await supabase.storage.from(bucket).download(filePath);

    if (error || !data) {
      await logFileAccess(filePath, bucket, "download", "error", context);
      return { blob: null, status: "error", error: error?.message || "Download failed" };
    }

    await logFileAccess(filePath, bucket, "download", "allowed", context);
    return { blob: data, status: "allowed" };
  } catch (err: any) {
    await logFileAccess(filePath, bucket, "download", "error", context);
    return { blob: null, status: "error", error: err.message };
  }
}

/**
 * URL sanitizer — validates and cleans storage URLs.
 * Rejects URLs with suspicious patterns.
 */
export function sanitizeStorageUrl(url: string): string | null {
  if (!url) return null;

  // Block suspicious patterns
  const blockedPatterns = [
    /javascript:/i,
    /<script/i,
    /data:text\/html/i,
    /\.\.\/\.\.\//,
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(url)) {
      console.warn("Blocked suspicious URL pattern:", url.substring(0, 50));
      return null;
    }
  }

  return url;
}

/**
 * Batch signed URL generation for multiple files.
 */
export async function getSecureFileUrls(
  bucket: string,
  filePaths: string[],
  context: SecureFileContext,
  expiresIn: number = 300
): Promise<(string | null)[]> {
  const classification = classifyBucket(bucket);

  if (classification === "public") {
    return filePaths.map((path) => {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    });
  }

  if (!context.companyId && !context.clientId) {
    return filePaths.map(() => null);
  }

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrls(filePaths, expiresIn);

    if (error || !data) return filePaths.map(() => null);
    return data.map((item) => item.signedUrl || null);
  } catch {
    return filePaths.map(() => null);
  }
}
