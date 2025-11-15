import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Shield, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: CheckCircle,
    title: "Verified Listings",
    description: "Every asset includes GPS coordinates, photos, dimensions, and real-time availability. No surprises."
  },
  {
    icon: TrendingUp,
    title: "Transparent Pricing",
    description: "See card rates, negotiate directly, or use AI rate suggestions based on 100,000+ historical bookings."
  },
  {
    icon: Shield,
    title: "Secure Transactions",
    description: "2% platform fee covers escrow, dispute resolution, and guaranteed proof delivery within 48 hours."
  }
];

export const MarketplaceShowcase = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Discover the OOH Marketplace Built for India
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Browse 50,000+ verified media assets across 200+ cities. Filter by location, size, price, and availability. Book instantly or request custom rates.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="text-center">
              <CardHeader>
                <div className="mx-auto p-4 rounded-full bg-primary/10 text-primary w-fit mb-4">
                  <feature.icon className="h-8 w-8" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center">
          <Button 
            size="lg" 
            onClick={() => navigate("/marketplace")}
            className="text-lg"
          >
            Explore Marketplace →
          </Button>
        </div>
      </div>
    </section>
  );
};
