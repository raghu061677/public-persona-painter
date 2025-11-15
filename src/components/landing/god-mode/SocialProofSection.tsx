import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Rajesh Kumar",
    role: "Founder, Media Matrix",
    company: "Media Owner - Mumbai",
    avatar: "RK",
    rating: 5,
    text: "Go-Ads helped us increase asset occupancy from 65% to 90% in just 3 months. The marketplace brings quality agencies we'd never reach otherwise.",
    metric: "+38% Revenue",
  },
  {
    name: "Priya Sharma",
    role: "Operations Head",
    company: "AdVantage Agency - Delhi",
    avatar: "PS",
    rating: 5,
    text: "We've cut quotation time from 4 hours to 20 minutes. The AI rate recommendations are scary accurate. Our margins improved by 12%.",
    metric: "20hrs saved/week",
  },
  {
    name: "Arun Patel",
    role: "CEO",
    company: "Outdoor Plus - Bangalore",
    avatar: "AP",
    rating: 5,
    text: "The proof upload system alone justified the subscription. Clients love the transparency. We closed 15% more repeat business this quarter.",
    metric: "+15% Retention",
  },
];

const logos = [
  { name: "Company A", initials: "CA" },
  { name: "Company B", initials: "CB" },
  { name: "Company C", initials: "CC" },
  { name: "Company D", initials: "CD" },
  { name: "Company E", initials: "CE" },
  { name: "Company F", initials: "CF" },
];

export const SocialProofSection = () => {
  return (
    <section className="py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Company Logos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <p className="text-muted-foreground mb-8 text-lg">
            Trusted by leading media owners and agencies across India
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
            {logos.map((logo, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.1 }}
                className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center text-2xl font-bold text-muted-foreground/50 cursor-pointer hover:bg-muted/80 transition-all"
              >
                {logo.initials}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Testimonials Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Loved by Agencies &
            <br />
            Media Owners Alike
          </h2>
          <p className="text-xl text-muted-foreground">
            Don't just take our word for it
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <Card className="h-full hover:shadow-xl transition-all border-2">
                <CardContent className="pt-6">
                  <Quote className="h-8 w-8 text-[#2563eb]/20 mb-4" />
                  
                  {/* Rating */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  {/* Testimonial Text */}
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    "{testimonial.text}"
                  </p>

                  {/* Metric Badge */}
                  <div className="inline-block px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-sm font-semibold mb-4">
                    {testimonial.metric}
                  </div>

                  {/* Author */}
                  <div className="flex items-center gap-3 pt-4 border-t">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-[#2563eb] text-white font-semibold">
                        {testimonial.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {testimonial.role}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {testimonial.company}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
