import { motion } from "framer-motion";
import { UserPlus, Upload, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const steps = [
  { icon: UserPlus, number: 1, title: "Sign Up in 2 Minutes", description: "Choose Agency or Media Owner, invite your team, and set basic permissions." },
  { icon: Upload, number: 2, title: "Add or Import Your Inventory", description: "Upload a simple Excel of your hoardings, bus shelters, and unipoles to get started." },
  { icon: Rocket, number: 3, title: "Launch Your First Campaign", description: "Build a plan, assign mounting, upload proofs, and share a link or PPT with your client." },
];

export const CompactSteps = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-semibold mb-3">Get Started in Minutes</h2>
          <p className="text-base text-muted-foreground">From signup to your first campaign in under 15 minutes</p>
        </motion.div>
        <div className="relative">
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-secondary to-primary opacity-20 transform -translate-y-1/2" />
          <div className="grid lg:grid-cols-3 gap-6 relative z-10">
            {steps.map((step, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} className="relative">
                <div className="bg-background border-2 rounded-xl p-6 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">{step.number}</div>
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                      <step.icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
          <Button size="lg" onClick={() => navigate("/auth")} className="bg-gradient-to-r from-primary to-[#1D73E8] hover:opacity-90 rounded-full">Start Free Agency Trial →</Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="rounded-full">List Your First Asset Free →</Button>
        </div>
      </div>
    </section>
  );
};
