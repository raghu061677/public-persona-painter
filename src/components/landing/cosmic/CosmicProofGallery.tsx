import { motion } from "framer-motion";
import { MapPin, Maximize2, Download, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MediaAsset {
  id: string;
  image: string;
  city: string;
  area: string;
  dimensions: string;
  illumination_type: string | null;
}

export const CosmicProofGallery = () => {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicAssets = async () => {
      try {
        const { data: mediaAssets, error: assetsError } = await supabase
          .from('media_assets')
          .select('id, city, area, dimensions, illumination_type, primary_photo_url')
          .eq('is_public', true)
          .limit(9);

        if (assetsError) throw assetsError;

        const assetsWithPhotos = (mediaAssets || []).map((asset) => ({
          id: asset.id,
          image: asset.primary_photo_url || '/placeholder.svg',
          city: asset.city,
          area: asset.area,
          dimensions: asset.dimensions,
          illumination_type: asset.illumination_type || 'Standard',
        }));

        setAssets(assetsWithPhotos);
      } catch (error) {
        console.error('Error fetching public assets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicAssets();
  }, []);

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Cosmic Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#001B4A]/30 via-transparent to-[#001B4A]/30" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,255,0.1)_0%,transparent_70%)]" />
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Live Asset <span className="text-[#FACC15]">Portfolio</span>
          </h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Real installations across premium locations with verified proof of performance
          </p>
        </motion.div>

        {/* Gallery Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="relative">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[20px] overflow-hidden h-[400px] animate-pulse">
                  <div className="h-64 bg-white/10" />
                  <div className="p-5">
                    <div className="h-4 bg-white/10 rounded mb-2" />
                    <div className="h-4 bg-white/10 rounded w-3/4" />
                  </div>
                </div>
              </div>
            ))
          ) : assets.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-white/60 text-lg">No public assets available at the moment.</p>
            </div>
          ) : (
            assets.map((asset, index) => (
            <motion.div
              key={asset.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              className="group relative"
            >
              {/* Glow Ring */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-[20px] blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
              
              {/* Card */}
              <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-[20px] overflow-hidden">
                {/* Image Container */}
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={asset.image}
                    alt={asset.id}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  
                  {/* Overlay on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#001B4A] via-transparent to-transparent opacity-0 group-hover:opacity-90 transition-opacity duration-300">
                    <div className="absolute inset-0 flex items-center justify-center gap-3">
                      <button className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-all duration-300 hover:scale-110">
                        <Maximize2 className="h-5 w-5" />
                      </button>
                      <button className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-all duration-300 hover:scale-110">
                        <Download className="h-5 w-5" />
                      </button>
                      <button className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-all duration-300 hover:scale-110">
                        <Share2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Asset ID Badge */}
                  <div className="absolute top-3 left-3 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-bold text-[#2563FF]">
                    {asset.id}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-center gap-2 text-white/70 text-sm mb-2">
                    <MapPin className="h-4 w-4" />
                    <span>{asset.city} • {asset.area}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold">{asset.dimensions}</p>
                      <p className="text-white/60 text-xs">{asset.illumination_type}</p>
                    </div>
                    <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl text-white text-sm font-semibold hover:shadow-glow transition-all duration-300">
                      Add to Plan
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
            ))
          )}
        </div>

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <button className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white font-semibold hover:bg-white/20 transition-all duration-300 hover:scale-105">
            View All 50,000+ Assets
          </button>
        </motion.div>
      </div>
    </section>
  );
};
