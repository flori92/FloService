import React from 'react';
import { motion } from 'framer-motion';
import { Search, CheckCircle, Calendar, Star } from 'lucide-react';

const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      icon: <Search className="w-12 h-12 text-teal-600" />,
      title: 'Recherchez un service',
      description: 'Trouvez le prestataire idéal parmi nos professionnels qualifiés.'
    },
    {
      icon: <CheckCircle className="w-12 h-12 text-teal-600" />,
      title: 'Comparez et choisissez',
      description: 'Consultez les profils, avis et tarifs pour faire le meilleur choix.'
    },
    {
      icon: <Calendar className="w-12 h-12 text-teal-600" />,
      title: 'Réservez en ligne',
      description: 'Planifiez votre rendez-vous en quelques clics.'
    },
    {
      icon: <Star className="w-12 h-12 text-teal-600" />,
      title: 'Évaluez le service',
      description: 'Partagez votre expérience pour aider la communauté.'
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
          >
            Comment ça marche ?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Trouvez et réservez des services de qualité en toute simplicité
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="bg-white rounded-full p-6 w-24 h-24 mx-auto mb-6 shadow-lg flex items-center justify-center">
                {step.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {step.title}
              </h3>
              <p className="text-gray-600">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;