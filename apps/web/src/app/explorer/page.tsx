"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import {
  Search, MapPin, Star, SlidersHorizontal, Filter, ShieldCheck,
  ChevronDown, Grid3X3, List, X, ArrowUpDown,
} from "lucide-react";
import { supabase } from "@floservice/shared";

type Provider = {
  id: string;
  full_name: string;
  city: string;
  avatar_url: string;
  rating_average: number;
  review_count: number;
  bio: string;
  provider_profiles: {
    specialization: string;
    hourly_rate: number;
  }[];
};

const SORT_OPTIONS = [
  { value: "rating", label: "Meilleure note" },
  { value: "price_asc", label: "Prix croissant" },
  { value: "price_desc", label: "Prix decroissant" },
  { value: "reviews", label: "Plus d'avis" },
];

export default function ExplorerPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [mobileFilters, setMobileFilters] = useState(false);
  const [sortBy, setSortBy] = useState("rating");
  const [minRating, setMinRating] = useState(0);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select(`
          id, full_name, city, avatar_url, rating_average, review_count, bio,
          provider_profiles (specialization, hourly_rate)
        `)
        .eq("is_provider", true);

      if (searchTerm) {
        query = query.ilike("full_name", `%${searchTerm}%`);
      }
      if (cityFilter) {
        query = query.ilike("city", `%${cityFilter}%`);
      }
      if (minRating > 0) {
        query = query.gte("rating_average", minRating);
      }

      const { data, error } = await query;
      if (error) throw error;
      setProviders((data as unknown as Provider[]) || []);
    } catch (err) {
      console.error("Erreur lors de la recuperation des prestataires", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [searchTerm, cityFilter, minRating]);

  const activeFiltersCount = [cityFilter, minRating > 0].filter(Boolean).length;

  return (
    <div className="min-h-dvh bg-surface-50 flex flex-col">
      <Header />

      <div className="flex-1 flex flex-col pt-[72px]">
        {/* Top search bar */}
        <div className="bg-white border-b border-slate-100 sticky top-[72px] z-30">
          <div className="container-wide py-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center bg-slate-50 rounded-xl px-4 border border-slate-200 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/10 transition-all">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Rechercher un prestataire, un service..."
                  className="w-full bg-transparent border-none outline-none text-sm py-3 px-3 text-slate-800 placeholder:text-slate-400"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm("")} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Sort dropdown */}
              <div className="hidden sm:flex items-center">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-400 cursor-pointer"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Mobile filter toggle */}
              <button
                onClick={() => setMobileFilters(!mobileFilters)}
                className="md:hidden btn-secondary py-3 px-4 relative"
              >
                <SlidersHorizontal className="w-4 h-4" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex container-wide py-6 gap-8">
          {/* SIDEBAR FILTERS - Desktop */}
          <aside className="w-64 hidden md:block shrink-0">
            <div className="sticky top-[160px] space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-brand-600" /> Filtres
                </h2>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={() => { setCityFilter(""); setMinRating(0); }}
                    className="text-xs text-brand-600 font-medium hover:underline"
                  >
                    Tout effacer
                  </button>
                )}
              </div>

              {/* Location */}
              <div className="card p-4 space-y-3">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Localisation
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Ville"
                    value={cityFilter}
                    className="input-field pl-9 py-2.5 text-sm"
                    onChange={(e) => setCityFilter(e.target.value)}
                  />
                </div>
              </div>

              {/* Rating */}
              <div className="card p-4 space-y-3">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Note minimum
                </label>
                <div className="space-y-2">
                  {[4, 3, 2, 0].map((rating) => (
                    <label
                      key={rating}
                      className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                        minRating === rating ? "bg-brand-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="rating"
                        checked={minRating === rating}
                        onChange={() => setMinRating(rating)}
                        className="accent-brand-600"
                      />
                      <div className="flex items-center gap-1">
                        {rating > 0 ? (
                          <>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "fill-slate-200 text-slate-200"
                                }`}
                              />
                            ))}
                            <span className="ml-1 text-xs text-slate-500">& +</span>
                          </>
                        ) : (
                          <span className="text-sm text-slate-600">Toutes les notes</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <main className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-heading-lg text-slate-900">Prestataires</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  {loading ? "Chargement..." : `${providers.length} prestataire${providers.length !== 1 ? "s" : ""} disponible${providers.length !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="card p-5 space-y-4 animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-14 h-14 rounded-full bg-slate-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-2/3" />
                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                        <div className="h-3 bg-slate-100 rounded w-1/3" />
                      </div>
                    </div>
                    <div className="h-3 bg-slate-100 rounded w-full" />
                    <div className="h-3 bg-slate-100 rounded w-4/5" />
                  </div>
                ))}
              </div>
            ) : providers.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Search className="w-9 h-9 text-slate-400" />
                </div>
                <h3 className="text-heading text-slate-800 mb-2">Aucun prestataire trouve</h3>
                <p className="text-slate-500 max-w-sm mx-auto">
                  Modifiez vos criteres de recherche ou essayez une autre ville.
                </p>
                <button
                  onClick={() => { setSearchTerm(""); setCityFilter(""); setMinRating(0); }}
                  className="btn-primary mt-6"
                >
                  Reinitialiser les filtres
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                {providers.map((provider) => {
                  const spec =
                    provider.provider_profiles?.[0]?.specialization || "Multi-services";
                  const price = provider.provider_profiles?.[0]?.hourly_rate || 15;
                  const avatar =
                    provider.avatar_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(provider.full_name)}&background=e0e7ff&color=4f46e5&bold=true`;

                  return (
                    <Link
                      key={provider.id}
                      href={`/provider/${provider.id}`}
                      className="card-interactive p-5 flex flex-col group"
                    >
                      <div className="flex gap-4 items-start">
                        <img
                          src={avatar}
                          alt={provider.full_name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-soft shrink-0"
                          loading="lazy"
                          width={56}
                          height={56}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors truncate">
                            {provider.full_name}
                          </h3>
                          <p className="text-sm text-slate-500 truncate">{spec}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="badge-success text-[10px]">
                              <ShieldCheck className="w-3 h-3" /> Verifie
                            </span>
                            <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-600">
                              <Star className="w-3 h-3 fill-current" />
                              {provider.rating_average?.toFixed(1) || "5.0"}
                              <span className="text-slate-400 font-normal ml-0.5">
                                ({provider.review_count || 0})
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {provider.bio && (
                        <p className="text-sm text-slate-500 mt-3 line-clamp-2 leading-relaxed">
                          {provider.bio}
                        </p>
                      )}

                      <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-50">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{provider.city || "A distance"}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-slate-900">{price}</span>
                          <span className="text-xs text-slate-500 font-medium ml-0.5">FCFA/h</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {mobileFilters && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFilters(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 max-h-[70vh] overflow-auto animate-fade-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-heading text-slate-900">Filtres</h3>
              <button onClick={() => setMobileFilters(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">Ville</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Entrez une ville"
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="input-field pl-9"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-2">Note minimum</label>
                <div className="grid grid-cols-2 gap-2">
                  {[0, 3, 4].map((r) => (
                    <button
                      key={r}
                      onClick={() => setMinRating(r)}
                      className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${
                        minRating === r
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {r === 0 ? "Toutes" : `${r}+ etoiles`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setMobileFilters(false)}
              className="btn-primary w-full mt-8"
            >
              Voir les resultats ({providers.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
