"use client";

import { useState } from "react";
import { Mail, Lock, ArrowRight, Github } from "lucide-react";
import { supabase } from "@floservice/shared/src/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;
      
      // Temporary success behavior
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de la connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {/* Background blobs for aesthetic */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-indigo-100 blur-[120px] opacity-70" />
        <div className="absolute top-[60%] -right-[10%] w-[60%] h-[60%] rounded-full bg-blue-50 blur-[100px] opacity-70" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* LOGO */}
        <div className="text-center mb-10">
          <a href="/" className="inline-block">
            <h1 className="text-3xl font-extrabold text-indigo-600 tracking-tight">FloService.</h1>
          </a>
          <p className="text-slate-500 mt-2 font-medium">Bon retour parmi nous</p>
        </div>

        {/* CARD */}
        <div className="bg-white/80 backdrop-blur-xl border border-white shadow-2xl shadow-indigo-100/50 rounded-3xl p-8 sm:p-10">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Connexion</h2>
          
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
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
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-semibold text-slate-700">Mot de passe</label>
                <a href="#" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">Mot de passe oublié ?</a>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-700 placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            <button 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed group mt-2"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
              {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /> }
            </button>
          </form>

          <div className="my-8 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-100"></div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ou continuer avec</span>
            <div className="flex-1 h-px bg-slate-100"></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-colors shadow-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
              Google
            </button>
            <button className="flex items-center justify-center gap-2 py-2.5 bg-[#171515] border border-[#171515] rounded-xl text-white font-semibold hover:bg-black transition-colors shadow-sm">
              <Github className="w-5 h-5 fill-current" />
              GitHub
            </button>
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm mt-8 font-medium">
          Vous n'avez pas encore de compte ?{" "}
          <a href="/register" className="text-indigo-600 font-bold hover:underline underline-offset-4">Inscrivez-vous</a>
        </p>
      </div>
    </div>
  );
}
