import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TrendingUp, Zap, Shield, Users } from "lucide-react";

const pillars = [
  { icon: TrendingUp, title: "Revenue Growth", description: "Fill more sites per campaign by showing agencies clear corridor options and quick proposals.", color: "text-emerald-500", gradient: "from-emerald-500/10 to-emerald-600/5" },
  { icon: Zap, title: "Time Savings", description: "Turn a location brief into a ready-to-send plan in under 30 minutes.", color: "text-amber-500", gradient: "from-amber-500/10 to-amber-600/5" },
  { icon: Shield, title: "Transparency", description: "Every site, booking, and proof photo is tied to a plan—so no one has to dig through old PDFs.", color: "text-[#2563eb]", gradient: "from-[#2563eb]/10 to-[#4f46e5]/5" },
  { icon: Users, title: "Scalability", description: "Add cities and media types without changing your workflow or Excel templates.", color: "text-purple-500", gradient: "from-purple-500/10 to-purple-600/5" }
];

export const EnhancedValueProposition = () => {
  return (
    <section className="py-20 lg:py-32 bg-muted/30 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#2563eb]/5 via-transparent to-[#38bdf8]/5" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Why Go-Ads 360°?</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">Everything you need to manage, grow, and scale your OOH advertising business</p>
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((pillar, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} whileHover={{ scale: 1.05, y: -5 }}>
              <Card className={`h-full hover:shadow-xl transition-all bg-gradient-to-br ${pillar.gradient} border-2`}>
                <CardHeader>
                  <pillar.icon className={`h-12 w-12 mb-4 ${pillar.color}`} />
                  <h3 className="text-xl font-semibold">{pillar.title}</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{pillar.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
