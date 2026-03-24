"use client";

import { useState } from "react";
import { Mail, Lock, ArrowRight, User, Shield } from "lucide-react";
import { supabase } from "@floservice/shared/src/supabase";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isProvider, setIsProvider] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            is_provider: isProvider
          }
        }
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-10 max-w-md w-full shadow-xl shadow-indigo-100/50 text-center border border-slate-100">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Vérifiez vos emails</h2>
          <p className="text-slate-500 mb-8">
            Nous avons envoyé un lien de confirmation à <strong className="text-slate-700">{email}</strong>. Cliquez sur ce lien pour finaliser votre inscription.
          </p>
          <a href="/login" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-xl transition-all shadow-md shadow-indigo-200">
            Retour à la connexion
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
      {/* Background blobs for aesthetic */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-indigo-100 blur-[120px] opacity-70" />
        <div className="absolute bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-orange-50 blur-[100px] opacity-70" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* LOGO */}
        <div className="text-center mb-8">
          <a href="/" className="inline-block">
            <h1 className="text-3xl font-extrabold text-indigo-600 tracking-tight">FloService.</h1>
          </a>
          <p className="text-slate-500 mt-2 font-medium">Rejoignez notre communauté</p>
        </div>

        {/* CARD */}
        <div className="bg-white/80 backdrop-blur-xl border border-white shadow-2xl shadow-indigo-100/50 rounded-3xl p-8 sm:p-10">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Inscription</h2>
          
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1">Nom complet</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jean Dupont"
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-700 placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1">Adresse e-mail</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-700 placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 ml-1">Mot de passe</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  minLength={8}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-700 placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            {/* Provider Toggle */}
            <div className="pt-2">
              <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only"
                    checked={isProvider}
                    onChange={(e) => setIsProvider(e.target.checked)}
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors ${isProvider ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isProvider ? 'translate-x-5' : ''}`}></div>
                </div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm">Je suis un prestataire</div>
                  <div className="text-slate-500 text-xs">Je souhaite proposer mes services</div>
                </div>
              </label>
            </div>

            <button 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed group mt-4!"
            >
              {loading ? 'Création...' : 'Créer mon compte'}
              {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /> }
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-8 font-medium">
          Vous avez déjà un compte ?{" "}
          <a href="/login" className="text-indigo-600 font-bold hover:underline underline-offset-4">Connectez-vous</a>
        </p>
      </div>
    </div>
  );
}
