"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  Search, MapPin, Star, Wrench, Paintbrush, Truck, BookOpen, Monitor, Baby,
  ChevronRight, ShieldCheck, Clock, CheckCircle, ArrowRight, Zap, Users,
  MessageSquare, CreditCard, Award, TrendingUp, Sparkles, Quote,
  Hammer, Scissors, UtensilsCrossed, GraduationCap,
} from "lucide-react";

const CATEGORIES = [
  { name: "Bricolage", desc: "Reparation & installation", icon: Wrench, count: "1,200+", color: "from-orange-500 to-amber-500", bg: "bg-orange-50" },
  { name: "Menage", desc: "Nettoyage professionnel", icon: Paintbrush, count: "3,400+", color: "from-sky-500 to-cyan-500", bg: "bg-sky-50" },
  { name: "Demenagement", desc: "Transport & manutention", icon: Truck, count: "850+", color: "from-violet-500 to-purple-500", bg: "bg-violet-50" },
  { name: "Soutien scolaire", desc: "Cours particuliers", icon: GraduationCap, count: "2,100+", color: "from-emerald-500 to-green-500", bg: "bg-emerald-50" },
  { name: "Informatique", desc: "Depannage & creation web", icon: Monitor, count: "1,800+", color: "from-blue-500 to-indigo-500", bg: "bg-blue-50" },
  { name: "Garde d'enfants", desc: "Baby-sitting & nounous", icon: Baby, count: "950+", color: "from-pink-500 to-rose-500", bg: "bg-pink-50" },
  { name: "Coiffure", desc: "A domicile & salon", icon: Scissors, count: "2,300+", color: "from-fuchsia-500 to-pink-500", bg: "bg-fuchsia-50" },
  { name: "Restauration", desc: "Traiteur & cuisine", icon: UtensilsCrossed, count: "750+", color: "from-red-500 to-orange-500", bg: "bg-red-50" },
];

const STEPS = [
  {
    step: "01",
    title: "Decrivez votre besoin",
    desc: "Indiquez le service recherche et votre localisation. Notre algorithme trouve les meilleurs profils pres de chez vous.",
    icon: Search,
  },
  {
    step: "02",
    title: "Comparez les profils",
    desc: "Consultez les avis, les tarifs et les portfolios. Echangez directement avec les prestataires via notre messagerie securisee.",
    icon: Users,
  },
  {
    step: "03",
    title: "Reservez en confiance",
    desc: "Confirmez la prestation et payez en toute securite. Le paiement est libere uniquement lorsque vous etes satisfait.",
    icon: CreditCard,
  },
];

const STATS = [
  { value: "10 000+", label: "Prestataires actifs", icon: Users },
  { value: "50 000+", label: "Services realises", icon: CheckCircle },
  { value: "4.8/5", label: "Note moyenne", icon: Star },
  { value: "<1h", label: "Temps de reponse", icon: Zap },
];

const TESTIMONIALS = [
  {
    quote: "J'ai trouve un plombier excellent en moins de 30 minutes. Le service etait impeccable et le prix tres raisonnable.",
    name: "Aminata K.",
    role: "Cliente a Lome",
    rating: 5,
    avatar: "AK",
  },
  {
    quote: "Depuis que je suis sur FloService, j'ai double mon nombre de clients. La plateforme est intuitive et les paiements toujours a l'heure.",
    name: "Kofi M.",
    role: "Electricien verifie",
    rating: 5,
    avatar: "KM",
  },
  {
    quote: "Le soutien scolaire pour mes enfants est devenu tellement plus simple. Les profs sont qualifies et les avis m'aident a choisir.",
    name: "Fatou D.",
    role: "Mere de famille",
    rating: 5,
    avatar: "FD",
  },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");

  return (
    <div className="min-h-dvh">
      <Header />

      {/* ========== HERO ========== */}
      <section className="relative pt-28 pb-20 sm:pt-36 sm:pb-28 lg:pt-44 lg:pb-36 overflow-hidden">
        {/* BG decorations */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-50/60 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
          <div className="absolute top-1/2 left-1/2 w-[800px] h-[800px] bg-gradient-to-br from-brand-50/30 to-transparent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        </div>

        <div className="container-tight">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-8 animate-fade-up">
              <Sparkles className="w-4 h-4" />
              <span>+2 000 prestataires rejoints ce mois</span>
            </div>

            {/* Headline */}
            <h1 className="text-display-lg sm:text-display-xl text-slate-900 text-balance animate-fade-up">
              Trouvez le{" "}
              <span className="gradient-text">prestataire ideal</span>
              <br className="hidden sm:block" />
              {" "}pres de chez vous
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed animate-fade-up animate-delay-100">
              Plus de 10 000 professionnels de confiance prets a vous aider pour le bricolage,
              le menage, la garde d'enfants et bien plus encore.
            </p>

            {/* Search Bar */}
            <div className="mt-10 animate-fade-up animate-delay-200">
              <div className="bg-white p-2 rounded-2xl shadow-elevated border border-slate-100 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto">
                <div className="flex items-center flex-1 px-4 bg-slate-50/80 rounded-xl">
                  <Search className="w-5 h-5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Quel service cherchez-vous ?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-slate-800 py-3.5 px-3 placeholder:text-slate-400 text-[15px]"
                  />
                </div>
                <div className="hidden sm:block w-px bg-slate-200 my-2.5" />
                <div className="flex items-center flex-1 sm:max-w-[200px] px-4 bg-slate-50/80 rounded-xl">
                  <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Ville"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-slate-800 py-3.5 px-3 placeholder:text-slate-400 text-[15px]"
                  />
                </div>
                <Link
                  href={`/explorer?q=${searchQuery}&loc=${locationQuery}`}
                  className="btn-primary py-3.5 px-8 rounded-xl text-[15px] w-full sm:w-auto"
                >
                  Rechercher
                </Link>
              </div>
            </div>

            {/* Trust signals */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500 animate-fade-up animate-delay-300">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Profils verifies
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-brand-500" /> Reponse en -1h
              </span>
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-brand-500" /> Paiement securise
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========== STATS BAR ========== */}
      <section className="border-y border-slate-100 bg-white py-8">
        <div className="container-tight">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stat.value}</div>
                <div className="text-sm text-slate-500 mt-1 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CATEGORIES ========== */}
      <section className="section-padding bg-white">
        <div className="container-tight">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
            <div>
              <p className="section-label mb-2">Categories populaires</p>
              <h2 className="text-display text-slate-900 text-balance">
                Trouvez l'expert qu'il vous faut
              </h2>
            </div>
            <Link
              href="/explorer"
              className="btn-ghost text-brand-600 hover:text-brand-700 hover:bg-brand-50 self-start"
            >
              Voir tout <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.name}
                href={`/explorer?category=${cat.name.toLowerCase()}`}
                className="card-interactive p-5 sm:p-6 group"
              >
                <div className={`w-12 h-12 rounded-xl ${cat.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <cat.icon className="w-6 h-6 text-slate-700" />
                </div>
                <h3 className="font-semibold text-slate-900 text-[15px]">{cat.name}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{cat.desc}</p>
                <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-brand-600">
                  <span>{cat.count} prestataires</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section id="how-it-works" className="section-padding bg-slate-50">
        <div className="container-tight">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="section-label mb-2">Simple et efficace</p>
            <h2 className="text-display text-slate-900">Comment ca marche ?</h2>
            <p className="mt-4 text-lg text-slate-500">
              En 3 etapes simples, trouvez le prestataire ideal et realisez votre projet en toute serenite.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {STEPS.map((step, i) => (
              <div key={step.step} className="relative text-center md:text-left">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[calc(100%-20%)] h-px bg-gradient-to-r from-brand-200 to-brand-100" />
                )}
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-medium border border-slate-100 mb-6 relative z-10">
                  <step.icon className="w-8 h-8 text-brand-600" />
                </div>
                <div className="text-xs font-bold text-brand-600 tracking-widest uppercase mb-2">
                  Etape {step.step}
                </div>
                <h3 className="text-heading-lg text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== TESTIMONIALS ========== */}
      <section className="section-padding bg-white">
        <div className="container-tight">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="section-label mb-2">Ils nous font confiance</p>
            <h2 className="text-display text-slate-900">Ce que disent nos utilisateurs</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="card p-6 sm:p-8 flex flex-col">
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <blockquote className="text-slate-700 leading-relaxed flex-1 text-[15px]">
                  "{t.quote}"
                </blockquote>
                <div className="mt-6 pt-6 border-t border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center text-white text-sm font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== WHY US ========== */}
      <section className="section-padding bg-slate-900 text-white">
        <div className="container-tight">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold tracking-wide uppercase text-brand-400 mb-2">
              Pourquoi FloService
            </p>
            <h2 className="text-display text-white">
              La plateforme qui fait la difference
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {[
              { icon: ShieldCheck, title: "Prestataires verifies", desc: "Chaque profil est verifie manuellement. Verification d'identite, qualifications et avis authentiques." },
              { icon: MessageSquare, title: "Messagerie integree", desc: "Echangez directement avec les prestataires. Partagez photos, devis et planifiez vos interventions." },
              { icon: CreditCard, title: "Paiement securise", desc: "Votre argent est protege. Le paiement est libere uniquement lorsque le service est confirme." },
              { icon: Zap, title: "Reponse rapide", desc: "Recevez des reponses en moins d'une heure. Nos prestataires sont reactifs et disponibles." },
              { icon: Award, title: "Garantie satisfaction", desc: "Si le service ne correspond pas, nous vous aidons a trouver une solution. Votre satisfaction est notre priorite." },
              { icon: TrendingUp, title: "Transparence totale", desc: "Tarifs affiches, avis verifies, pas de frais caches. Vous savez exactement ce que vous payez." },
            ].map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-600/20 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-brand-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <Footer />
    </div>
  );
}
