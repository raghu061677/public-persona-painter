import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Award, TrendingUp, Target } from "lucide-react";

interface ScoredLead {
  id: string;
  name: string;
  company: string | null;
  source: string;
  status: string;
  created_at: string;
  score: number;
  scoreBreakdown: {
    source: number;
    engagement: number;
    timing: number;
    profile: number;
  };
}

export function LeadScoring() {
  const [scoredLeads, setScoredLeads] = useState<ScoredLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAndScoreLeads();
  }, []);

  const calculateLeadScore = (lead: any): number => {
    let score = 0;

    // Source scoring (0-25 points)
    const sourceScores: Record<string, number> = {
      referral: 25,
      web: 20,
      email: 15,
      whatsapp: 15,
      manual: 10,
    };
    const sourceScore = sourceScores[lead.source] || 10;
    score += sourceScore;

    // Engagement scoring (0-25 points)
    const engagementScore = lead.status === "contacted" ? 25 : lead.status === "new" ? 10 : 15;
    score += engagementScore;

    // Timing scoring (0-25 points)
    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    const timingScore = Math.max(25 - daysSinceCreated * 2, 0);
    score += timingScore;

    // Profile completeness (0-25 points)
    let profileScore = 0;
    if (lead.company) profileScore += 8;
    if (lead.email) profileScore += 8;
    if (lead.phone) profileScore += 9;
    score += profileScore;

    return Math.min(score, 100);
  };

  const loadAndScoreLeads = async () => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .in("status", ["new", "contacted", "qualified"]);

      if (error) throw error;

      const scored = data?.map((lead) => {
        const score = calculateLeadScore(lead);
        return {
          ...lead,
          score,
          scoreBreakdown: {
            source: Math.round(score * 0.25),
            engagement: Math.round(score * 0.25),
            timing: Math.round(score * 0.25),
            profile: Math.round(score * 0.25),
          },
        };
      }) || [];

      scored.sort((a, b) => b.score - a.score);
      setScoredLeads(scored);
    } catch (error) {
      console.error("Error loading leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Hot";
    if (score >= 60) return "Warm";
    if (score >= 40) return "Cool";
    return "Cold";
  };

  if (loading) {
    return <div className="text-center py-8">Calculating lead scores...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hot Leads</CardTitle>
            <Award className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {scoredLeads.filter((l) => l.score >= 80).length}
            </div>
            <p className="text-xs text-muted-foreground">Score 80+</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warm Leads</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {scoredLeads.filter((l) => l.score >= 60 && l.score < 80).length}
            </div>
            <p className="text-xs text-muted-foreground">Score 60-79</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cool Leads</CardTitle>
            <Target className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {scoredLeads.filter((l) => l.score < 60).length}
            </div>
            <p className="text-xs text-muted-foreground">Score below 60</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lead Scores & Priority</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {scoredLeads.map((lead) => (
            <div key={lead.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{lead.name}</h4>
                  {lead.company && (
                    <p className="text-sm text-muted-foreground">{lead.company}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${getScoreColor(lead.score)}`}>
                    {lead.score}
                  </div>
                  <Badge
                    variant="outline"
                    className={getScoreColor(lead.score)}
                  >
                    {getScoreLabel(lead.score)}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overall Score</span>
                  <span className="font-medium">{lead.score}/100</span>
                </div>
                <Progress value={lead.score} className="h-2" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Source</div>
                  <div className="font-medium">{lead.scoreBreakdown.source}/25</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Engagement</div>
                  <div className="font-medium">{lead.scoreBreakdown.engagement}/25</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Timing</div>
                  <div className="font-medium">{lead.scoreBreakdown.timing}/25</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Profile</div>
                  <div className="font-medium">{lead.scoreBreakdown.profile}/25</div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
