import Image from "next/image";
import { Search, MapPin, Star, Wrench, Paintbrush, Truck, BookOpen, ChevronRight, ShieldCheck, Clock, CheckCircle } from "lucide-react";

export default function Home() {
  const categories = [
    { name: "Bricolage", icon: Wrench, count: "1,200+" },
    { name: "Ménage", icon: Paintbrush, count: "3,400+" },
    { name: "Déménagement", icon: Truck, count: "850+" },
    { name: "Soutien Scolaire", icon: BookOpen, count: "2,100+" },
  ];

  return (
    <div className="min-h-screen">
      {/* HEADER NAVBAR MOCK - Will be extracted to Layout later */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 h-16 flex items-center justify-between px-8">
        <div className="font-bold text-xl text-indigo-600 tracking-tight">FloService.</div>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-600">
          <a href="#" className="hover:text-indigo-600 transition-colors">Tous les services</a>
          <a href="#" className="hover:text-indigo-600 transition-colors">Comment ça marche</a>
          <a href="#" className="hover:text-indigo-600 transition-colors">Devenir Prestataire</a>
        </nav>
        <div className="flex gap-3">
          <a href="/login" className="text-sm font-semibold px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-full transition-all hidden sm:block border border-transparent hover:border-gray-200">Connexion</a>
          <a href="/register" className="text-sm font-semibold px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 shadow-sm transition-all shadow-indigo-200 flex items-center justify-center">S'inscrire</a>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="pt-28 pb-16 px-6 sm:px-12 md:px-24 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          
          <div className="flex-1 space-y-8">
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-gray-900 leading-[1.1]">
              Trouvez le <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">prestataire idéal</span> près de chez vous.
            </h1>
            <p className="text-lg text-gray-500 max-w-xl leading-relaxed">
              Plus de 10 000 professionnels et particuliers de confiance prêts à vous aider pour le bricolage, le ménage, la garde d'enfants et bien plus.
            </p>
            
            {/* SEARCH BAR */}
            <div className="bg-white p-2 rounded-2xl shadow-xl shadow-indigo-100/50 border border-gray-100 flex flex-col sm:flex-row gap-2 max-w-2xl relative z-10">
              <div className="flex items-center flex-1 min-w-[200px] px-3 bg-gray-50/50 rounded-xl">
                <Search className="w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Ex: Peintre, Ménage..." 
                  className="w-full bg-transparent border-none outline-none focus:ring-0 text-gray-700 py-3 px-3 placeholder:text-gray-400"
                />
              </div>
              <div className="hidden sm:block w-[1px] bg-gray-100 my-2"></div>
              <div className="flex items-center flex-1 min-w-[150px] px-3 bg-gray-50/50 rounded-xl">
                <MapPin className="w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Code postal, Ville" 
                  className="w-full bg-transparent border-none outline-none focus:ring-0 text-gray-700 py-3 px-3 placeholder:text-gray-400"
                />
              </div>
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-xl transition-all shadow-md shadow-indigo-200 w-full sm:w-auto flex items-center justify-center">
                Rechercher
              </button>
            </div>
            
            <div className="flex gap-4 items-center text-sm text-gray-500 font-medium">
              <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-green-500"/> Profils vérifiés</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-indigo-500"/> Réponse en 1h</span>
            </div>
          </div>

          <div className="flex-1 w-full relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-100 to-white rounded-3xl transform rotate-3 scale-105 opacity-50 z-0"></div>
            <div className="relative z-10 aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl shadow-indigo-900/10 border border-white/50">
              <img 
                src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=2670&auto=format&fit=crop" 
                alt="Artisan at work" 
                className="w-full h-full object-cover"
              />
              {/* Floating Badge */}
              <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                  <Star className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <div className="font-bold text-gray-900">4.9/5 Excellent</div>
                  <div className="text-xs text-gray-500 font-medium">Basé sur 15,000+ avis</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* CATEGORIES SECTION */}
      <section className="bg-white py-20 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 md:px-24">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Catégories populaires</h2>
              <p className="text-gray-500 mt-2">Trouvez l'expert idéal selon votre besoin</p>
            </div>
            <a href="#" className="hidden sm:flex text-indigo-600 font-medium items-center gap-1 hover:text-indigo-700 transition-colors">
              Voir tout <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {categories.map((cat, i) => (
              <div key={i} className="group p-6 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-xl hover:shadow-indigo-50 transition-all cursor-pointer transform hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-indigo-600 shadow-sm mb-4 group-hover:scale-110 transition-transform">
                  <cat.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{cat.name}</h3>
                <p className="text-sm text-gray-500">{cat.count} prestataires</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-indigo-900 py-24 text-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 md:px-24 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Comment ça marche ?</h2>
          <p className="text-indigo-200 max-w-2xl mx-auto mb-16 text-lg">En seulement 3 étapes, trouvez la solution à votre problème</p>
          
          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-[40px] left-[16%] right-[16%] h-[2px] bg-indigo-800/50 z-0"></div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 rounded-2xl bg-indigo-800 border-2 border-indigo-700 flex items-center justify-center text-2xl font-bold mb-6 shadow-xl">1</div>
              <h3 className="text-xl font-bold mb-2">Recherchez</h3>
              <p className="text-indigo-200">Tapez le service dont vous avez besoin et indiquez votre ville.</p>
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 rounded-2xl bg-indigo-800 border-2 border-indigo-700 flex items-center justify-center text-2xl font-bold mb-6 shadow-xl">2</div>
              <h3 className="text-xl font-bold mb-2">Comparez</h3>
              <p className="text-indigo-200">Consultez les prix, les profils et les avis des prestataires certifiés.</p>
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 rounded-2xl bg-white text-indigo-900 flex items-center justify-center text-2xl font-bold mb-6 shadow-[0_0_30px_rgba(255,255,255,0.2)]">3</div>
              <h3 className="text-xl font-bold mb-2">Réservez</h3>
              <p className="text-indigo-200">Prenez rendez-vous et payez en toute sécurité via notre plateforme.</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
