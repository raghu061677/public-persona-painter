import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { WebGLBillboard } from "./WebGLBillboard";

export const HeroCosmicMode = () => {
  const navigate = useNavigate();

  const impactPoints = [
    "Plan multi-city OOH campaigns in minutes, not days",
    "Replace scattered Excel sheets with one live inventory & plan builder",
    "Give clients real proof photos instead of WhatsApp chaos"
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-14">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A1628] via-[#0F1F3D] to-background" />
      
      <div className="absolute inset-0 overflow-hidden opacity-40">
        {[...Array(80)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 0.8, 0],
              scale: [0, 1.2, 0],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6"
            >
              <span className="text-white">Accelerate Your Reach</span>
              <br />
              <motion.span
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                  y: [0, -4, 0]
                }}
                transition={{ 
                  backgroundPosition: { duration: 3, repeat: Infinity, ease: "linear" },
                  y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                }}
                className="bg-gradient-to-r from-[#FACC15] via-[#FFD700] to-[#FACC15] bg-clip-text text-transparent bg-[length:200%_auto]"
                style={{ filter: "drop-shadow(0 0 20px rgba(250, 204, 21, 0.3))" }}
              >
                Across Every City Street
              </motion.span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed"
            >
              The AI-powered OOH platform for agencies and media owners who are done with Excel chaos.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="space-y-3 mb-10"
            >
              {impactPoints.map((point, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-[#10B981] mt-0.5 flex-shrink-0" />
                  <span className="text-white/80 text-sm md:text-base">{point}</span>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="relative px-8 py-6 text-lg font-semibold rounded-xl overflow-hidden"
                  style={{
                    background: "linear-gradient(90deg, #0066FF, #0094FF, #00D4FF)",
                    boxShadow: "0 0 30px rgba(0, 148, 255, 0.5), 0 8px 20px rgba(0, 102, 255, 0.3)",
                  }}
                >
                  <span className="relative z-10 text-white">Start Free Trial</span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                  />
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/marketplace")}
                  className="px-8 py-6 text-lg font-semibold border-2 border-white/30 text-white bg-white/5 backdrop-blur-sm hover:bg-white/10 rounded-xl"
                >
                  Explore Marketplace
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="relative h-[500px] lg:h-[650px]"
          >
            <div className="relative h-full w-full rounded-[32px] overflow-hidden">
              <WebGLBillboard />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-background to-transparent z-5" />
    </section>
  );
};
