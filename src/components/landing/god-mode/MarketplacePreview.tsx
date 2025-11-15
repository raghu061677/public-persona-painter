import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, TrendingUp, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

const topCorridors = [
  { name: "Mumbai - Western Express Highway", count: 2847, trend: "+12%" },
  { name: "Delhi - Outer Ring Road", count: 1923, trend: "+8%" },
  { name: "Hyderabad - HITEC City Corridor", count: 1456, trend: "+15%" },
  { name: "Bangalore - Outer Ring Road", count: 1789, trend: "+10%" },
  { name: "Chennai - OMR Corridor", count: 1234, trend: "+7%" },
];

const categories = [
  { name: "Billboards", count: 15420, icon: "🏢" },
  { name: "Bus Shelters", count: 18930, icon: "🚌" },
  { name: "Unipoles", count: 8750, icon: "📍" },
  { name: "Digital Screens", count: 6900, icon: "📺" },
];

export const MarketplacePreview = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 lg:py-32 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2563eb]/5 via-transparent to-[#38bdf8]/5" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 bg-[#2563eb]/10 text-[#2563eb] border-[#2563eb]/20">
            <MapPin className="h-3 w-3 mr-1" />
            India's Largest OOH Marketplace
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Discover 50,000+ Premium
            <br />
            Media Assets Across India
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Access the largest inventory of billboards, bus shelters, and digital screens
            with real-time availability and AI-powered recommendations
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Map Preview */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="aspect-[4/3] bg-gradient-to-br from-[#2563eb]/20 to-[#38bdf8]/20 rounded-2xl border-2 border-[#2563eb]/20 p-8 backdrop-blur-sm">
              {/* Placeholder Map */}
              <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800')] bg-cover bg-center rounded-lg opacity-40" />
              
              {/* Floating Stat Cards */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute top-12 right-12 bg-background/95 backdrop-blur-md px-4 py-3 rounded-lg shadow-lg border"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-semibold">2,847 assets</span>
                </div>
                <p className="text-xs text-muted-foreground">Mumbai Corridor</p>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                className="absolute bottom-12 left-12 bg-background/95 backdrop-blur-md px-4 py-3 rounded-lg shadow-lg border"
              >
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[#2563eb]" />
                  <span className="text-sm font-semibold">95% Occupancy</span>
                </div>
                <p className="text-xs text-muted-foreground">Premium Zones</p>
              </motion.div>
            </div>
          </motion.div>

          {/* Categories */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <h3 className="text-2xl font-bold mb-6">Browse by Category</h3>
            <div className="grid grid-cols-2 gap-4">
              {categories.map((category, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  className="bg-card border rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all"
                >
                  <div className="text-4xl mb-3">{category.icon}</div>
                  <div className="text-2xl font-bold mb-1">{category.count.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">{category.name}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Top Corridors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-card border rounded-2xl p-8"
        >
          <h3 className="text-2xl font-bold mb-6">🔥 Top Performing Corridors</h3>
          <div className="grid md:grid-cols-5 gap-4">
            {topCorridors.map((corridor, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="bg-gradient-to-br from-[#2563eb]/5 to-[#38bdf8]/5 rounded-lg p-4 border border-[#2563eb]/10 cursor-pointer"
              >
                <Badge className="mb-2 bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                  {corridor.trend}
                </Badge>
                <div className="text-lg font-bold mb-1">{corridor.count}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{corridor.name}</div>
              </motion.div>
            ))}
          </div>
          <div className="flex justify-center mt-8">
            <Button
              size="lg"
              onClick={() => navigate("/marketplace")}
              className="bg-gradient-to-r from-[#2563eb] to-[#4f46e5] hover:opacity-90"
            >
              Explore Full Marketplace →
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
