"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard, MessageSquare, Settings, CreditCard, Bell,
  LogOut, Briefcase, PlusCircle, CheckCircle, TrendingUp,
  ChevronRight, Calendar, Clock, Star, User, Menu, X,
  ArrowUpRight, ArrowDownRight, Eye, MapPin, Camera,
  Shield, Zap, Target, BarChart3, Wallet,
} from "lucide-react";
import { supabase } from "@floservice/shared";

type Profile = { full_name: string; avatar_url: string; email: string };

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Tableau de bord", href: "/dashboard", active: true },
  { icon: Briefcase, label: "Mes services", href: "#" },
  { icon: MessageSquare, label: "Messages", href: "/messages", badge: 3 },
  { icon: CreditCard, label: "Paiements", href: "#" },
  { icon: Calendar, label: "Calendrier", href: "#" },
  { icon: Star, label: "Avis", href: "#" },
  { icon: Settings, label: "Parametres", href: "#" },
];

const KPI = [
  { label: "Gains ce mois", value: "320 000", unit: "FCFA", change: "+14%", positive: true, icon: Wallet, color: "bg-brand-50 text-brand-600" },
  { label: "Missions actives", value: "3", unit: "", change: "+1", positive: true, icon: Briefcase, color: "bg-amber-50 text-amber-600" },
  { label: "Note moyenne", value: "4.8", unit: "/5", change: "+0.2", positive: true, icon: Star, color: "bg-emerald-50 text-emerald-600" },
  { label: "Vues profil", value: "142", unit: "", change: "+23%", positive: true, icon: Eye, color: "bg-violet-50 text-violet-600" },
];

const RECENT_MISSIONS = [
  { id: "1", client: "Aminata K.", service: "Plomberie - Reparation fuite", amount: "45 000", status: "en_cours", date: "Aujourd'hui", avatar: "AK" },
  { id: "2", client: "Kofi M.", service: "Electricite - Installation prise", amount: "25 000", status: "termine", date: "Hier", avatar: "KM" },
  { id: "3", client: "Fatoumata D.", service: "Peinture - Chambre complete", amount: "120 000", status: "en_attente", date: "20 Mars", avatar: "FD" },
  { id: "4", client: "Seydou B.", service: "Menage - Nettoyage bureau", amount: "35 000", status: "termine", date: "18 Mars", avatar: "SB" },
];

const UPCOMING = [
  { id: "1", client: "Aminata K.", service: "Plomberie", time: "14:00 - 16:00", date: "Aujourd'hui", location: "Cocody, Abidjan" },
  { id: "2", client: "Jean-Pierre L.", service: "Electricite", time: "09:00 - 11:00", date: "Demain", location: "Plateau, Abidjan" },
];

const QUICK_ACTIONS = [
  { icon: PlusCircle, label: "Nouvelle offre", href: "#", color: "bg-brand-600 text-white" },
  { icon: Camera, label: "Ajouter photos", href: "#", color: "bg-amber-500 text-white" },
  { icon: Calendar, label: "Disponibilites", href: "#", color: "bg-emerald-500 text-white" },
  { icon: CreditCard, label: "Retrait", href: "#", color: "bg-violet-500 text-white" },
];

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  en_cours: { label: "En cours", class: "bg-brand-50 text-brand-700 border-brand-200" },
  termine: { label: "Termine", class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  en_attente: { label: "En attente", class: "bg-amber-50 text-amber-700 border-amber-200" },
};

const PROFILE_STEPS = [
  { label: "Photo de profil", done: true },
  { label: "Bio complete", done: true },
  { label: "Competences", done: true },
  { label: "Portfolio (3+ photos)", done: false },
  { label: "Verification identite", done: true },
  { label: "Premiere mission", done: false },
];

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const completedSteps = PROFILE_STEPS.filter((s) => s.done).length;
  const profilePct = Math.round((completedSteps / PROFILE_STEPS.length) * 100);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { window.location.href = "/login"; return; }

        const { data } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", session.user.id)
          .single();

        const p = data as any;
        setProfile({
          full_name: p?.full_name || "Prestataire",
          avatar_url: p?.avatar_url || `https://ui-avatars.com/api/?name=User&background=e0e7ff&color=4f46e5&bold=true`,
          email: session.user.email || "",
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, []);

  if (loading) {
    return (
      <div className="min-h-dvh bg-surface-50 flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="w-[260px] bg-white border-r border-slate-100 hidden lg:flex flex-col">
        <div className="h-[72px] flex items-center px-6 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-brand-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">
              Flo<span className="text-brand-600">Service</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                item.active
                  ? "bg-brand-50 text-brand-700 font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <item.icon className={`w-[18px] h-[18px] ${item.active ? "text-brand-600" : "text-slate-400"}`} />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="w-5 h-5 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Sidebar profile card */}
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50 mb-2">
            <img src={profile?.avatar_url} alt="" className="w-9 h-9 rounded-full border-2 border-white shadow-soft" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{profile?.full_name}</p>
              <p className="text-[11px] text-slate-500 truncate">{profile?.email}</p>
            </div>
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-[18px] h-[18px]" /> Deconnexion
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-white animate-slide-in-right flex flex-col">
            <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-brand-500 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">F</span>
                </div>
                <span className="font-bold text-slate-900">FloService</span>
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-1">
              {NAV_ITEMS.map((item) => (
                <Link key={item.label} href={item.href} onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium ${
                    item.active ? "bg-brand-50 text-brand-700" : "text-slate-600"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="w-5 h-5 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{item.badge}</span>
                  )}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-[72px] bg-white border-b border-slate-100 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-slate-100">
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h2 className="font-semibold text-slate-900">
                Bonjour, {profile?.full_name?.split(" ")[0]} 👋
              </h2>
              <p className="text-xs text-slate-500 hidden sm:block">Voici un apercu de votre activite</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="#" className="btn-primary text-sm py-2 px-4 hidden sm:inline-flex">
              <PlusCircle className="w-4 h-4" /> Nouvelle offre
            </Link>
            <button className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors">
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-soft">
              <img src={profile?.avatar_url} alt="" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {KPI.map((kpi) => (
              <div key={kpi.label} className="card p-5 group hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{kpi.label}</p>
                  <div className={`w-9 h-9 rounded-xl ${kpi.color} flex items-center justify-center`}>
                    <kpi.icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-slate-900">{kpi.value}</span>
                  {kpi.unit && <span className="text-sm text-slate-500 font-medium">{kpi.unit}</span>}
                </div>
                {kpi.change && (
                  <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${
                    kpi.positive ? "text-emerald-600" : "text-red-600"
                  }`}>
                    {kpi.positive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {kpi.change} vs mois dernier
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left column - 2/3 */}
            <div className="xl:col-span-2 space-y-6">
              {/* Quick actions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {QUICK_ACTIONS.map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className={`${action.color} rounded-2xl p-4 flex flex-col items-center gap-2.5 shadow-soft hover:shadow-medium hover:-translate-y-0.5 transition-all`}
                  >
                    <action.icon className="w-6 h-6" />
                    <span className="text-xs font-semibold text-center">{action.label}</span>
                  </Link>
                ))}
              </div>

              {/* Recent missions */}
              <div className="card overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Missions recentes</h3>
                  <Link href="#" className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1">
                    Voir tout <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="divide-y divide-slate-50">
                  {RECENT_MISSIONS.map((mission) => {
                    const status = STATUS_MAP[mission.status];
                    return (
                      <div key={mission.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-sm border border-brand-100 shrink-0">
                          {mission.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{mission.service}</p>
                          <p className="text-xs text-slate-500">{mission.client} &middot; {mission.date}</p>
                        </div>
                        <div className="text-right shrink-0 hidden sm:block">
                          <p className="text-sm font-bold text-slate-900">{mission.amount} FCFA</p>
                          <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-md border ${status.class}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="sm:hidden shrink-0">
                          <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-md border ${status.class}`}>
                            {status.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Earnings chart placeholder */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-slate-900">Revenus - 6 derniers mois</h3>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-brand-500" /> Gains
                    </span>
                  </div>
                </div>
                <div className="flex items-end gap-3 h-[160px]">
                  {[
                    { month: "Oct", value: 45 },
                    { month: "Nov", value: 62 },
                    { month: "Dec", value: 38 },
                    { month: "Jan", value: 75 },
                    { month: "Fev", value: 58 },
                    { month: "Mar", value: 85 },
                  ].map((bar) => (
                    <div key={bar.month} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full relative flex-1 flex items-end">
                        <div
                          className={`w-full rounded-t-lg transition-all ${
                            bar.month === "Mar"
                              ? "bg-gradient-to-t from-brand-600 to-brand-400"
                              : "bg-brand-100 hover:bg-brand-200"
                          }`}
                          style={{ height: `${bar.value}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">{bar.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column - 1/3 */}
            <div className="space-y-6">
              {/* Profile completion */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900 text-sm">Completion du profil</h3>
                  <span className="text-sm font-bold text-brand-600">{profilePct}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full mb-4 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full transition-all"
                    style={{ width: `${profilePct}%` }}
                  />
                </div>
                <div className="space-y-2.5">
                  {PROFILE_STEPS.map((step) => (
                    <div key={step.label} className="flex items-center gap-2.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        step.done
                          ? "bg-emerald-500 text-white"
                          : "border-2 border-slate-200"
                      }`}>
                        {step.done && <CheckCircle className="w-3.5 h-3.5" />}
                      </div>
                      <span className={`text-sm ${step.done ? "text-slate-500 line-through" : "text-slate-700 font-medium"}`}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
                <button className="btn-secondary w-full py-2.5 text-sm mt-4">
                  Completer mon profil
                </button>
              </div>

              {/* Upcoming appointments */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900 text-sm">Prochains RDV</h3>
                  <Link href="#" className="text-xs font-medium text-brand-600 hover:text-brand-700">
                    Voir tout
                  </Link>
                </div>
                <div className="space-y-3">
                  {UPCOMING.map((rdv) => (
                    <div key={rdv.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-slate-900">{rdv.client}</span>
                        <span className="badge-brand text-[10px]">{rdv.date}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-1">{rdv.service}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {rdv.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {rdv.location}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance tips */}
              <div className="card p-5 bg-gradient-to-br from-brand-600 to-brand-700 text-white">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-brand-200" />
                  <h3 className="font-semibold text-sm">Boostez vos missions</h3>
                </div>
                <p className="text-brand-200 text-xs leading-relaxed mb-4">
                  Les prestataires avec des photos de portfolio recoivent 3x plus de demandes. Ajoutez vos realisations !
                </p>
                <button className="w-full py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold transition-colors backdrop-blur">
                  Ajouter des photos
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
