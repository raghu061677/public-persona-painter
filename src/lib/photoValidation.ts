import { supabase } from "@/integrations/supabase/client";

export interface PhotoValidationResult {
  score: number;
  quality: "excellent" | "good" | "acceptable" | "poor";
  approved: boolean;
  issues: string[];
  suggestions: string[];
}

export async function validateProofPhoto(
  imageUrl: string,
  photoType: "Newspaper" | "Geo-Tagged" | "Traffic" | "Other"
): Promise<PhotoValidationResult> {
  try {
    const { data, error } = await supabase.functions.invoke("validate-proof-photo", {
      body: { imageUrl, photoType },
    });

    if (error) {
      console.error("Photo validation error:", error);
      
      // Return a default passing score if validation fails
      return {
        score: 50,
        quality: "acceptable",
        approved: true,
        issues: ["Validation service unavailable"],
        suggestions: ["Manual review recommended"],
      };
    }

    return data as PhotoValidationResult;
  } catch (error) {
    console.error("Photo validation error:", error);
    
    // Return a default passing score if validation fails
    return {
      score: 50,
      quality: "acceptable",
      approved: true,
      issues: ["Validation service error"],
      suggestions: ["Manual review recommended"],
    };
  }
}
