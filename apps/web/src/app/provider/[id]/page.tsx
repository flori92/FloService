"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import {
  Star, MapPin, CheckCircle, Clock, ShieldCheck, MessageSquare,
  ArrowLeft, Calendar, Briefcase, Award, ThumbsUp, ChevronRight,
  Camera, Heart, Share2, Globe, Zap, Users, BadgeCheck,
  Phone, Mail, ChevronDown, Play, Quote, ExternalLink,
} from "lucide-react";
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

const MOCK_REVIEWS = [
  {
    id: "r1", name: "Aminata K.", avatar: "AK", rating: 5, date: "Il y a 3 jours",
    text: "Travail impeccable et soigne. Tres professionnel, il est arrive a l'heure et a fini plus vite que prevu. Je recommande a 100% !",
    service: "Plomberie", helpful: 12,
  },
  {
    id: "r2", name: "Kofi M.", avatar: "KM", rating: 5, date: "Il y a 1 semaine",
    text: "Excellent prestataire. Communication claire, tarif honnete et resultat au-dela de mes attentes. Merci encore !",
    service: "Reparation", helpful: 8,
  },
  {
    id: "r3", name: "Fatoumata D.", avatar: "FD", rating: 4, date: "Il y a 2 semaines",
    text: "Bon travail dans l'ensemble. Petit retard a l'arrivee mais le resultat final est tres satisfaisant. Bonne communication.",
    service: "Installation", helpful: 5,
  },
  {
    id: "r4", name: "Seydou B.", avatar: "SB", rating: 5, date: "Il y a 3 semaines",
    text: "Intervention rapide et efficace. Le probleme a ete resolu en moins d'une heure. Prix tres raisonnable.",
    service: "Depannage", helpful: 15,
  },
];

const MOCK_PORTFOLIO = [
  { id: "p1", color: "from-brand-100 to-brand-200", label: "Renovation salle de bain" },
  { id: "p2", color: "from-amber-100 to-amber-200", label: "Installation cuisine" },
  { id: "p3", color: "from-emerald-100 to-emerald-200", label: "Reparation toiture" },
  { id: "p4", color: "from-violet-100 to-violet-200", label: "Peinture interieure" },
  { id: "p5", color: "from-rose-100 to-rose-200", label: "Amenagement terrasse" },
  { id: "p6", color: "from-cyan-100 to-cyan-200", label: "Pose carrelage" },
];

const SERVICE_PACKAGES = [
  { name: "Diagnostic", price: "5 000", desc: "Evaluation du probleme et devis detaille", features: ["Visite sur place", "Devis gratuit", "Conseils personnalises"] },
  { name: "Intervention", price: "15 000", desc: "Reparation ou installation standard", features: ["Main d'oeuvre incluse", "Materiel de base", "Garantie 3 mois"], popular: true },
  { name: "Projet complet", price: "Sur devis", desc: "Renovation ou installation complete", features: ["Materiel premium", "Garantie 1 an", "Suivi post-travaux"] },
];

const SIMILAR_PROVIDERS = [
  { id: "sp1", name: "Jean-Pierre L.", spec: "Plombier", rating: 4.7, avatar: "JP", city: "Plateau" },
  { id: "sp2", name: "Mamadou S.", spec: "Multi-services", rating: 4.5, avatar: "MS", city: "Cocody" },
  { id: "sp3", name: "Aissatou B.", spec: "Plombier", rating: 4.9, avatar: "AB", city: "Marcory" },
];

export default function ProviderProfilePage() {
  const params = useParams();
  const providerId = params.id as string;
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"about" | "reviews" | "portfolio" | "services">("about");
  const [liked, setLiked] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(`
            id, full_name, city, avatar_url, bio, rating_average, review_count, created_at,
            provider_profiles ( specialization, hourly_rate, experience_years )
          `)
          .eq("id", providerId)
          .single();

        if (error) throw error;
        setProvider((data as unknown as ProviderDetail) || null);
      } catch (err) {
        console.error("Erreur de recuperation prestataire:", err);
      } finally {
        setLoading(false);
      }
    };
    if (providerId) fetchProvider();
  }, [providerId]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-surface-50 flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-dvh bg-surface-50 flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-5">
          <Briefcase className="w-9 h-9 text-slate-300" />
        </div>
        <h1 className="text-heading-lg text-slate-900 mb-2">Prestataire introuvable</h1>
        <p className="text-slate-500 mb-6">Ce profil n&apos;existe pas ou a ete supprime.</p>
        <Link href="/explorer" className="btn-primary">
          Retourner a la recherche
        </Link>
      </div>
    );
  }

  const spec = provider.provider_profiles?.[0]?.specialization || "Multi-services";
  const rate = provider.provider_profiles?.[0]?.hourly_rate || 15;
  const exp = provider.provider_profiles?.[0]?.experience_years || 2;
  const avatar =
    provider.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(provider.full_name)}&background=e0e7ff&color=4f46e5&bold=true`;
  const joinDate = new Date(provider.created_at);
  const joinLabel = `${joinDate.toLocaleString("fr-FR", { month: "long" })} ${joinDate.getFullYear()}`;
  const reviewsToShow = showAllReviews ? MOCK_REVIEWS : MOCK_REVIEWS.slice(0, 3);

  const TABS = [
    { key: "about" as const, label: "A propos" },
    { key: "services" as const, label: "Services" },
    { key: "reviews" as const, label: `Avis (${provider.review_count || MOCK_REVIEWS.length})` },
    { key: "portfolio" as const, label: "Portfolio" },
  ];

  return (
    <div className="min-h-dvh bg-surface-50 flex flex-col">
      <Header />

      <div className="flex-1 pt-[72px]">
        {/* Hero banner */}
        <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-brand-400/10 rounded-full animate-pulse-soft" />

          <div className="container-wide py-8 sm:py-12 relative z-10">
            <Link
              href="/explorer"
              className="inline-flex items-center gap-1.5 text-brand-200 hover:text-white text-sm font-medium mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Retour aux prestataires
            </Link>

            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="relative group">
                <img
                  src={avatar}
                  alt={provider.full_name}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover border-4 border-white/20 shadow-elevated"
                />
                <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-emerald-500 rounded-lg border-[3px] border-brand-700 flex items-center justify-center">
                  <CheckCircle className="w-3.5 h-3.5 text-white" />
                </div>
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{provider.full_name}</h1>
                  <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur text-white text-xs font-semibold px-2.5 py-1 rounded-lg">
                    <BadgeCheck className="w-3.5 h-3.5" /> Verifie
                  </span>
                </div>
                <p className="text-brand-200 font-medium mb-4">{spec}</p>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm mb-5">
                  <div className="flex items-center gap-1.5 text-white">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-bold">{provider.rating_average?.toFixed(1) || "5.0"}</span>
                    <span className="text-brand-200">({provider.review_count || 0} avis)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-brand-200">
                    <MapPin className="w-4 h-4" /> {provider.city || "A distance"}
                  </div>
                  <div className="flex items-center gap-1.5 text-brand-200">
                    <Briefcase className="w-4 h-4" /> {exp} ans d&apos;experience
                  </div>
                  <div className="flex items-center gap-1.5 text-brand-200">
                    <Users className="w-4 h-4" /> +{(provider.review_count || 10) * 3} clients
                  </div>
                </div>

                {/* Inline stats */}
                <div className="flex flex-wrap gap-3">
                  {[
                    { label: "Taux de reponse", value: "98%" },
                    { label: "Delai moyen", value: "<1h" },
                    { label: "Missions terminees", value: `${(provider.review_count || 10) * 2}+` },
                  ].map((s) => (
                    <div key={s.label} className="bg-white/10 backdrop-blur rounded-xl px-4 py-2">
                      <span className="text-white font-bold text-sm">{s.value}</span>
                      <span className="text-brand-200 text-xs ml-1.5">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setLiked(!liked)}
                  className={`p-2.5 rounded-xl transition-colors ${liked ? "bg-red-500/20 text-red-300" : "bg-white/10 hover:bg-white/20 text-white"}`}
                >
                  <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
                </button>
                <button className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile sticky CTA */}
        <div className="lg:hidden sticky top-[72px] z-20 bg-white border-b border-slate-100 p-3 flex gap-2">
          <Link href="/messages" className="btn-primary flex-1 py-3 text-sm">
            <MessageSquare className="w-4 h-4" /> Contacter
          </Link>
          <button className="btn-secondary py-3 px-4">
            <Phone className="w-4 h-4" />
          </button>
          <button
            onClick={() => setLiked(!liked)}
            className={`py-3 px-4 rounded-xl border transition-colors ${liked ? "border-red-200 bg-red-50 text-red-500" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
          >
            <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
          </button>
        </div>

        <div className="container-wide py-6 sm:py-8">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Tab navigation */}
              <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-100 shadow-soft mb-6 overflow-x-auto">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                      activeTab === tab.key
                        ? "bg-brand-600 text-white shadow-soft"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab: About */}
              {activeTab === "about" && (
                <div className="space-y-6">
                  <div className="card p-6 sm:p-8">
                    <h2 className="text-heading text-slate-900 mb-4">A propos de moi</h2>
                    <p className="text-slate-600 leading-relaxed">
                      {provider.bio ||
                        `Bonjour, je suis ${provider.full_name}. Fort de ${exp} ans d'experience en tant que ${spec.toLowerCase()}, je suis passionne par mon metier et a votre service pour accomplir vos missions avec serieux et rapidite. J'apporte mon propre materiel et je garantis des interventions propres et securisees.`}
                    </p>
                    {!provider.bio && (
                      <p className="text-slate-600 leading-relaxed mt-3">
                        Mon objectif est de fournir un service de qualite superieure a chaque intervention. Je suis disponible du lundi au samedi et je me deplace dans toute la region. N&apos;hesitez pas a me contacter pour un devis gratuit !
                      </p>
                    )}
                  </div>

                  <div className="card p-6 sm:p-8">
                    <h2 className="text-heading text-slate-900 mb-5">Competences & Qualifications</h2>
                    <div className="flex flex-wrap gap-2.5">
                      {[
                        "Ponctualite", "Serieux", `${exp} ans d'experience`,
                        "Materiel professionnel", "Assure", spec,
                        "Devis gratuit", "Garantie travaux",
                      ].map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 bg-brand-50 text-brand-700 px-3.5 py-2 rounded-xl text-sm font-medium"
                        >
                          <CheckCircle className="w-4 h-4 text-brand-500" /> {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { icon: Star, label: "Note", value: provider.rating_average?.toFixed(1) || "5.0", color: "bg-amber-50 text-amber-600" },
                      { icon: ThumbsUp, label: "Satisfaction", value: "98%", color: "bg-emerald-50 text-emerald-600" },
                      { icon: Briefcase, label: "Missions", value: `${(provider.review_count || 10) * 2}+`, color: "bg-brand-50 text-brand-600" },
                      { icon: Clock, label: "Reponse", value: "<1h", color: "bg-violet-50 text-violet-600" },
                    ].map((stat) => (
                      <div key={stat.label} className="card p-4 text-center hover:-translate-y-0.5 transition-all">
                        <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mx-auto mb-3`}>
                          <stat.icon className="w-5 h-5" />
                        </div>
                        <div className="text-xl font-extrabold text-slate-900">{stat.value}</div>
                        <div className="text-xs font-medium text-slate-500 mt-0.5">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Highlighted review */}
                  <div className="card p-6 sm:p-8 bg-gradient-to-br from-brand-50 to-white border-brand-100">
                    <Quote className="w-8 h-8 text-brand-200 mb-4" />
                    <p className="text-slate-700 leading-relaxed mb-4 italic">
                      &ldquo;{MOCK_REVIEWS[0].text}&rdquo;
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm">
                        {MOCK_REVIEWS[0].avatar}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{MOCK_REVIEWS[0].name}</p>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Services */}
              {activeTab === "services" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {SERVICE_PACKAGES.map((pkg) => (
                      <div
                        key={pkg.name}
                        className={`card p-6 relative ${pkg.popular ? "border-2 border-brand-500 shadow-glow" : ""}`}
                      >
                        {pkg.popular && (
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 badge-brand text-[10px] px-3">
                            <Zap className="w-3 h-3" /> Populaire
                          </span>
                        )}
                        <h3 className="font-bold text-slate-900 mb-1">{pkg.name}</h3>
                        <div className="flex items-baseline gap-1 mb-2">
                          <span className="text-2xl font-extrabold text-slate-900">{pkg.price}</span>
                          {pkg.price !== "Sur devis" && <span className="text-sm text-slate-500">FCFA</span>}
                        </div>
                        <p className="text-sm text-slate-500 mb-4">{pkg.desc}</p>
                        <ul className="space-y-2 mb-5">
                          {pkg.features.map((f) => (
                            <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                              <CheckCircle className="w-4 h-4 text-brand-500 shrink-0" /> {f}
                            </li>
                          ))}
                        </ul>
                        <button className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          pkg.popular ? "btn-primary" : "btn-secondary"
                        }`}>
                          Choisir
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="card p-6">
                    <h3 className="font-semibold text-slate-900 mb-4">Zones d&apos;intervention</h3>
                    <div className="flex flex-wrap gap-2">
                      {["Abidjan", "Cocody", "Plateau", "Marcory", "Treichville", "Yopougon"].map((zone) => (
                        <span key={zone} className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-sm border border-slate-200">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> {zone}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Reviews */}
              {activeTab === "reviews" && (
                <div className="space-y-4">
                  <div className="card p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                      <div className="text-center shrink-0">
                        <div className="text-5xl font-extrabold text-slate-900 mb-1">
                          {provider.rating_average?.toFixed(1) || "5.0"}
                        </div>
                        <div className="flex items-center gap-0.5 justify-center mb-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-5 h-5 ${
                                i < Math.round(provider.rating_average || 5)
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-slate-200 text-slate-200"
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-sm text-slate-500">{provider.review_count || MOCK_REVIEWS.length} avis</p>
                      </div>
                      <div className="flex-1 w-full space-y-2">
                        {[5, 4, 3, 2, 1].map((stars) => {
                          const pct = stars === 5 ? 65 : stars === 4 ? 25 : stars === 3 ? 10 : 0;
                          return (
                            <div key={stars} className="flex items-center gap-2.5">
                              <span className="text-xs text-slate-500 w-3 text-right">{stars}</span>
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {reviewsToShow.map((review) => (
                    <div key={review.id} className="card p-5 sm:p-6 hover:-translate-y-0.5 transition-all">
                      <div className="flex gap-4 items-start">
                        <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-sm border border-brand-100 shrink-0">
                          {review.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-slate-900 text-sm">{review.name}</h4>
                            <span className="text-xs text-slate-400">{review.date}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`} />
                              ))}
                            </div>
                            <span className="text-[11px] bg-slate-100 text-slate-500 font-medium px-2 py-0.5 rounded-md">{review.service}</span>
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed">{review.text}</p>
                          <button className="flex items-center gap-1.5 mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors">
                            <ThumbsUp className="w-3.5 h-3.5" /> Utile ({review.helpful})
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {!showAllReviews && MOCK_REVIEWS.length > 3 && (
                    <button
                      onClick={() => setShowAllReviews(true)}
                      className="btn-secondary w-full py-3"
                    >
                      Voir tous les avis <ChevronDown className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Tab: Portfolio */}
              {activeTab === "portfolio" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {MOCK_PORTFOLIO.map((item) => (
                      <div key={item.id} className="group cursor-pointer">
                        <div className={`aspect-[4/3] rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-soft group-hover:shadow-medium group-hover:scale-[1.02] transition-all relative overflow-hidden`}>
                          <Camera className="w-8 h-8 text-slate-400/40" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <Play className="w-0 h-0 text-white group-hover:w-8 group-hover:h-8 transition-all opacity-0 group-hover:opacity-100" />
                          </div>
                        </div>
                        <p className="text-sm font-medium text-slate-700 mt-2 truncate">{item.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-400">Photos de realisations du prestataire</p>
                  </div>
                </div>
              )}

              {/* Similar providers */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-heading text-slate-900">Prestataires similaires</h2>
                  <Link href="/explorer" className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1">
                    Voir tout <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {SIMILAR_PROVIDERS.map((sp) => (
                    <Link key={sp.id} href={`/provider/${sp.id}`} className="card-interactive p-4 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-sm border border-brand-100 shrink-0">
                        {sp.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{sp.name}</p>
                        <p className="text-xs text-slate-500">{sp.spec}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-600">
                            <Star className="w-3 h-3 fill-current" /> {sp.rating}
                          </span>
                          <span className="text-xs text-slate-400">{sp.city}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Sticky sidebar */}
            <div className="w-full lg:w-[340px] shrink-0 hidden lg:block">
              <div className="lg:sticky lg:top-[88px] space-y-4">
                {/* Price card */}
                <div className="card p-6">
                  <div className="text-center pb-5 border-b border-slate-100 mb-5">
                    <p className="text-xs text-slate-400 mb-1">A partir de</p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-extrabold text-slate-900">{rate}</span>
                      <span className="text-sm font-semibold text-slate-500">FCFA/h</span>
                    </div>
                  </div>

                  <Link href="/messages" className="btn-primary w-full py-3.5 mb-3">
                    <MessageSquare className="w-[18px] h-[18px]" /> Contacter
                  </Link>
                  <button className="btn-secondary w-full py-3 mb-3">
                    <Calendar className="w-[18px] h-[18px]" /> Voir disponibilites
                  </button>
                  <button className="w-full py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 flex items-center justify-center gap-2 transition-colors">
                    <Phone className="w-[18px] h-[18px]" /> Appeler
                  </button>

                  <p className="text-xs text-center text-slate-400 mt-4 flex items-center justify-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-500" /> Repond en moins d&apos;1h
                  </p>
                </div>

                {/* Availability card */}
                <div className="card p-5">
                  <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand-500" /> Disponibilite
                  </h3>
                  <div className="space-y-2">
                    {[
                      { day: "Lun - Ven", hours: "08:00 - 18:00", active: true },
                      { day: "Samedi", hours: "09:00 - 15:00", active: true },
                      { day: "Dimanche", hours: "Ferme", active: false },
                    ].map((slot) => (
                      <div key={slot.day} className="flex justify-between text-sm">
                        <span className="text-slate-500">{slot.day}</span>
                        <span className={`font-medium flex items-center gap-1.5 ${slot.active ? "text-slate-700" : "text-red-500"}`}>
                          {slot.active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                          {slot.hours}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trust badges */}
                <div className="card p-5">
                  <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> Garanties
                  </h3>
                  <div className="space-y-3">
                    {[
                      { icon: ShieldCheck, label: "Identite verifiee", color: "text-emerald-600 bg-emerald-50" },
                      { icon: Award, label: "Prestataire certifie", color: "text-brand-600 bg-brand-50" },
                      { icon: Globe, label: "Intervient a distance", color: "text-violet-600 bg-violet-50" },
                      { icon: CheckCircle, label: "Garantie satisfaction", color: "text-amber-600 bg-amber-50" },
                    ].map((badge) => (
                      <div key={badge.label} className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${badge.color}`}>
                          <badge.icon className="w-[18px] h-[18px]" />
                        </div>
                        <span className="text-sm font-medium text-slate-700">{badge.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Share */}
                <div className="card p-5 text-center">
                  <p className="text-sm text-slate-500 mb-3">Ce profil vous plait ?</p>
                  <div className="flex gap-2 justify-center">
                    <button className="btn-secondary py-2 px-4 text-sm">
                      <Share2 className="w-4 h-4" /> Partager
                    </button>
                    <button
                      onClick={() => setLiked(!liked)}
                      className={`py-2 px-4 rounded-xl text-sm font-semibold border transition-all flex items-center gap-2 ${
                        liked
                          ? "border-red-200 bg-red-50 text-red-600"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
                      {liked ? "Sauvegarde" : "Sauvegarder"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
