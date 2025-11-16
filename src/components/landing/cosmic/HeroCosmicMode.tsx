import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Sparkles, TrendingUp, Users, Building2 } from "lucide-react";
import heroNightHighway from "@/assets/hero-night-highway.png";

export const HeroCosmicMode = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-14">
      {/* Cinematic Cosmic Background */}
      <div className="absolute inset-0 z-0">
        {/* Deep Space Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#001B4A_0%,#020617_50%,#000000_100%)]" />
        
        {/* Animated Star Field */}
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5 + 0.2,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${Math.random() * 3 + 2}s`,
              }}
            />
          ))}
        </div>
        
        {/* Light Streaks Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_40%,rgba(37,99,255,0.08)_50%,transparent_60%)] bg-[length:200%_200%] animate-[shimmer_8s_ease-in-out_infinite]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-left"
          >
            {/* Badge */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563FF]/15 backdrop-blur-sm border border-[#2563FF]/30 text-[#FACC15] mb-8 text-sm font-semibold shadow-sm"
            >
              <Sparkles className="h-4 w-4" />
              <span>AI-Powered OOH Platform</span>
            </motion.div>

            {/* Headline */}
            <h1 className="text-6xl md:text-7xl lg:text-[76px] font-bold text-white mb-6 leading-tight tracking-tight" style={{ letterSpacing: '-0.02em' }}>
              Accelerate Your Reach
              <br />
              <span className="text-[#FACC15]">Across Every City Street</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl lg:text-[26px] text-white/90 mb-10 leading-relaxed max-w-2xl font-medium">
              AI-powered OOH platform to plan, book, and track billboards, transit shelters, and street furniture—built for agencies and media owners in India.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mb-14">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="px-8 py-7 h-auto text-lg font-semibold rounded-[14px] bg-gradient-to-r from-[#005CFF] via-[#2F86FF] to-[#00C6FF] hover:shadow-glow transition-all duration-300 hover:scale-105"
              >
                Start Free 14-Day Trial
                <Sparkles className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth")}
                className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 px-8 py-7 h-auto text-lg font-medium rounded-[14px] transition-all duration-300 hover:scale-105"
              >
                <Play className="mr-2 h-5 w-5" />
                Watch 2-Min Overview
              </Button>
            </div>

            {/* Micro Stats */}
            <div className="grid grid-cols-3 gap-8">
              {[
                { icon: Building2, value: "50,000+", label: "Media Assets" },
                { icon: Users, value: "2,500+", label: "Media Owners" },
                { icon: TrendingUp, value: "10,000+", label: "Agencies" },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="flex justify-center mb-2">
                    <stat.icon className="h-5 w-5 text-[#FACC15]" />
                  </div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-white/70">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: Hero Image Showcase */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            {/* Cosmic Glow Effect */}
            <div className="absolute -inset-6 bg-gradient-to-r from-blue-500/40 via-purple-500/30 to-cyan-500/40 blur-3xl rounded-3xl" />
            
            {/* Main Image Container with 3D Tilt */}
            <motion.div
              whileHover={{ rotateY: 2, rotateX: -2, scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="relative perspective-1000"
            >
              {/* Glassmorphic Frame */}
              <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-[24px] border-2 border-white/20 p-4 shadow-2xl">
                <div className="aspect-[4/3] rounded-[18px] overflow-hidden">
                  <img
                    src={heroNightHighway}
                    alt="Go-Ads OOH Media - Night Highway"
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Floating Badges */}
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="absolute -top-3 -right-3 bg-gradient-to-r from-[#005CFF] to-[#00C6FF] text-white px-5 py-2.5 rounded-xl shadow-glow text-sm font-semibold"
                >
                  Live Analytics
                </motion.div>
                <motion.div
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="absolute -bottom-3 -left-3 bg-[#FACC15] text-[#001B4A] px-5 py-2.5 rounded-xl shadow-lg text-sm font-bold"
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
