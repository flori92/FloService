import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Advertisement {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  link: string;
  bgColor: string;
}

const PubCarousel: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const ads: Advertisement[] = [
    {
      id: '1',
      title: 'Moov Africa',
      subtitle: "Connectez-vous à l'avenir avec Moov Africa",
      imageUrl: 'https://afriqueitnews.com/wp-content/uploads/Screen-Shot-2023-05-09-at-11.27.07.png',
      link: 'https://www.moov-africa.ci',
      bgColor: 'from-blue-600 to-blue-800'
    },
    {
      id: '2',
      title: 'Orange Télécom',
      subtitle: 'Restez connecté avec Orange',
      imageUrl: 'https://www.leparisien.fr/resizer/pQPmhBbYbgGrix2Wb82JrPj4O24=/arc-anglerfish-eu-central-1-prod-leparisien/public/YPAJGUUGPNABXKCPSF6HHYV6UQ.jpg',
      link: 'https://orange.com',
      bgColor: 'from-orange-500 to-orange-700'
    },
    {
      id: '3',
      title: 'Yango',
      subtitle: 'Déplacez-vous en toute sécurité',
      imageUrl: 'https://www.afrique-sur7.fr/wp-content/uploads/2024/10/Yango.jpg',
      link: 'https://yango.com/fr_int/',
      bgColor: 'from-pink-600 to-red-600'
    },
    {
      id: '4',
      title: 'MTN',
      subtitle: 'Everywhere you go',
      imageUrl: 'https://mir-s3-cdn-cf.behance.net/projects/404/4af007181236087.Y3JvcCw4MDgsNjMyLDAsMA.png',
      link: 'https://my.mtn.bj',
      bgColor: 'from-yellow-500 to-yellow-600'
    },
    {
      id: '5',
      title: 'Celtiis',
      subtitle: 'Internet haut débit pour tous',
      imageUrl: 'https://www.afro-impact.com/wp-content/uploads/2022/10/celtiis-benin-lancement-offre-services.jpg',
      link: 'https://celtiis.bj',
      bgColor: 'from-green-600 to-green-800'
    },
    {
      id: '6',
      title: 'GoZem',
      subtitle: 'Votre Super App de services',
      imageUrl: 'https://gozem.co/wp-content/uploads/2020/03/gozem-logo-hq.png',
      link: 'https://gozem.co',
      bgColor: 'from-teal-500 to-teal-700'
    },
    {
      id: '7',
      title: 'MIG MOTORS',
      subtitle: 'Découvrez nos véhicules de qualité',
      imageUrl: 'https://www.goafricaonline.com/media/cache/resolve/w1200/uploads/media/company_media/0001/91/5e4e485a37c6b-nouveau-showroom-mig-benin.JPG',
      link: 'https://www.goafricaonline.com/bj/90187-mig-motors-import-group-sarl-cocotomey-cotonou-benin',
      bgColor: 'from-gray-700 to-gray-900'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % ads.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [ads.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const goToPrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + ads.length) % ads.length);
  };

  const goToNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % ads.length);
  };

  return (
    <div className="relative w-full h-[400px] overflow-hidden rounded-2xl shadow-xl">
      {ads.map((ad, index) => (
        <div
          key={ad.id}
          className={`absolute w-full h-full transition-opacity duration-500 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ zIndex: index === currentSlide ? 1 : 0 }}
        >
          <div className="relative w-full h-full">
            <div className={`absolute inset-0 bg-gradient-to-r ${ad.bgColor} opacity-90`} />
            <img
              src={ad.imageUrl}
              alt={ad.title}
              className="w-full h-full object-cover mix-blend-overlay"
            />
            <div className="absolute inset-0 flex items-center justify-center text-center px-8">
              <div className="max-w-2xl">
                <h2 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
                  {ad.title}
                </h2>
                <p className="text-xl text-white mb-8 drop-shadow-lg">
                  {ad.subtitle}
                </p>
                <a
                  href={ad.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-8 py-4 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors transform hover:scale-105 duration-200"
                >
                  En savoir plus
                </a>
              </div>
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={goToPrevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/30 hover:bg-black/50 transition-colors text-white backdrop-blur-sm"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={goToNextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/30 hover:bg-black/50 transition-colors text-white backdrop-blur-sm"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex space-x-3">
        {ads.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentSlide
                ? 'bg-white w-8'
                : 'bg-white/50 hover:bg-white/75'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default PubCarousel;