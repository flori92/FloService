"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Star, MapPin, CheckCircle, Clock, ShieldCheck, Mail, MessageSquare, Phone } from "lucide-react";
import { supabase } from "@floservice/shared";

type ProviderDetail = {
  id: string;
  full_name: string;
  city: string;
  avatar_url: string;
  bio: string;
  rating_average: number;
  review_count: number;
  created_at: string;
  provider_profiles?: {
    specialization: string;
    hourly_rate: number;
    experience_years: number;
  }[];
};

export default function ProviderProfilePage() {
  const params = useParams();
  const providerId = params.id as string;
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id, full_name, city, avatar_url, bio, rating_average, review_count, created_at,
            provider_profiles ( specialization, hourly_rate, experience_years )
          `)
          .eq('id', providerId)
          .single();

        if (error) throw error;
        setProvider((data as any) || null);
      } catch (err) {
        console.error("Erreur de récupération prestataire:", err);
      } finally {
        setLoading(false);
      }
    };
    if (providerId) fetchProvider();
  }, [providerId]);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center animate-pulse"><div className="w-16 h-16 rounded-full bg-indigo-200"></div></div>;

  if (!provider) return <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6"><h1 className="text-2xl font-bold mb-2">Prestataire introuvable</h1><a href="/explorer" className="text-indigo-600 font-medium">Retourner à la recherche</a></div>;

  const spec = provider.provider_profiles?.[0]?.specialization || "Service Multi-tâches";
  const rate = provider.provider_profiles?.[0]?.hourly_rate || 20;
  const exp = provider.provider_profiles?.[0]?.experience_years || 2;
  const avatar = provider.avatar_url || `https://ui-avatars.com/api/?name=${provider.full_name}&background=e0e7ff&color=4f46e5`;
  const joinYear = new Date(provider.created_at).getFullYear() || 2024;

  return (
    <div className="min-h-screen bg-slate-50 pt-16">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 h-16 flex items-center px-6 sm:px-10 justify-between">
        <a href="/" className="font-bold text-xl text-indigo-600 tracking-tight">FloService.</a>
        <a href="/explorer" className="text-sm font-semibold text-slate-700 hover:text-indigo-600">← Retour à la liste</a>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 flex flex-col lg:flex-row gap-8">
        {/* COL GAUCHE - PROFIL */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/40 text-center relative overflow-hidden">
            <div className="w-32 h-32 mx-auto rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden mb-5">
              <img src={avatar} alt={provider.full_name} className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">{provider.full_name}</h1>
            <p className="font-medium text-slate-500 mb-4">{spec}</p>
            
            <div className="flex justify-center items-center gap-1.5 mb-6">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="text-lg font-bold text-slate-800">{provider.rating_average || 5.0}</span>
              <span className="text-sm text-slate-400 font-medium underline underline-offset-4 decoration-slate-300">({provider.review_count || 0} avis)</span>
            </div>

            <div className="flex flex-col gap-3 text-sm text-slate-600">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-slate-400" />
                <span>{provider.city || "À distance ou sur place"}</span>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-green-500" />
                <span className="text-green-700 font-semibold bg-green-50 px-2 rounded-md">Identité vérifiée</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-slate-400" />
                <span>Membre depuis {joinYear}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/40 sticky top-24">
            <div className="text-center pb-6 border-b border-slate-100 mb-6">
              <h3 className="text-4xl font-extrabold text-slate-900 mb-1">{rate}€</h3>
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Taux Horaire</p>
            </div>
            
            <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-200 mb-3">
              <MessageSquare className="w-5 h-5" /> Contacter
            </button>
            <p className="text-xs text-center text-slate-500 font-medium">Répond habituellement en moins d'1h</p>
          </div>
        </div>

        {/* COL DROITE - DESCRIPTION */}
        <div className="w-full lg:w-2/3 flex flex-col gap-8">
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-100 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-6">À propos de moi</h2>
            <div className="prose text-slate-600 leading-relaxed">
              <p>{provider.bio || `Bonjour, je suis ${provider.full_name}. Fort de ${exp} ans d'expérience en tant que ${spec.toLowerCase()}, je suis passionné par mon métier et à votre service pour accomplir vos missions avec sérieux et rapidité. J'apporte mon propre matériel et je garantis des interventions propres et sécurisées. N'hésitez pas à me contacter !`}</p>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mt-10 mb-4">Compétences & Qualifications</h3>
            <div className="flex flex-wrap gap-2">
              {['Ponctualité', 'Sérieux', `${exp} ans d'expérience`, 'Matériel professionnel', 'Assuré'].map((tag, i) => (
                <span key={i} className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-indigo-500" /> {tag}
                </span>
              ))}
            </div>
          </div>

          {/* AVIS */}
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Avis clients</h2>
              <div className="flex items-center gap-1 font-bold text-slate-800">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" /> {provider.rating_average || 5.0}
              </div>
            </div>
            
            {/* Faux avis pour la démo */}
            <div className="space-y-6">
              {[1, 2].map(i => (
                <div key={i} className="pb-6 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                      C{i}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-0.5">Client {i}</h4>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />)}
                        </div>
                        <span className="text-xs text-slate-400">Il y a 2 jours</span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">Travail impeccable et soigné. Très professionnel, il est arrivé à l'heure et a fini plus vite que prévu. Je recommande à 100% !</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
