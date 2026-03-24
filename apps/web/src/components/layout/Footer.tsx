import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

const FOOTER_LINKS = {
  plateforme: [
    { label: "Explorer les services", href: "/explorer" },
    { label: "Devenir prestataire", href: "/register" },
    { label: "Comment ca marche", href: "/#how-it-works" },
    { label: "Tarifs", href: "#" },
  ],
  categories: [
    { label: "Bricolage & Reparation", href: "/explorer?cat=bricolage" },
    { label: "Menage & Nettoyage", href: "/explorer?cat=menage" },
    { label: "Demenagement", href: "/explorer?cat=demenagement" },
    { label: "Soutien scolaire", href: "/explorer?cat=soutien" },
    { label: "Informatique & Tech", href: "/explorer?cat=informatique" },
  ],
  support: [
    { label: "Centre d'aide", href: "#" },
    { label: "Nous contacter", href: "#" },
    { label: "Conditions d'utilisation", href: "#" },
    { label: "Politique de confidentialite", href: "#" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      {/* CTA Banner */}
      <div className="container-tight">
        <div className="relative -top-16 bg-gradient-to-r from-brand-600 to-brand-500 rounded-3xl p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-glow-lg">
          <div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white text-balance">
              Pret a trouver votre prestataire ideal ?
            </h3>
            <p className="text-brand-100 mt-2 text-lg">
              Rejoignez plus de 10 000 utilisateurs satisfaits
            </p>
          </div>
          <Link
            href="/register"
            className="shrink-0 inline-flex items-center gap-2 bg-white text-brand-700 font-bold px-8 py-4 rounded-xl shadow-medium hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200"
          >
            S'inscrire gratuitement
          </Link>
        </div>
      </div>

      {/* Links */}
      <div className="container-tight pb-12 -mt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                Flo<span className="text-brand-400">Service</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed mb-6 max-w-xs">
              La plateforme de reference pour trouver des prestataires de confiance pres de chez vous en Afrique.
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <span className="flex items-center gap-2 text-slate-400">
                <MapPin className="w-4 h-4 text-brand-400 shrink-0" /> Lome, Togo
              </span>
              <span className="flex items-center gap-2 text-slate-400">
                <Mail className="w-4 h-4 text-brand-400 shrink-0" /> contact@floservice.com
              </span>
            </div>
          </div>

          {/* Plateforme */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wide uppercase mb-4">Plateforme</h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.plateforme.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wide uppercase mb-4">Categories</h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.categories.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wide uppercase mb-4">Support</h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.support.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">&copy; 2025 FloService. Tous droits reserves.</p>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link href="#" className="hover:text-slate-300 transition-colors">Mentions legales</Link>
            <Link href="#" className="hover:text-slate-300 transition-colors">CGU</Link>
            <Link href="#" className="hover:text-slate-300 transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
