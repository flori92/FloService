import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Star, Clock } from 'lucide-react';
import { FormattedMessage } from 'react-intl';

const CtaSection: React.FC = () => {
  return (
    <section className="py-20 bg-gradient-to-r from-teal-500 to-blue-600 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')] bg-cover bg-center opacity-10"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Become a Provider */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="bg-white rounded-xl p-8 shadow-xl"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              <FormattedMessage id="cta.provider.title" />
            </h3>
            <p className="text-gray-600 mb-6">
              <FormattedMessage id="cta.provider.description" />
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center text-gray-700">
                <span className="h-6 w-6 rounded-full bg-teal-100 flex items-center justify-center mr-3">✓</span>
                <FormattedMessage id="cta.provider.benefits.0" />
              </li>
              <li className="flex items-center text-gray-700">
                <span className="h-6 w-6 rounded-full bg-teal-100 flex items-center justify-center mr-3">✓</span>
                <FormattedMessage id="cta.provider.benefits.1" />
              </li>
              <li className="flex items-center text-gray-700">
                <span className="h-6 w-6 rounded-full bg-teal-100 flex items-center justify-center mr-3">✓</span>
                <FormattedMessage id="cta.provider.benefits.2" />
              </li>
            </ul>
            <Link
              to="/provider-registration"
              className="inline-flex items-center justify-center w-full px-6 py-3 text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors duration-200"
            >
              <FormattedMessage id="cta.provider.button" />
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </motion.div>

          {/* Book a Service */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="bg-white rounded-xl p-8 shadow-xl"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              <FormattedMessage id="cta.client.title" />
            </h3>
            <p className="text-gray-600 mb-6">
              <FormattedMessage id="cta.client.description" />
            </p>
            <div className="grid grid-cols-1 gap-4 mb-8">
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <ShieldCheck className="h-6 w-6 text-teal-600" />
                </div>
                <div className="ml-4">
                  <h4 className="text-base font-semibold text-gray-900">
                    <FormattedMessage id="cta.client.benefits.0.title" />
                  </h4>
                  <p className="text-sm text-gray-600">
                    <FormattedMessage id="cta.client.benefits.0.description" />
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <Star className="h-6 w-6 text-teal-600" />
                </div>
                <div className="ml-4">
                  <h4 className="text-base font-semibold text-gray-900">
                    <FormattedMessage id="cta.client.benefits.1.title" />
                  </h4>
                  <p className="text-sm text-gray-600">
                    <FormattedMessage id="cta.client.benefits.1.description" />
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <Clock className="h-6 w-6 text-teal-600" />
                </div>
                <div className="ml-4">
                  <h4 className="text-base font-semibold text-gray-900">
                    <FormattedMessage id="cta.client.benefits.2.title" />
                  </h4>
                  <p className="text-sm text-gray-600">
                    <FormattedMessage id="cta.client.benefits.2.description" />
                  </p>
                </div>
              </div>
            </div>
            <Link
              to="/explorer"
              className="inline-flex items-center justify-center w-full px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <FormattedMessage id="cta.client.button" />
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CtaSection;