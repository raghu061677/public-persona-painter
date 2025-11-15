import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const FinalCTA = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Start Growing Your OOH Business Today
        </h2>
        <p className="text-xl text-muted-foreground mb-8">
          Join 12,500+ users managing ₹250Cr+ in annual media spend
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg"
            onClick={() => navigate("/auth")}
            className="text-lg"
          >
            Start Free 14-Day Trial (No Card Required) →
          </Button>
          <Button 
            size="lg"
            variant="outline"
            onClick={() => navigate("/auth")}
            className="text-lg"
          >
            Book a Personalized Demo →
          </Button>
        </div>
      </div>
    </section>
  );
};
