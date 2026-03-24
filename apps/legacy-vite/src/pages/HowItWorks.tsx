import React from 'react';
import { Search, CheckCircle, CreditCard, ThumbsUp } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CtaSection from '../components/CtaSection';

const HowItWorks: React.FC = () => {

  const steps = [
    {
      icon: <Search className="w-12 h-12 text-teal-600" />,
      title: 'Trouvez le service parfait',
      description: 'Parcourez des milliers de services ou utilisez notre recherche pour trouver le prestataire idéal.'
    },
    {
      icon: <CheckCircle className="w-12 h-12 text-teal-600" />,
      title: 'Contactez le prestataire',
      description: 'Discutez directement avec le prestataire pour définir vos besoins et obtenir un devis personnalisé.'
    },
    {
      icon: <CreditCard className="w-12 h-12 text-teal-600" />,
      title: 'Réservez et payez en toute sécurité',
      description: 'Effectuez votre réservation et paiement en ligne. Votre paiement est sécurisé et garanti.'
    },
    {
      icon: <ThumbsUp className="w-12 h-12 text-teal-600" />,
      title: 'Service réalisé et évaluation',
      description: 'Une fois le service effectué, partagez votre expérience en laissant un avis au prestataire.'
    }
  ];

  const faqs = [
    {
      question: 'Comment choisir un prestataire ?',
      answer: 'Consultez les profils, les évaluations et les avis des clients précédents. Vous pouvez également contacter directement les prestataires pour discuter de vos besoins spécifiques.'
    },
    {
      question: 'Les paiements sont-ils sécurisés ?',
      answer: 'Oui, tous les paiements sont sécurisés et traités par Stripe. Votre argent est conservé en garantie jusqu\'à ce que le service soit terminé à votre satisfaction.'
    },
    {
      question: 'Que faire en cas de problème ?',
      answer: 'Notre service client est disponible 24/7 pour vous aider. En cas de litige, nous proposons un processus de médiation pour trouver une solution équitable.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main>
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-teal-500 via-blue-500 to-purple-500 py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold text-white mb-4">
              Comment ça marche ?
            </h1>
            <p className="text-xl text-white">
              Découvrez comment FloService vous permet de trouver et réserver
              facilement des services de qualité.
            </p>
          </div>
        </div>

        {/* Steps Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, index) => (
                <div key={index} className="text-center">
                  <div className="bg-teal-50 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              Questions fréquentes
            </h2>
            <div className="max-w-3xl mx-auto space-y-6">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-sm p-6"
                >
                  <h3 className="text-xl font-semibold mb-2">
                    {faq.question}
                  </h3>
                  <p className="text-gray-600">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <CtaSection />
      </main>

      <Footer />
    </div>
  );
};

export default HowItWorks;