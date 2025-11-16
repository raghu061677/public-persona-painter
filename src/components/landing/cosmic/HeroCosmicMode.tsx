import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Play, Sparkles, TrendingUp, Users, Building2 } from "lucide-react";
import heroNightHighway from "@/assets/hero-night-highway.png";
import { useEffect, useState } from "react";

export const HeroCosmicMode = () => {
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const rotateX = useTransform(mouseY, [-300, 300], [2, -2]);
  const rotateY = useTransform(mouseX, [-300, 300], [-2, 2]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      mouseX.set(clientX - centerX);
      mouseY.set(clientY - centerY);
      setMousePosition({ x: clientX - centerX, y: clientY - centerY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-14">
      {/* Layer 1: Deep Cosmic Background Gradient */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_30%_20%,#001B4A_0%,#020617_50%,#000000_100%)]" />
      
      {/* Layer 2: Animated Floating Stars */}
      <div className="absolute inset-0 z-[1] overflow-hidden">
        {[...Array(80)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.2,
            }}
            animate={{
              y: [0, Math.random() * 20 - 10, 0],
              x: [0, Math.random() * 20 - 10, 0],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: Math.random() * 8 + 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>
      
      {/* Light Streaks Effect */}
      <div className="absolute inset-0 z-[2] bg-[linear-gradient(45deg,transparent_40%,rgba(37,99,255,0.08)_50%,transparent_60%)] bg-[length:200%_200%] animate-[shimmer_8s_ease-in-out_infinite]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Content with Floating Animation */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-left"
          >
            {/* Badge with Pulse */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563FF]/15 backdrop-blur-sm border border-[#2563FF]/30 text-[#FACC15] mb-8 text-sm font-semibold shadow-sm relative overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-[#2563FF]/20 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
              <Sparkles className="h-4 w-4 relative z-10" />
              <span className="relative z-10">AI-Powered OOH Platform</span>
            </motion.div>

            {/* Headline with Floating Effect */}
            <motion.h1
              className="text-6xl md:text-7xl lg:text-[76px] font-bold text-white mb-6 leading-tight tracking-tight"
              style={{ letterSpacing: '-0.02em' }}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              Accelerate Your Reach
              <br />
              <motion.span
                className="relative inline-block text-[#FACC15]"
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <motion.span
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FFD700]/40 to-transparent blur-sm"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
                <span className="relative">Across Every City Street</span>
              </motion.span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              className="text-xl md:text-2xl lg:text-[26px] text-white/90 mb-10 leading-relaxed max-w-2xl font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              AI-powered OOH platform to plan, book, and track billboards, transit shelters, and street furniture—built for agencies and media owners in India.
            </motion.p>

            {/* CTAs with Enhanced Motion */}
            <div className="flex flex-col sm:flex-row gap-4 mb-14">
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="px-8 py-7 h-auto text-lg font-semibold rounded-[14px] bg-gradient-to-r from-[#0066FF] via-[#0094FF] to-[#00D4FF] hover:shadow-[0_0_30px_rgba(0,148,255,0.6)] transition-all duration-300 relative overflow-hidden group"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  />
                  <span className="relative z-10 flex items-center">
                    Start Free 14-Day Trial
                    <Sparkles className="ml-2 h-5 w-5" />
                  </span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/auth")}
                  className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 px-8 py-7 h-auto text-lg font-medium rounded-[14px] transition-all duration-300"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Watch 2-Min Overview
                </Button>
              </motion.div>
            </div>

            {/* Micro Stats with Drift Animation */}
            <div className="grid grid-cols-3 gap-8">
              {[
                { icon: Building2, value: "50,000+", label: "Media Assets", delay: 0 },
                { icon: Users, value: "2,500+", label: "Media Owners", delay: 0.1 },
                { icon: TrendingUp, value: "10,000+", label: "Agencies", delay: 0.2 },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + stat.delay, duration: 0.4 }}
                  className="text-center"
                >
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: stat.delay }}
                    className="flex justify-center mb-2"
                  >
                    <div className="p-2 bg-gradient-to-br from-[#FACC15]/20 to-[#FACC15]/5 rounded-lg">
                      <stat.icon className="h-5 w-5 text-[#FACC15]" />
                    </div>
                  </motion.div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-white/70">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: Hero Image with 3D Tilt & Parallax */}
          <motion.div
            initial={{ opacity: 0, scale: 1.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            style={{
              rotateX,
              rotateY,
              transformStyle: "preserve-3d",
            }}
            className="relative perspective-1000"
          >
            {/* Cosmic Glow Layers */}
            <motion.div
              className="absolute -inset-6 bg-gradient-to-r from-blue-500/40 via-purple-500/30 to-cyan-500/40 blur-3xl rounded-3xl"
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* Transparent Hero Image Container */}
            <motion.div
              whileHover={{ scale: 1.02, z: 20 }}
              transition={{ duration: 0.3 }}
              className="relative"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Glassmorphic Frame */}
              <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-[24px] border-2 border-white/20 p-4 shadow-[0_8px_20px_rgba(0,85,255,0.25),0_2px_6px_rgba(0,0,0,0.5)]">
                <div className="aspect-[4/3] rounded-[18px] overflow-hidden relative">
                  <motion.img
                    src={heroNightHighway}
                    alt="Go-Ads OOH Media - Night Highway"
                    className="w-full h-full object-cover mix-blend-lighten"
                    style={{
                      filter: "drop-shadow(0 0 25px rgba(0,140,255,0.45)) contrast(1.1) brightness(1.05)",
                    }}
                    animate={{
                      scale: [1, 1.02, 1],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  />
                  {/* Neon Edge Glow */}
                  <div className="absolute inset-0 rounded-[18px] border-2 border-cyan-400/30 pointer-events-none" />
                </div>
                
                {/* Floating Badges with Motion */}
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="absolute -top-3 -right-3 bg-gradient-to-r from-[#005CFF] to-[#00C6FF] text-white px-5 py-2.5 rounded-xl shadow-[0_0_20px_rgba(0,148,255,0.5)] text-sm font-semibold"
                >
                  Live Analytics
                </motion.div>
                <motion.div
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  whileHover={{ scale: 1.05, y: 2 }}
                  className="absolute -bottom-3 -left-3 bg-[#FACC15] text-[#001B4A] px-5 py-2.5 rounded-xl shadow-[0_0_20px_rgba(250,204,21,0.5)] text-sm font-bold"
                >
                  Real-time Tracking
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10" />
    </section>
  );
};
