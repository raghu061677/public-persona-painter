import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const CaseStudySection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-[#2563eb]/5 via-transparent to-[#38bdf8]/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 bg-green-500/10 text-green-600 border-green-500/20">
            <TrendingUp className="h-3 w-3 mr-1" />
            Success Story
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Real Results from Real Agencies
          </h2>
          <p className="text-xl text-muted-foreground">
            See how AdVantage Agency grew 300% in 6 months
          </p>
        </motion.div>

        <Card className="overflow-hidden border-2">
          <div className="grid lg:grid-cols-2">
            {/* Left: Before/After */}
            <div className="p-8 lg:p-12 bg-muted/30">
              <h3 className="text-2xl font-bold mb-8">The Transformation</h3>
              
              <div className="space-y-6">
                {/* Before */}
                <div className="bg-background rounded-lg p-6 border">
                  <div className="text-sm text-muted-foreground mb-2">BEFORE</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-3xl font-bold text-muted-foreground">₹18L</div>
                      <div className="text-sm text-muted-foreground">Monthly Revenue</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-muted-foreground">45%</div>
                      <div className="text-sm text-muted-foreground">Close Rate</div>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="p-3 bg-green-500 rounded-full">
                    <ArrowUpRight className="h-6 w-6 text-white" />
                  </div>
                </div>

                {/* After */}
                <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-lg p-6 border-2 border-green-500/20">
                  <div className="text-sm text-green-600 font-semibold mb-2">AFTER 6 MONTHS</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-3xl font-bold text-green-600">₹72L</div>
                      <div className="text-sm text-muted-foreground">Monthly Revenue</div>
                      <Badge className="mt-1 bg-green-500/10 text-green-600 border-green-500/20">
                        +300%
                      </Badge>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-green-600">78%</div>
                      <div className="text-sm text-muted-foreground">Close Rate</div>
                      <Badge className="mt-1 bg-green-500/10 text-green-600 border-green-500/20">
                        +73%
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="mt-8 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">20hrs</div>
                  <div className="text-xs text-muted-foreground">Saved/Week</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">15%</div>
                  <div className="text-xs text-muted-foreground">Higher Margins</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">2.5x</div>
                  <div className="text-xs text-muted-foreground">Team Size</div>
                </div>
              </div>
            </div>

            {/* Right: Chart & Details */}
            <div className="p-8 lg:p-12">
              <h3 className="text-2xl font-bold mb-6">Growth Trajectory</h3>
              
              {/* Animated Chart Placeholder */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="aspect-video bg-gradient-to-br from-[#2563eb]/10 to-[#38bdf8]/10 rounded-lg mb-6 flex items-end justify-around p-4"
              >
                {[20, 30, 45, 60, 80, 100].map((height, index) => (
                  <motion.div
                    key={index}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${height}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    className="w-12 bg-gradient-to-t from-[#2563eb] to-[#38bdf8] rounded-t"
                  />
                ))}
              </motion.div>

              {/* Key Insights */}
              <div className="space-y-4 mb-8">
                <h4 className="font-semibold mb-4">What Made the Difference:</h4>
                {[
                  "AI plan builder reduced quotation time from 4 hours to 15 minutes",
                  "Marketplace exposure connected them with 3 new Fortune 500 clients",
                  "Automated proof system improved client retention by 40%",
                  "Real-time analytics enabled data-driven pricing strategy",
                ].map((insight, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-[#2563eb] mt-2 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">{insight}</p>
                  </motion.div>
                ))}
              </div>

              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="w-full bg-gradient-to-r from-[#2563eb] to-[#4f46e5]"
              >
                Start Your Success Story
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};
