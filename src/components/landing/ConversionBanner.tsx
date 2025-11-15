import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const ConversionBanner = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 bg-gradient-to-r from-primary to-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Ready to Automate Your OOH Operations?
          </h2>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Join 2,500+ media owners and 10,000+ agencies already growing on Go-Ads 360°
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg"
              variant="secondary"
              onClick={() => navigate("/auth")}
              className="text-lg"
            >
              Start Free Trial (Agencies)
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => navigate("/auth")}
              className="text-lg bg-white/10 text-white border-white hover:bg-white hover:text-primary"
            >
              List Inventory Free (Owners)
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
