import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { HeroImageCarousel } from "./HeroImageCarousel";

export const HeroCosmicMode = () => {
  const navigate = useNavigate();

  const impactPoints = [
    "Plan campaigns, track bookings, assign mounting, upload proof photos, and share proposals instantly—without touching Excel or WhatsApp.",
    "Built for modern OOH teams who want speed, accuracy, and transparency."
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        {/* Full-width carousel container */}
        <div className="relative h-[600px] lg:h-[700px] w-full">
          <HeroImageCarousel />
          
          {/* Overlay content with transparent glass effect */}
          <div className="absolute inset-0 flex items-center">
            <div className="w-full max-w-3xl mx-auto px-6 md:px-12">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="bg-background/20 dark:bg-background/30 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl"
              >
                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6"
                >
                  <span className="text-white">Accelerate Your Reach</span>
                  <br />
                  <motion.span
                    animate={{
                      backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                    }}
                    transition={{ 
                      backgroundPosition: { duration: 3, repeat: Infinity, ease: "linear" },
                    }}
                    className="bg-gradient-to-r from-[#FFB400] via-[#FFD700] to-[#FFB400] bg-clip-text text-transparent bg-[length:200%_auto]"
                    style={{ filter: "drop-shadow(0 0 20px rgba(255, 180, 0, 0.3))" }}
                  >
                    Across Every City Street
                  </motion.span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="text-lg md:text-xl text-white/90 mb-4 leading-relaxed"
                >
                  Go-Ads 360° is an intelligent OOH workflow platform that helps agencies and media owners plan campaigns faster, organize inventory better, and deliver proof with complete clarity.
                </motion.p>
                
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="text-base md:text-lg text-white/80 mb-6 leading-relaxed"
                >
                  Whether you manage 5 sites or 500, Go-Ads brings everything into one clean, powerful system.
                </motion.p>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="text-base md:text-lg text-white/80 mb-8 leading-relaxed"
                >
                  Plan campaigns, track bookings, assign mounting, upload proof photos, and share proposals instantly—without touching Excel or WhatsApp. Built for modern OOH teams who want speed, accuracy, and transparency.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.7 }}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      size="lg"
                      onClick={() => navigate("/auth")}
                      className="relative px-8 py-6 text-lg font-semibold rounded-xl overflow-hidden bg-gradient-to-r from-[#0064E0] to-[#00A5FF] hover:from-[#0052C9] hover:to-[#0094FF] shadow-lg"
                    >
                      <span className="relative z-10">Start Free 14-Day Trial →</span>
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
                      className="px-8 py-6 text-lg font-semibold border-2 border-white/30 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-sm"
                    >
                      Watch 2-Min Overview →
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-background to-transparent z-5" />
    </section>
  );
};
