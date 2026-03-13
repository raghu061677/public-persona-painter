/**
 * CampaignRenewalChain — Shows linked campaigns in a renewal series.
 * Displays on campaign detail page when the campaign is part of a chain.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link2, ArrowRight, Calendar } from "lucide-react";
import { format } from "date-fns";
import { getCampaignStatusColor } from "@/utils/campaigns";

interface ChainCampaign {
  id: string;
  campaign_name: string;
  campaign_code: string | null;
  start_date: string;
  end_date: string;
  status: string;
  parent_campaign_id: string | null;
  campaign_group_id: string | null;
  created_from: string | null;
}

interface CampaignRenewalChainProps {
  campaignId: string;
  campaignGroupId?: string | null;
  parentCampaignId?: string | null;
  createdFrom?: string | null;
}

export function CampaignRenewalChain({
  campaignId,
  campaignGroupId,
  parentCampaignId,
  createdFrom,
}: CampaignRenewalChainProps) {
  const navigate = useNavigate();
  const [chain, setChain] = useState<ChainCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChain();
  }, [campaignId, campaignGroupId, parentCampaignId, createdFrom]);

  const fetchChain = async () => {
    setLoading(true);
    try {
      const linkedCampaigns: ChainCampaign[] = [];

      // Strategy 1: Use campaign_group_id if available
      if (campaignGroupId) {
        const { data } = await supabase
          .from("campaigns")
          .select("id, campaign_name, campaign_code, start_date, end_date, status, parent_campaign_id, campaign_group_id, created_from")
          .eq("campaign_group_id", campaignGroupId)
          .order("start_date", { ascending: true });

        if (data) linkedCampaigns.push(...(data as ChainCampaign[]));
      }

      // Strategy 2: Fallback — walk the created_from chain
      if (linkedCampaigns.length <= 1) {
        linkedCampaigns.length = 0;

        // Walk up to find the root
        let rootId = campaignId;
        const visited = new Set<string>();
        
        // Check parent_campaign_id first
        if (parentCampaignId) {
          rootId = parentCampaignId;
          // Walk further up
          let current = parentCampaignId;
          while (current && !visited.has(current)) {
            visited.add(current);
            const { data } = await supabase
              .from("campaigns")
              .select("id, parent_campaign_id, created_from")
              .eq("id", current)
              .single();
            if (data?.parent_campaign_id) {
              rootId = data.parent_campaign_id;
              current = data.parent_campaign_id;
            } else if (data?.created_from?.startsWith("renewal:")) {
              const parentId = data.created_from.replace("renewal:", "");
              rootId = parentId;
              current = parentId;
            } else {
              break;
            }
          }
        } else if (createdFrom?.startsWith("renewal:")) {
          rootId = createdFrom.replace("renewal:", "");
        }

        // Now find all children from root
        const allInChain = new Set<string>([rootId]);
        const queue = [rootId];

        while (queue.length > 0) {
          const parentId = queue.shift()!;
          
          // Find by parent_campaign_id
          const { data: children1 } = await supabase
            .from("campaigns")
            .select("id")
            .eq("parent_campaign_id", parentId);
          
          // Find by created_from
          const { data: children2 } = await supabase
            .from("campaigns")
            .select("id")
            .eq("created_from", `renewal:${parentId}`);

          const childIds = [
            ...(children1 || []).map(c => c.id),
            ...(children2 || []).map(c => c.id),
          ];

          for (const cid of childIds) {
            if (!allInChain.has(cid)) {
              allInChain.add(cid);
              queue.push(cid);
            }
          }
        }

        if (allInChain.size > 1) {
          const { data } = await supabase
            .from("campaigns")
            .select("id, campaign_name, campaign_code, start_date, end_date, status, parent_campaign_id, campaign_group_id, created_from")
            .in("id", Array.from(allInChain))
            .order("start_date", { ascending: true });

          if (data) linkedCampaigns.push(...(data as ChainCampaign[]));
        }
      }

      setChain(linkedCampaigns.filter(c => linkedCampaigns.length > 1));
    } catch (err) {
      console.error("Error fetching renewal chain:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || chain.length <= 1) return null;

  return (
    <Card className="mb-6 border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          Campaign Series ({chain.length} cycles)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {chain.map((c, idx) => {
            const isCurrent = c.id === campaignId;
            return (
              <div key={c.id} className="flex items-center gap-1">
                <Button
                  variant={isCurrent ? "default" : "outline"}
                  size="sm"
                  className={`text-xs h-auto py-1.5 px-3 ${isCurrent ? "" : "hover:bg-muted"}`}
                  onClick={() => !isCurrent && navigate(`/admin/campaigns/${c.id}`)}
                  disabled={isCurrent}
                >
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="font-medium">{c.campaign_code || c.id.slice(0, 12)}</span>
                    <span className="text-[10px] opacity-70 flex items-center gap-1">
                      <Calendar className="h-2.5 w-2.5" />
                      {format(new Date(c.start_date), "MMM yyyy")}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`ml-2 text-[9px] py-0 px-1.5 ${getCampaignStatusColor(c.status)}`}
                  >
                    {c.status}
                  </Badge>
                </Button>
                {idx < chain.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
