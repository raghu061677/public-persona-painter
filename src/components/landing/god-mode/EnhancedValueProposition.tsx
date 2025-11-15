import { motion, useInView } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TrendingUp, Zap, Shield, Users } from "lucide-react";
import { useRef, useEffect, useState } from "react";

const pillars = [
  {
    icon: TrendingUp,
    title: "Revenue Growth",
    description: "Agencies increase close rates by 40% with AI plan builder. Media owners boost occupancy by 25% via marketplace exposure.",
    value: 250,
    suffix: "Cr+",
    label: "Monthly GMV",
    color: "text-emerald-500",
    gradient: "from-emerald-500/10 to-emerald-600/5",
  },
  {
    icon: Zap,
    title: "Time Savings",
    description: "Automated lead parsing, instant quotations, and mobile proof uploads eliminate 80% of manual data entry.",
    value: 20,
    suffix: "hrs",
    label: "Saved Per Week",
    color: "text-amber-500",
    gradient: "from-amber-500/10 to-amber-600/5",
  },
  {
    icon: Shield,
    title: "Transparency",
    description: "Client portals with real-time proof galleries and automated invoicing build trust and reduce payment delays by 30%.",
    value: 99.9,
    suffix: "%",
    label: "Uptime SLA",
    color: "text-[#2563eb]",
    gradient: "from-[#2563eb]/10 to-[#4f46e5]/5",
  },
  {
    icon: Users,
    title: "Scalability",
    description: "Multi-tenant architecture supports unlimited users, assets, and campaigns with role-based access control.",
    value: 50000,
    suffix: "+",
    label: "Assets Managed",
    color: "text-purple-500",
    gradient: "from-purple-500/10 to-purple-600/5",
  }
];

const Counter = ({ value, suffix, inView }: { value: number; suffix: string; inView: boolean }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, inView]);

  return (
    <div className="text-4xl font-bold">
      {value === 99.9 ? count.toFixed(1) : count.toLocaleString()}
      {suffix}
    </div>
  );
};

export const EnhancedValueProposition = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  return (
    <section ref={ref} className="py-20 lg:py-32 bg-muted/30 relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2563eb]/5 via-transparent to-[#38bdf8]/5" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Why Go-Ads 360°?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Everything you need to manage, grow, and scale your OOH advertising business
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((pillar, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
            >
              <Card className={`h-full hover:shadow-xl transition-all bg-gradient-to-br ${pillar.gradient} border-2`}>
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-4 rounded-xl bg-gradient-to-br ${pillar.gradient} border`}>
                      <pillar.icon className={`h-8 w-8 ${pillar.color}`} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">{pillar.title}</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                    {pillar.description}
                  </p>
                  
                  {/* Animated Counter */}
                  <div className="pt-4 border-t">
                    <Counter value={pillar.value} suffix={pillar.suffix} inView={inView} />
                    <div className="text-xs text-muted-foreground mt-1">{pillar.label}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
