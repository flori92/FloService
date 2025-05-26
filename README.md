# FloService - Plateforme de Services Professionnels en Afrique de l'Ouest

FloService est une plateforme moderne qui connecte les prestataires de services qualifiés avec les clients en Afrique de l'Ouest. La plateforme facilite la recherche, la réservation et la gestion de services professionnels.

## 🚀 Technologies Utilisées

### Frontend
- React 18 avec TypeScript
- Vite pour le bundling et le développement
- Tailwind CSS pour le styling
- Framer Motion pour les animations
- React Router pour la navigation
- React Intl pour l'internationalisation
- Lucide React pour les icônes
- React Hook Form pour la gestion des formulaires
- Zustand pour la gestion d'état

### Backend
- Supabase pour la base de données PostgreSQL
- Authentification et autorisation via Supabase Auth
- Stockage de fichiers avec Supabase Storage
- Edge Functions pour la logique serveur
- Row Level Security (RLS) pour la sécurité des données

## 🎨 Identité Visuelle

### Couleurs
- Principal: Teal (`#0D9488`)
- Secondaire: Indigo (`#4F46E5`)
- Accent: Orange (`#F97316`)
- Texte: Gray (`#111827`)
- Fond: White/Gray-50

### Typographie
- Police principale: Inter (Google Fonts)
- Hiérarchie:
  - Titres: 2xl-4xl, bold
  - Sous-titres: xl-2xl, semibold
  - Corps: base, regular
  - Petits textes: sm, medium

## 🏗 Architecture

### Structure des Dossiers
```
src/
├── components/      # Composants réutilisables
├── pages/          # Pages de l'application
├── store/          # Gestion d'état avec Zustand
├── hooks/          # Hooks personnalisés
├── lib/            # Configuration et utilitaires
├── types/          # Types TypeScript
├── i18n/           # Traductions
├── data/           # Données statiques
└── utils/          # Fonctions utilitaires
```

### Base de Données

#### Tables Principales
- `profiles`: Profils utilisateurs
- `services`: Services proposés
- `bookings`: Réservations
- `reviews`: Avis clients
- `messages`: Système de messagerie
- `notifications`: Notifications système

#### Tables Secondaires
- `service_areas`: Zones de service
- `certifications`: Certifications des prestataires
- `portfolio_items`: Portfolio des prestataires
- `service_pricing`: Tarification des services
- `provider_availability`: Disponibilité des prestataires

### Sécurité
- Row Level Security (RLS) sur toutes les tables
- Politiques d'accès granulaires
- Authentification JWT
- Validation des données côté serveur

## 🌟 Fonctionnalités

### Implémentées
- Authentification (email/mot de passe)
- Internationalisation (FR/EN)
- Recherche de services
- Filtrage par localisation
- Système de messagerie
- Notifications en temps réel
- Gestion des réservations
- Système d'avis et notations
- Portfolio des prestataires
- Gestion des disponibilités

### En Cours
- Paiements en ligne
- Vérification des prestataires
- Système de récompenses
- Application mobile

## 🔑 Configuration Supabase

### Variables d'Environnement
```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_clé_anon
```

### Buckets de Stockage
- `avatars`: Photos de profil
- `documents`: Documents de vérification
- `portfolio`: Images portfolio
- `chat-attachments`: Pièces jointes messagerie

## 📱 Responsive Design

L'application est entièrement responsive avec des breakpoints:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

## 🚀 Déploiement

### Prérequis
- Node.js 18+
- npm ou yarn
- Compte Supabase

### Installation
```bash
# Cloner le repository
git clone https://github.com/votre-username/floservice.git

# Installer les dépendances
cd floservice
npm install

# Configuration environnement
cp .env.example .env
# Remplir les variables d'environnement

# Démarrer en développement
npm run dev

# Build production
npm run build
```

## 📈 Performance

- Lazy loading des images
- Code splitting par route
- Optimisation des assets
- Mise en cache des requêtes
- Prefetching des données

## 📖 Documentation API

La documentation complète de l'API est disponible dans le dossier `docs/api`.

## 🤝 Contribution

Les contributions sont les bienvenues ! Voir `CONTRIBUTING.md` pour les guidelines.

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.