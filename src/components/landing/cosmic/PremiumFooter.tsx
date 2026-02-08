import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";

export const PremiumFooter = () => {
  const navigate = useNavigate();

  return (
    <footer className="relative bg-gradient-to-b from-white to-[#F8FAFF] dark:from-[#0A1628] dark:to-[#030A1A] pt-20 pb-8">
      {/* Stay Updated Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h3 className="text-3xl font-bold mb-3 text-foreground">Stay Updated</h3>
          <p className="text-muted-foreground text-lg">
            Get the latest updates on OOH industry insights and platform features
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="max-w-md mx-auto flex gap-3"
        >
          <Input
            type="email"
            placeholder="Enter your email"
            className="h-12 rounded-xl text-base"
            style={{
              background: "rgba(255, 255, 255, 0.9)",
              border: "1px solid rgba(0, 97, 255, 0.2)",
            }}
          />
          <Button
            size="lg"
            className="px-8 rounded-xl font-bold"
            style={{
              background: "linear-gradient(135deg, #0061FF, #00A3FF)",
            }}
          >
            <Mail className="w-4 h-4 mr-2" />
            Subscribe
          </Button>
        </motion.div>
      </div>

      {/* Gold Divider */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="h-px bg-gradient-to-r from-transparent via-[#F4C542] to-transparent" />
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h4 className="font-bold text-foreground mb-4">About</h4>
            <ul className="space-y-3">
              <li>
                <button onClick={() => navigate("/our-story")} className="text-muted-foreground hover:text-[#F4C542] transition-colors">
                  Our Story
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/team")} className="text-muted-foreground hover:text-[#F4C542] transition-colors">
                  Team
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/careers")} className="text-muted-foreground hover:text-[#F4C542] transition-colors">
                  Careers
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-4">Features</h4>
            <ul className="space-y-3">
              <li>
                <button onClick={() => navigate("/campaign-planning")} className="text-muted-foreground hover:text-[#F4C542] transition-colors">
                  Campaign Planning
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/asset-management")} className="text-muted-foreground hover:text-[#F4C542] transition-colors">
                  Asset Management
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/proof-collection")} className="text-muted-foreground hover:text-[#F4C542] transition-colors">
                  Proof Collection
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-4">Marketplace</h4>
            <ul className="space-y-3">
              <li>
                <button 
                  onClick={() => navigate("/marketplace")}
                  className="text-muted-foreground hover:text-[#F4C542] transition-colors"
                >
                  Browse Assets
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/partners")} className="text-muted-foreground hover:text-[#F4C542] transition-colors">
                  List Your Media
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/sales")} className="text-muted-foreground hover:text-[#F4C542] transition-colors">
                  Pricing
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-4">Contact</h4>
            <ul className="space-y-3">
              <li>
                <button onClick={() => navigate("/support")} className="text-muted-foreground hover:text-[#F4C542] transition-colors">
                  Support
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/sales")} className="text-muted-foreground hover:text-[#F4C542] transition-colors">
                  Sales
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/partners")} className="text-muted-foreground hover:text-[#F4C542] transition-colors">
                  Partners
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="Go-Ads 360°" 
              className="h-8 w-auto"
            />
            <span className="text-sm text-muted-foreground">
              © 2025 Go-Ads 360°. All rights reserved.
            </span>
          </div>
          
          <div className="flex gap-6 text-sm text-muted-foreground">
            <button className="hover:text-[#F4C542] transition-colors">
              Privacy Policy
            </button>
            <button className="hover:text-[#F4C542] transition-colors">
              Terms of Service
            </button>
            <button className="hover:text-[#F4C542] transition-colors">
              Cookie Policy
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};