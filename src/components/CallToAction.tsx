import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Rocket, Shield, Clock } from 'lucide-react';

const CallToAction: React.FC = () => {
  const benefits = [
    {
      icon: <Rocket className="h-6 w-6 text-indigo-200" />,
      text: "Démarrez en quelques minutes"
    },
    {
      icon: <Shield className="h-6 w-6 text-indigo-200" />,
      text: "Plateforme sécurisée et fiable"
    },
    {
      icon: <Clock className="h-6 w-6 text-indigo-200" />,
      text: "Support expert 24/7"
    }
  ];

  return (
    <section id="cta" className="relative py-24 bg-indigo-600 overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')] bg-cover bg-center opacity-10"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <span className="text-indigo-200 text-sm font-semibold uppercase tracking-wider">
              Offre limitée
            </span>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold text-white mb-6">
              Transformez votre activité aujourd'hui
            </h2>
            <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
              Rejoignez des milliers d'entreprises qui se développent déjà grâce à notre plateforme.
              Commencez votre essai gratuit de 30 jours maintenant et constatez la différence.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row justify-center gap-4 mb-12"
          >
            <button className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-indigo-700 bg-white hover:bg-indigo-50 transition-colors duration-200 shadow-lg">
              Essai gratuit
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
            <button className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-lg font-medium rounded-lg text-white hover:bg-indigo-500 transition-colors duration-200">
              Démonstration
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto"
          >
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-center justify-center space-x-3 text-indigo-100"
              >
                {benefit.icon}
                <span>{benefit.text}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;