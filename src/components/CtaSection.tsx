import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Star, Clock } from 'lucide-react';
import { FormattedMessage } from 'react-intl';

const CtaSection: React.FC = () => {
  return (
    <section className="py-16 bg-gradient-to-r from-teal-500 to-blue-600 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')] bg-cover bg-center opacity-10"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Provider CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="bg-white rounded-xl p-6 shadow-xl"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              <FormattedMessage id="cta.provider.title" />
            </h3>
            <p className="text-gray-600 mb-4">
              <FormattedMessage id="cta.provider.description" />
            </p>
            <ul className="space-y-3 mb-6">
              {[0, 1, 2].map((index) => (
                <li key={index} className="flex items-center text-gray-700">
                  <span className="h-5 w-5 rounded-full bg-teal-100 flex items-center justify-center mr-2">✓</span>
                  <FormattedMessage id={`cta.provider.benefits.${index}`} />
                </li>
              ))}
            </ul>
            <Link
              to="/provider-registration"
              className="inline-flex items-center justify-center w-full px-4 py-2 text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors duration-200"
            >
              <FormattedMessage id="cta.provider.button" />
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </motion.div>

          {/* Client CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="bg-white rounded-xl p-6 shadow-xl"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              <FormattedMessage id="cta.client.title" />
            </h3>
            <p className="text-gray-600 mb-4">
              <FormattedMessage id="cta.client.description" />
            </p>
            <div className="grid grid-cols-1 gap-3 mb-6">
              {[
                { icon: ShieldCheck },
                { icon: Star },
                { icon: Clock }
              ].map((item, index) => (
                <div key={index} className="flex items-start">
                  <item.icon className="h-5 w-5 text-teal-600 mt-1 flex-shrink-0" />
                  <div className="ml-3">
                    <h4 className="text-sm font-semibold text-gray-900">
                      <FormattedMessage id={`cta.client.benefits.${index}.title`} />
                    </h4>
                    <p className="text-xs text-gray-600">
                      <FormattedMessage id={`cta.client.benefits.${index}.description`} />
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/explorer"
              className="inline-flex items-center justify-center w-full px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <FormattedMessage id="cta.client.button" />
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CtaSection;