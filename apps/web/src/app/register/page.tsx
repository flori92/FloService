"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, ArrowRight, User, Shield, Eye, EyeOff, CheckCircle, Briefcase } from "lucide-react";
import { supabase } from "@floservice/shared/src/supabase";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isProvider, setIsProvider] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, is_provider: isProvider },
        },
      });
      if (authError) throw authError;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 bg-slate-50">
        <div className="card p-10 max-w-md w-full text-center animate-scale-in">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="text-heading-lg text-slate-900 mb-3">Verifiez vos e-mails</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Nous avons envoye un lien de confirmation a{" "}
            <strong className="text-slate-700">{email}</strong>.
            Cliquez sur ce lien pour activer votre compte.
          </p>
          <Link href="/login" className="btn-primary px-8">
            Retour a la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex">
      {/* Left - Illustration panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 items-center justify-center p-12 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 -translate-x-1/2" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-white/5 rounded-full translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-1/3 left-1/4 w-48 h-48 bg-brand-400/10 rounded-full animate-pulse-soft" />

        <div className="relative z-10 max-w-lg text-white">
          <Link href="/" className="flex items-center gap-2 mb-12">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <span className="text-white font-bold text-xl">F</span>
            </div>
            <span className="text-2xl font-bold tracking-tight">FloService</span>
          </Link>

          <h2 className="text-4xl font-extrabold leading-tight mb-6">
            Rejoignez la communaute FloService
          </h2>
          <p className="text-brand-200 text-lg leading-relaxed mb-10">
            Que vous cherchiez un prestataire ou que vous souhaitiez proposer vos services,
            FloService est la plateforme qu'il vous faut.
          </p>

          <div className="space-y-4">
            {[
              "Inscription gratuite et sans engagement",
              "Profils verifies et avis authentiques",
              "Paiements securises et garantie satisfaction",
            ].map((text) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4 text-brand-200" />
                </div>
                <span className="text-brand-100 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-[420px]">
          <Link href="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 flex items-center justify-center shadow-glow">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              Flo<span className="text-brand-600">Service</span>
            </span>
          </Link>

          <h1 className="text-heading-lg text-slate-900 mb-2">Creer un compte</h1>
          <p className="text-slate-500 mb-8">Commencez gratuitement en quelques secondes</p>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-semibold text-slate-700">Nom complet</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Votre nom complet"
                  autoComplete="name"
                  className="input-field pl-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-email" className="text-sm font-semibold text-slate-700">Adresse e-mail</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  autoComplete="email"
                  className="input-field pl-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-password" className="text-sm font-semibold text-slate-700">Mot de passe</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 caracteres"
                  autoComplete="new-password"
                  minLength={8}
                  className="input-field pl-11 pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? "Masquer" : "Afficher"}
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
              <p className="text-xs text-slate-400 ml-1">Lettres, chiffres et caracteres speciaux recommandes</p>
            </div>

            {/* Provider toggle */}
            <div
              onClick={() => setIsProvider(!isProvider)}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                isProvider
                  ? "border-brand-500 bg-brand-50/50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                isProvider ? "bg-brand-100 text-brand-600" : "bg-slate-100 text-slate-400"
              }`}>
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-800 text-sm">Je suis un prestataire</div>
                <div className="text-slate-500 text-xs">Je souhaite proposer mes services</div>
              </div>
              <div className={`w-10 h-6 rounded-full transition-colors relative ${
                isProvider ? "bg-brand-600" : "bg-slate-300"
              }`}>
                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                  isProvider ? "translate-x-4" : ""
                }`} />
              </div>
            </div>

            <button
              disabled={loading}
              className="btn-primary w-full py-3.5 mt-2 group disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Creation en cours...
                </span>
              ) : (
                <>
                  Creer mon compte
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-8">
            Deja un compte ?{" "}
            <Link href="/login" className="text-brand-600 font-semibold hover:text-brand-700 transition-colors">
              Se connecter
            </Link>
          </p>

          <p className="text-center text-xs text-slate-400 mt-4 leading-relaxed">
            En vous inscrivant, vous acceptez nos{" "}
            <Link href="#" className="underline underline-offset-2 hover:text-slate-500">conditions d'utilisation</Link>
            {" "}et notre{" "}
            <Link href="#" className="underline underline-offset-2 hover:text-slate-500">politique de confidentialite</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
