import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Mail, Instagram, Facebook, Linkedin } from "lucide-react";
import { useSocialLinks } from "@/hooks/useSocialLinks";

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

export const PremiumFooter = () => {
  const navigate = useNavigate();
  const social = useSocialLinks();
  const SOCIAL_LINKS = {
    instagram: social.instagram,
    facebook: social.facebook,
    whatsapp: social.whatsappUrl,
    linkedin: social.linkedin,
  };

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

      {/* Social Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm font-semibold text-foreground">Follow us</p>
          <div className="flex items-center gap-3">
            <a
              href={SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="h-11 w-11 rounded-full flex items-center justify-center bg-muted hover:bg-primary/10 text-foreground hover:text-primary transition-all hover:scale-110"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a
              href={SOCIAL_LINKS.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="h-11 w-11 rounded-full flex items-center justify-center bg-muted hover:bg-primary/10 text-foreground hover:text-primary transition-all hover:scale-110"
            >
              <Facebook className="h-5 w-5" />
            </a>
            <a
              href={SOCIAL_LINKS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="h-11 w-11 rounded-full flex items-center justify-center bg-muted hover:bg-[#25D366]/10 text-foreground hover:text-[#25D366] transition-all hover:scale-110"
            >
              <WhatsAppIcon className="h-5 w-5" />
            </a>
            <a
              href={SOCIAL_LINKS.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="h-11 w-11 rounded-full flex items-center justify-center bg-muted hover:bg-primary/10 text-foreground hover:text-primary transition-all hover:scale-110"
            >
              <Linkedin className="h-5 w-5" />
            </a>
          </div>
        </div>
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