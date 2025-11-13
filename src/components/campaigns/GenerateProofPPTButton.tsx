import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { generateProofOfDisplayPPT } from "@/lib/operations/generateProofPPT";

interface GenerateProofPPTButtonProps {
  campaignId: string;
  campaignName: string;
  disabled?: boolean;
}

export function GenerateProofPPTButton({
  campaignId,
  campaignName,
  disabled = false,
}: GenerateProofPPTButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      await generateProofOfDisplayPPT(campaignId);
      
      toast({
        title: "PPT Generated Successfully",
        description: `Proof of Display report for ${campaignName} has been downloaded.`,
      });
    } catch (error) {
      console.error("Error generating PPT:", error);
      
      let errorMessage = "Failed to generate PPT. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes("No photos available")) {
          errorMessage = "No photos available for this campaign. Please upload proof photos first.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleGenerate}
      disabled={disabled || isGenerating}
      variant="default"
      size="default"
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating PPT...
        </>
      ) : (
        <>
          <FileDown className="mr-2 h-4 w-4" />
          Download Proof of Display PPT
        </>
      )}
    </Button>
  );
}
