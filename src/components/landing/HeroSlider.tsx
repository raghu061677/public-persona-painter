import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-professional.jpg";

interface Slide {
  id: number;
  headline: string;
  subhead: string;
  primaryCTA: string;
  secondaryCTA: string;
  primaryLink: string;
  secondaryLink: string;
  backgroundImage: string;
  altText: string;
}

const slides: Slide[] = [
  {
    id: 1,
    headline: "Join the Largest OOH Marketplace in India",
    subhead: "Connect 2,500+ media owners with 10,000+ agencies. List your inventory or discover the perfect placements—all in one platform.",
    primaryCTA: "Explore 50,000+ Media Assets",
    secondaryCTA: "List Your Inventory Free",
    primaryLink: "/marketplace",
    secondaryLink: "/auth",
    backgroundImage: heroImage,
    altText: "Collage of outdoor advertising assets including billboards and digital displays across Indian cities"
  },
  {
    id: 2,
    headline: "Win More Campaigns. Boost Your Margins.",
    subhead: "AI-powered plan builder, instant quotations, and white-label reporting help agencies close 40% faster while increasing gross margin by 15%.",
    primaryCTA: "See How Agencies Grow",
    secondaryCTA: "Watch 2-Min Demo",
    primaryLink: "/auth",
    secondaryLink: "/auth",
    backgroundImage: heroImage,
    altText: "Screenshot of Go-Ads plan builder interface with media asset map and real-time pricing"
  },
  {
    id: 3,
    headline: "Fill Every Asset. Maximize Every Rupee.",
    subhead: "Dynamic pricing, marketplace exposure, and real-time analytics drive 25% higher occupancy rates and 30% revenue lift for media owners.",
    primaryCTA: "See How Owners Profit",
    secondaryCTA: "Calculate Your ROI",
    primaryLink: "/auth",
    secondaryLink: "/auth",
    backgroundImage: heroImage,
    altText: "Comparison showing vacant billboard transformed into active campaign with revenue growth chart"
  },
  {
    id: 4,
    headline: "Automate Everything from Lead to Proof",
    subhead: "Mobile-first operations, AI lead parsing, and automated proof uploads save 20+ hours per week per team member.",
    primaryCTA: "Start Free Trial",
    secondaryCTA: "See All Features",
    primaryLink: "/auth",
    secondaryLink: "/auth",
    backgroundImage: heroImage,
    altText: "Mobile interface for uploading campaign proof photos with GPS validation"
  },
  {
    id: 5,
    headline: "Enterprise-Grade. Built for Scale.",
    subhead: "99.9% uptime SLA, multi-tenant security, and role-based access control trusted by India's top media groups and agencies.",
    primaryCTA: "View Security Features",
    secondaryCTA: "Book Enterprise Demo",
    primaryLink: "/auth",
    secondaryLink: "/auth",
    backgroundImage: heroImage,
    altText: "Abstract network security visualization with India map showing secure multi-tenant infrastructure"
  }
];

export const HeroSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const navigate = useNavigate();

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  const slide = slides[currentSlide];

  return (
    <div 
      className="relative min-h-[70vh] lg:min-h-[90vh] overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background with Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8 animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              {slide.headline.split('.')[0]}
              <span className="block text-primary">{slide.headline.split('.')[1] || ''}</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              {slide.subhead}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                onClick={() => navigate(slide.primaryLink)}
                className="text-lg"
              >
                {slide.primaryCTA}
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate(slide.secondaryLink)}
                className="text-lg"
              >
                {slide.secondaryCTA}
              </Button>
            </div>
          </div>

          {/* Visual */}
          <div className="relative">
            <img 
              src={slide.backgroundImage}
              alt={slide.altText}
              className="rounded-2xl shadow-2xl w-full"
            />
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm hover:bg-background"
        onClick={prevSlide}
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm hover:bg-background"
        onClick={nextSlide}
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6" />
      </Button>

      {/* Dots Navigation */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide 
                ? 'bg-primary w-8' 
                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
