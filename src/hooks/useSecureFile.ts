/**
 * React hook for secure file access.
 * Provides company/user context automatically from auth.
 */

import { useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import {
  getSecureFileUrl,
  secureDownloadFile,
  type SecureFileContext,
  type FileAccessType,
} from "@/utils/secureFileAccess";

export function useSecureFile() {
  const { user } = useAuth();
  const { company } = useCompany();

  const context: SecureFileContext = useMemo(
    () => ({
      userId: user?.id,
      companyId: company?.id,
    }),
    [user?.id, company?.id]
  );

  const getUrl = useCallback(
    async (
      bucket: string,
      filePath: string,
      opts?: {
        accessType?: FileAccessType;
        expiresIn?: number;
        clientId?: string;
        resourceType?: string;
        resourceId?: string;
      }
    ) => {
      return getSecureFileUrl(
        bucket,
        filePath,
        {
          ...context,
          clientId: opts?.clientId,
          resourceType: opts?.resourceType,
          resourceId: opts?.resourceId,
        },
        opts?.accessType || "view",
        opts?.expiresIn || 300
      );
    },
    [context]
  );

  const download = useCallback(
    async (
      bucket: string,
      filePath: string,
      fileName: string,
      opts?: { clientId?: string; resourceType?: string; resourceId?: string }
    ) => {
      const result = await secureDownloadFile(bucket, filePath, {
        ...context,
        clientId: opts?.clientId,
        resourceType: opts?.resourceType,
        resourceId: opts?.resourceId,
      });

      if (result.blob) {
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }

      return result;
    },
    [context]
  );

  return { getUrl, download, context };
}
