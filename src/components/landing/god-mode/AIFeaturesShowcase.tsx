import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, FileText, Image, TrendingUp } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const features = [
  {
    icon: TrendingUp,
    title: "AI Rate Recommendations",
    description: "Get instant pricing suggestions based on 100,000+ historical campaigns, location data, and market trends.",
    badge: "Smart Pricing",
    color: "text-emerald-500",
    gradient: "from-emerald-500/10 to-emerald-600/5",
    demoImage: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600",
  },
  {
    icon: Brain,
    title: "AI Plan Builder",
    description: "Build optimized media plans in seconds. AI selects best assets based on your budget, target audience, and campaign goals.",
    badge: "Auto-Optimize",
    color: "text-[#2563eb]",
    gradient: "from-[#2563eb]/10 to-[#4f46e5]/5",
    demoImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600",
  },
  {
    icon: FileText,
    title: "AI Lead Parsing",
    description: "Extract client requirements from WhatsApp, emails, and forms. Automatically populate plans with zero manual entry.",
    badge: "Zero Data Entry",
    color: "text-amber-500",
    gradient: "from-amber-500/10 to-amber-600/5",
    demoImage: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600",
  },
  {
    icon: Image,
    title: "AI Proof Analyzer",
    description: "Validate installation photos with computer vision. Detect obstructions, lighting issues, and quality problems automatically.",
    badge: "Vision AI",
    color: "text-purple-500",
    gradient: "from-purple-500/10 to-purple-600/5",
    demoImage: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=600",
  },
];

export const AIFeaturesShowcase = () => {
  const [selectedFeature, setSelectedFeature] = useState<typeof features[0] | null>(null);

  return (
    <section className="py-20 lg:py-32 bg-muted/30 relative overflow-hidden">
      {/* Background Patterns */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(37,99,235,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 bg-[#2563eb]/10 text-[#2563eb] border-[#2563eb]/20">
            <Sparkles className="h-3 w-3 mr-1" />
            Powered by AI
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            AI That Works For You,
            <br />
            Not the Other Way Around
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Save 20+ hours per week with intelligent automation across planning, operations, and analytics
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedFeature(feature)}
            >
              <Card className="cursor-pointer hover:shadow-xl transition-all h-full bg-gradient-to-br from-background to-muted/20 border-2 hover:border-[#2563eb]/20">
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-4 rounded-xl bg-gradient-to-br ${feature.gradient}`}>
                      <feature.icon className={`h-8 w-8 ${feature.color}`} />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {feature.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{feature.description}</p>
                  <div className="text-sm text-[#2563eb] font-medium flex items-center gap-1">
                    See Demo
                    <Sparkles className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Feature Demo Modal */}
      <Dialog open={!!selectedFeature} onOpenChange={() => setSelectedFeature(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-3">
              {selectedFeature && (
                <>
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${selectedFeature.gradient}`}>
                    <selectedFeature.icon className={`h-6 w-6 ${selectedFeature.color}`} />
                  </div>
                  {selectedFeature.title}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedFeature?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            {selectedFeature && (
              <img
                src={selectedFeature.demoImage}
                alt={selectedFeature.title}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="text-center text-sm text-muted-foreground">
            Interactive demo coming soon
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};
