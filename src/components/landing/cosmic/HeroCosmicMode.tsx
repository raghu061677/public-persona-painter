import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Sparkles, TrendingUp, Users, Building2 } from "lucide-react";

export const HeroCosmicMode = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-hero-cosmic pt-14">
      {/* Night Highway Background with Overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=1920')] bg-cover bg-center opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#001B4A]/95 via-[#020617]/90 to-transparent" />
        {/* Light Streaks Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_40%,rgba(37,99,255,0.08)_50%,transparent_60%)] bg-[length:200%_200%] animate-[shimmer_8s_ease-in-out_infinite]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
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
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#2563FF]/15 backdrop-blur-sm border border-[#2563FF]/30 text-[#FFE7A3] mb-6 text-sm shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI-Powered OOH Platform</span>
            </motion.div>

            {/* Headline */}
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight tracking-tight" style={{ letterSpacing: '-0.02em' }}>
              Accelerate Your Reach
              <br />
              <span className="text-[#FFE7A3]">Across Every City Street</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-white/85 mb-8 leading-relaxed max-w-xl font-medium">
              AI-powered OOH platform to plan, book, and track billboards, transit shelters, and street furniture—built for agencies and media owners in India.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Button
                size="lg"
                variant="gradient"
                onClick={() => navigate("/auth")}
                className="px-8 py-6 h-auto text-lg font-semibold rounded-xl shadow-glow"
              >
                Start Free 14-Day Trial
                <Sparkles className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth")}
                className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 px-8 py-6 h-auto text-lg font-medium rounded-xl"
              >
                <Play className="mr-2 h-5 w-5" />
                Watch 2-Min Overview
              </Button>
            </div>

            {/* Micro Stats */}
            <div className="grid grid-cols-3 gap-6">
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
                  <div className="flex justify-center mb-1">
                    <stat.icon className="h-4 w-4 text-[#F7A326]" />
                  </div>
                  <div className="text-xl font-semibold text-white">{stat.value}</div>
                  <div className="text-xs text-white/60">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: Dashboard Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            {/* Glow Effect */}
            <div className="absolute -inset-4 bg-gradient-to-br from-[#2563FF]/25 to-[#F7A326]/15 blur-3xl rounded-3xl" />
            
            {/* Dashboard Screen */}
            <div className="relative bg-gradient-to-br from-[#10243A] to-[#002B7A] rounded-[18px] border-2 border-[#2563FF]/25 p-6 shadow-2xl backdrop-blur-sm">
              <div className="aspect-[4/3] bg-[url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800')] bg-cover bg-center rounded-xl border border-[#2563FF]/20" />
              
              {/* Floating Metrics */}
              <div className="absolute -top-2 -right-2 bg-gradient-to-br from-[#2563FF] to-[#4F8BFF] text-white px-4 py-2 rounded-xl shadow-lg text-sm font-semibold">
                Live Analytics
              </div>
              <div className="absolute -bottom-2 -left-2 bg-[#F7A326] text-white px-4 py-2 rounded-xl shadow-lg text-sm font-semibold">
                Real-time Tracking
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent z-10" />
    </section>
  );
};
