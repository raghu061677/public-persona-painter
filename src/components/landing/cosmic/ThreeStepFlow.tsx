import { motion } from "framer-motion";
import { UserPlus, FileText, Rocket } from "lucide-react";

export const ThreeStepFlow = () => {
  const steps = [
    {
      icon: UserPlus,
      number: "1",
      title: "Capture Requirements",
      description: "Via WhatsApp, email, or form—AI parses the details automatically.",
    },
    {
      icon: FileText,
      number: "2",
      title: "Build the Plan",
      description: "Choose assets, add printing/mounting, generate quotation with GST.",
    },
    {
      icon: Rocket,
      number: "3",
      title: "Launch & Prove",
      description: "Operations workflow, mounting photos, proof reports—all in one place.",
    },
  ];

  return (
    <section className="relative py-24 overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-transparent to-muted/20" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            From Lead to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0064E0] to-[#00A5FF]">Live Campaign</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Three simple steps to go from inquiry to campaign delivery.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="relative"
            >
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-[#0064E0] to-transparent -translate-x-1/2 z-0" />
              )}
              
              <div className="relative z-10 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#0064E0] to-[#00A5FF] rounded-2xl shadow-glow mb-6">
                  <step.icon className="h-10 w-10 text-white" />
                </div>
                
                <div className="inline-flex items-center justify-center w-12 h-12 bg-[#FFB400] rounded-full text-white font-bold text-xl mb-4 shadow-lg">
                  {step.number}
                </div>
                
                <h3 className="text-2xl font-bold text-foreground mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
