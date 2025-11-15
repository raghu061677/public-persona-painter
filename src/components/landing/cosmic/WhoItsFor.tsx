import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Brain, FileCheck, Eye, TrendingUp, Target, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

const agencyFeatures = [
  { icon: Brain, text: "AI plan builder with instant quotes" },
  { icon: FileCheck, text: "White-label client portal" },
  { icon: Eye, text: "Real-time proof galleries" },
];

const ownerFeatures = [
  { icon: Target, text: "Marketplace listings & bookings" },
  { icon: TrendingUp, text: "Dynamic pricing engine" },
  { icon: BarChart3, text: "Occupancy analytics dashboard" },
];

export const WhoItsFor = () => {
  return (
    <section className="py-16 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-semibold mb-3">
            Built for the Entire OOH Ecosystem
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Whether you're an agency planning campaigns or a media owner managing inventory
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* For Agencies */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Card className="h-full border-2 hover:border-primary/50 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-3">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">For Agencies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {agencyFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <feature.icon className="h-3 w-3 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">{feature.text}</p>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="mt-4 text-primary hover:text-primary">
                  Learn more <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* For Media Owners */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Card className="h-full border-2 hover:border-secondary/50 transition-all hover:shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-secondary/10 to-secondary/5 flex items-center justify-center mb-3">
                  <Building2 className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle className="text-2xl">For Media Owners</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ownerFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <feature.icon className="h-3 w-3 text-secondary" />
                    </div>
                    <p className="text-sm text-muted-foreground">{feature.text}</p>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="mt-4 text-secondary hover:text-secondary">
                  Learn more <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const Building2 = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
    <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
    <path d="M10 6h4"/>
    <path d="M10 10h4"/>
    <path d="M10 14h4"/>
    <path d="M10 18h4"/>
  </svg>
);
