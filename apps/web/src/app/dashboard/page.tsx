"use client";

import { useEffect, useState } from "react";
import { LayoutDashboard, MessageSquare, Settings, CreditCard, Bell, LogOut, Briefcase, PlusCircle, CheckCircle } from "lucide-react";
import { supabase } from "@floservice/shared";

type Profile = {
  full_name: string;
  avatar_url: string;
  email: string;
};

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          window.location.href = "/login";
          return;
        }

        const { data } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", session.user.id)
          .single();

        const profileData = data as any;

        setProfile({
          full_name: profileData?.full_name || "Prestataire",
          avatar_url: profileData?.avatar_url || `https://ui-avatars.com/api/?name=Prestataire&background=4f46e5&color=fff`,
          email: session.user.email || ""
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, []);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center animate-pulse"><div className="w-12 h-12 bg-indigo-200 rounded-full"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <a href="/" className="font-bold text-xl text-indigo-600 tracking-tight">FloService.</a>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-4 py-8 space-y-1">
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 bg-indigo-50 text-indigo-700 font-semibold rounded-lg transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            Tableau de bord
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium rounded-lg transition-colors group">
            <Briefcase className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
            Mes Annonces
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium rounded-lg transition-colors group justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
              Messages
            </div>
            <span className="w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">2</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium rounded-lg transition-colors group">
            <CreditCard className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
            Paiements
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium rounded-lg transition-colors group">
            <Settings className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
            Paramètres
          </a>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={async () => { await supabase.auth.signOut(); window.location.href="/login"; }}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-red-600 hover:bg-red-50 font-medium rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* MAIN LAYOUT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOPBAR */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8">
          <div className="md:hidden font-bold text-lg text-indigo-600 tracking-tight">FloService.</div>
          <div className="hidden md:block font-semibold text-slate-800 tracking-tight">Bonjour, {profile?.full_name?.split(" ")[0]} 🚀</div>
          
          <div className="flex items-center gap-4">
            <button className="hidden sm:flex items-center gap-2 bg-slate-900 text-white px-4 py-2 text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors">
              <PlusCircle className="w-4 h-4" /> Nouvelle offre
            </button>
            <div className="relative">
              <Bell className="w-5 h-5 text-slate-600 cursor-pointer" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="h-8 w-8 rounded-full border border-slate-200 overflow-hidden ml-2 cursor-pointer ring-2 ring-white hover:ring-indigo-100 transition-all">
              <img src={profile?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">Aperçu général</h1>

          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-start justify-between shadow-sm">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Gains ce mois</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-extrabold text-slate-900 flex items-baseline">320<span className="text-xl ml-0.5">€</span></h3>
                  <span className="text-sm font-bold text-green-600 bg-green-50 px-1.5 rounded">+14%</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600"><CreditCard className="w-6 h-6" /></div>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-start justify-between shadow-sm">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Missions actives</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-extrabold text-slate-900">3</h3>
                </div>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600"><Briefcase className="w-6 h-6" /></div>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-start justify-between shadow-sm">
              <div>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Profil complété</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-extrabold text-slate-900">85%</h3>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600"><CheckCircle className="w-6 h-6" /></div>
            </div>
          </div>

          {/* PENDING REQUESTS OR ANNOUNCEMENTS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Dernières demandes de service</h2>
              <a href="#" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Voir tout</a>
            </div>
            <div className="p-8 text-center text-slate-500">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <MessageSquare className="w-6 h-6 text-slate-400" />
              </div>
              <p className="font-medium text-slate-800 mb-1">Aucune nouvelle demande pour l'instant</p>
              <p className="text-sm max-w-sm mx-auto">Optimisez votre profil ou ajoutez plus de photos de vos réalisations pour attirer plus de clients.</p>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
