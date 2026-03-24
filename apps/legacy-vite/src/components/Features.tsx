import React from 'react';
import { motion } from 'framer-motion';
import { 
  LineChart,
  Users,
  Zap,
  Shield,
  MessageSquare,
  Settings
} from 'lucide-react';

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}

const Feature: React.FC<FeatureProps> = ({ icon, title, description, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
      className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
    >
      <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </motion.div>
  );
};

const Features: React.FC = () => {
  const features = [
    {
      icon: <LineChart className="h-6 w-6 text-indigo-600" />,
      title: "Analyses avancées",
      description: "Obtenez des insights détaillés sur vos performances avec des analyses en temps réel et des tableaux de bord personnalisables.",
    },
    {
      icon: <Users className="h-6 w-6 text-indigo-600" />,
      title: "Gestion d'équipe",
      description: "Optimisez la collaboration avec des outils intégrés pour l'attribution des tâches, le suivi et la communication.",
    },
    {
      icon: <Zap className="h-6 w-6 text-indigo-600" />,
      title: "Intégration rapide",
      description: "Intégration rapide et transparente avec vos outils et flux de travail existants. Démarrez en quelques minutes.",
    },
    {
      icon: <Shield className="h-6 w-6 text-indigo-600" />,
      title: "Sécurité entreprise",
      description: "Sécurité de niveau bancaire avec chiffrement de bout en bout et conformité aux normes de l'industrie.",
    },
    {
      icon: <MessageSquare className="h-6 w-6 text-indigo-600" />,
      title: "Support 24/7",
      description: "Accédez à notre équipe de support dédiée à tout moment. Nous sommes là pour vous aider à réussir.",
    },
    {
      icon: <Settings className="h-6 w-6 text-indigo-600" />,
      title: "Solutions personnalisées",
      description: "Fonctionnalités flexibles et personnalisables qui s'adaptent à vos besoins professionnels uniques.",
    }
  ];

  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
          >
            Tout ce dont vous avez besoin pour réussir
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Des fonctionnalités puissantes pour vous aider à gérer, optimiser et développer votre activité efficacement.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Feature
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delay={0.1 + index * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;