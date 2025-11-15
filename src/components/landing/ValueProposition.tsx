import { TrendingUp, Zap, Shield, Users } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const pillars = [
  {
    icon: TrendingUp,
    title: "Revenue Growth",
    description: "Agencies increase close rates by 40% with AI plan builder. Media owners boost occupancy by 25% via marketplace exposure.",
    metric: "₹2.5Cr+ monthly GMV",
    color: "text-emerald-500"
  },
  {
    icon: Zap,
    title: "Time Savings",
    description: "Automated lead parsing, instant quotations, and mobile proof uploads eliminate 80% of manual data entry.",
    metric: "20 hrs saved/week",
    color: "text-amber-500"
  },
  {
    icon: Shield,
    title: "Trust & Transparency",
    description: "Client portals with real-time proof galleries and automated invoicing build trust and reduce payment delays by 30%.",
    metric: "99.9% uptime SLA",
    color: "text-blue-500"
  },
  {
    icon: Users,
    title: "Scalability",
    description: "Multi-tenant architecture supports unlimited users, assets, and campaigns with role-based access control.",
    metric: "50,000+ assets managed",
    color: "text-purple-500"
  }
];

export const ValueProposition = () => {
  return (
    <section className="py-20 lg:py-28 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Go-Ads 360°?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Everything you need to manage, grow, and scale your OOH advertising business
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((pillar, index) => (
            <Card 
              key={index}
              className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-muted ${pillar.color}`}>
                    <pillar.icon className="h-6 w-6" />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {pillar.metric}
                  </Badge>
                </div>
                <h3 className="text-xl font-semibold">{pillar.title}</h3>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{pillar.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
