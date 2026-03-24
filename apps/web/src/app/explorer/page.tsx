"use client";

import { useState, useEffect } from "react";
import { Search, MapPin, Star, SlidersHorizontal, Filter, ShieldCheck } from "lucide-react";
import { supabase } from "@floservice/shared";

// Typage des prestataires
type Provider = {
  id: string;
  full_name: string;
  city: string;
  avatar_url: string;
  rating_average: number;
  review_count: number;
  provider_profiles: {
    specialization: string;
    hourly_rate: number;
  }[];
};

export default function ExplorerPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  const fetchProviders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select(`
          id, full_name, city, avatar_url, rating_average, review_count,
          provider_profiles (
            specialization, hourly_rate
          )
        `)
        .eq('is_provider', true);

      if (searchTerm) {
        query = query.ilike('full_name', `%${searchTerm}%`);
      }
      if (cityFilter) {
        query = query.ilike('city', `%${cityFilter}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setProviders((data as unknown) as Provider[] || []);
    } catch (err) {
      console.error("Erreur lors de la récupération des prestataires", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [searchTerm, cityFilter]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-16">
      {/* HEADER NAVBAR MOCK */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 h-16 flex items-center px-6 sm:px-10 justify-between">
        <div className="flex items-center gap-8">
          <a href="/" className="font-bold text-xl text-indigo-600 tracking-tight">FloService.</a>
          {/* SEARCH BAR (Top compact) */}
          <div className="hidden lg:flex items-center bg-gray-100/80 rounded-full px-4 py-2 border border-transparent focus-within:border-indigo-300 focus-within:bg-white transition-all w-[400px]">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input 
              type="text"
              placeholder="Rechercher un plombier, ménage..."
              className="bg-transparent border-none outline-none text-sm w-full text-gray-700"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a href="/login" className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors">Connexion</a>
          <button className="bg-indigo-600 text-white rounded-full px-5 py-2 text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">Déposer une annonce</button>
        </div>
      </header>

      <div className="flex-1 flex max-w-screen-2xl mx-auto w-full">
        {/* SIDEBAR FILTERS */}
        <aside className="w-72 hidden md:block pt-8 pr-8 pb-10 border-r border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Filter className="w-5 h-5 text-indigo-600" />
            Filtres
          </h2>

          <div className="space-y-6">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block">Localisation</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Ville (ex: Lome, Paris)"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  onChange={(e) => setCityFilter(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block">Note minimum</label>
              <div className="flex flex-col gap-2">
                {[4, 3, 2].map(rating => (
                  <label key={rating} className="flex items-center gap-2 cursor-pointer group">
                    <input type="radio" name="rating" className="text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                    <div className="flex items-center gap-1 text-sm text-slate-700 group-hover:text-indigo-600 transition-colors">
                      {Array.from({length: 5}).map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'fill-slate-100 text-slate-200'}`} />
                      ))}
                      <span className="ml-1 text-xs text-slate-500">& plus</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block">Prix maximum</label>
              <input type="range" className="w-full accent-indigo-600" min="10" max="200" step="5" />
              <div className="flex justify-between text-xs font-semibold text-slate-400 mt-1">
                <span>10€</span>
                <span>200€+</span>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 py-8 px-6 md:px-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Prestataires disponibles <span className="text-slate-400 text-lg ml-2 font-medium">({providers.length})</span>
            </h1>
            <button className="md:hidden flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white">
              <SlidersHorizontal className="w-4 h-4" /> Filtres
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-64 bg-white border border-slate-100 rounded-2xl animate-pulse"></div>
              ))}
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-20 px-6">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <Search className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Aucun prestataire trouvé</h3>
              <p className="text-slate-500 max-w-sm mx-auto">Modifiez vos critères de recherche ou essayez une autre ville.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {providers.map(provider => {
                const spec = provider.provider_profiles?.[0]?.specialization || "Service Multi-tâches";
                const price = provider.provider_profiles?.[0]?.hourly_rate || 15;
                const avatar = provider.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(provider.full_name)}&background=e0e7ff&color=4f46e5`;
                
                return (
                  <div key={provider.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-slate-200/50 transition-all group flex flex-col">
                    <a href={`/provider/${provider.id}`} className="p-5 flex-1 cursor-pointer block hover:bg-slate-50/50 transition-colors">
                      <div className="flex gap-4 items-start">
                        <img src={avatar} alt={provider.full_name} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                            {provider.full_name}
                          </h3>
                          <p className="text-sm font-medium text-slate-500 truncate mb-1">
                            {spec}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 font-semibold px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide">
                              <ShieldCheck className="w-3 h-3" /> Vérifié
                            </span>
                            <span className="flex items-center text-xs font-semibold text-yellow-600">
                              <Star className="w-3 h-3 fill-current mr-0.5" /> 
                              {provider.rating_average || 5.0} <span className="text-slate-400 font-normal ml-1">({provider.review_count || 0})</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{provider.city || "À distance partout"}</span>
                      </div>
                    </a>
                    
                    <div className="border-t border-slate-50 p-4 bg-slate-50/50 flex justify-between items-center group-hover:bg-indigo-50/30 transition-colors">
                      <div className="font-bold text-slate-900">
                        {price}€ <span className="text-xs text-slate-500 font-medium">/ h</span>
                      </div>
                      <button className="px-4 py-1.5 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        Contacter
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
