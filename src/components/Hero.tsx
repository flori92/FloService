import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { HashLink as Link } from 'react-router-hash-link';
import { useTranslation } from '../hooks/useTranslation';

const Hero: React.FC = () => {
  const { t } = useTranslation();
  return (
    <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 overflow-hidden bg-gradient-to-r from-indigo-50 to-blue-50">
      <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')] bg-cover bg-center opacity-[0.03]"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center md:text-left"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              {t('home.hero.title')}
            </h1>
            <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-xl mx-auto md:mx-0">
              {t('home.hero.subtitle')}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center md:justify-start gap-4">
              <Link
                to="/#cta"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base md:text-lg font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors duration-200"
              >
                {t('home.hero.cta')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/#features"
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base md:text-lg font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
              >
                {t('home.hero.secondary')}
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden md:block"
          >
            <img 
              src="https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" 
              alt="Business team collaborating" 
              className="rounded-lg shadow-xl max-w-full h-auto"
            />
          </motion.div>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              'Trusted by 10,000+ Companies',
              '24/7 Expert Support',
              '99.9% Uptime SLA',
              'ISO 27001 Certified'
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                className="text-center"
              >
                <p className="text-gray-600 font-medium">{t(`home.stats.${index}`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;