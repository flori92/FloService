import { ServiceProvider } from '../types';

export const serviceProviders: ServiceProvider[] = [
  {
    id: 'provider-bj-1',  // Préfixe ajouté pour éviter les conflits
    name: 'Koffi AHOUANSOU',
    profession: 'Plombier',
    country: 'BJ',
    city: 'Cotonou',
    rating: 4.9,
    reviews: 124,
    memberSince: 'Avril 2022',
    avatar: 'https://images.pexels.com/photos/8993571/pexels-photo-8993571.jpeg',
    portfolio: [
      'https://images.pexels.com/photos/5691692/pexels-photo-5691692.jpeg',
      'https://images.pexels.com/photos/6419128/pexels-photo-6419128.jpeg',
      'https://images.pexels.com/photos/8724861/pexels-photo-8724861.jpeg'
    ],
    description: 'Plombier professionnel spécialisé dans les installations sanitaires modernes et traditionnelles.',
    languages: ['Français', 'Fon', 'Yoruba'],
    specialties: ['Installation sanitaire', 'Réparation de fuite', 'Débouchage']
  },
  {
    id: 'provider-bj-2',
    name: 'Afiavi DOSSOU',
    profession: 'Décoratrice d\'intérieur',
    country: 'BJ',
    city: 'Cotonou',
    rating: 4.8,
    reviews: 98,
    memberSince: 'Mars 2021',
    avatar: 'https://images.pexels.com/photos/7518829/pexels-photo-7518829.jpeg',
    portfolio: [
      'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg',
      'https://images.pexels.com/photos/1571459/pexels-photo-1571459.jpeg',
      'https://images.pexels.com/photos/1571458/pexels-photo-1571458.jpeg'
    ],
    description: 'Spécialiste en décoration d\'intérieur alliant modernité et traditions africaines.',
    languages: ['Français', 'Fon', 'Anglais'],
    specialties: ['Design contemporain', 'Décoration traditionnelle', 'Aménagement d\'espace']
  },
  {
    id: 'provider-bj-3',
    name: 'Codjo AGBESSI',
    profession: 'Électricien',
    country: 'BJ',
    city: 'Porto-Novo',
    rating: 4.7,
    reviews: 156,
    memberSince: 'Juin 2021',
    avatar: 'https://images.pexels.com/photos/8993563/pexels-photo-8993563.jpeg',
    portfolio: [
      'https://images.pexels.com/photos/8985454/pexels-photo-8985454.jpeg',
      'https://images.pexels.com/photos/8985458/pexels-photo-8985458.jpeg',
      'https://images.pexels.com/photos/8985462/pexels-photo-8985462.jpeg'
    ],
    description: 'Électricien certifié avec plus de 10 ans d\'expérience.',
    languages: ['Français', 'Fon', 'Goun'],
    specialties: ['Installation électrique', 'Dépannage', 'Éclairage LED']
  },
  {
    id: 'provider-bj-4',
    name: 'Abiba SAKA',
    profession: 'Coiffeuse',
    country: 'BJ',
    city: 'Parakou',
    rating: 4.9,
    reviews: 203,
    memberSince: 'Février 2021',
    avatar: 'https://images.pexels.com/photos/3992874/pexels-photo-3992874.jpeg',
    portfolio: [
      'https://images.pexels.com/photos/3065209/pexels-photo-3065209.jpeg',
      'https://images.pexels.com/photos/3065210/pexels-photo-3065210.jpeg',
      'https://images.pexels.com/photos/3065211/pexels-photo-3065211.jpeg'
    ],
    description: 'Spécialiste en coiffure africaine traditionnelle et moderne.',
    languages: ['Français', 'Bariba', 'Dendi'],
    specialties: ['Tresses', 'Coiffures de mariage', 'Extensions']
  },
  {
    id: 'provider-bj-5',
    name: 'Yaovi ADJAVON',
    profession: 'Menuisier',
    country: 'BJ',
    city: 'Abomey-Calavi',
    rating: 4.8,
    reviews: 167,
    memberSince: 'Mai 2021',
    avatar: 'https://images.pexels.com/photos/8993571/pexels-photo-8993571.jpeg',
    portfolio: [
      'https://images.pexels.com/photos/6207794/pexels-photo-6207794.jpeg',
      'https://images.pexels.com/photos/6207795/pexels-photo-6207795.jpeg',
      'https://images.pexels.com/photos/6207796/pexels-photo-6207796.jpeg'
    ],
    description: 'Artisan menuisier spécialisé dans le mobilier traditionnel et moderne.',
    languages: ['Français', 'Fon', 'Mina'],
    specialties: ['Meubles sur mesure', 'Menuiserie traditionnelle', 'Restauration']
  },
  {
    id: 'provider-tg-1',
    name: 'Kossi ADEBAYOR',
    profession: 'Électricien',
    country: 'TG',
    city: 'Lomé',
    rating: 4.7,
    reviews: 156,
    memberSince: 'Janvier 2022',
    avatar: 'https://images.pexels.com/photos/8993601/pexels-photo-8993601.jpeg',
    portfolio: [
      'https://images.pexels.com/photos/8985454/pexels-photo-8985454.jpeg',
      'https://images.pexels.com/photos/8985458/pexels-photo-8985458.jpeg',
      'https://images.pexels.com/photos/8985462/pexels-photo-8985462.jpeg'
    ],
    description: 'Électricien certifié avec expertise en installations résidentielles et commerciales.',
    languages: ['Français', 'Ewe', 'Kabye'],
    specialties: ['Installation électrique', 'Dépannage', 'Éclairage LED']
  },
  {
    id: 'provider-tg-2',
    name: 'Eric KOUDJO',
    profession: 'Menuisier',
    country: 'TG',
    city: 'Lomé',
    rating: 4.9,
    reviews: 203,
    memberSince: 'Février 2021',
    avatar: 'https://images.pexels.com/photos/1094767/pexels-photo-1094767.jpeg',
    portfolio: [
      'https://images.pexels.com/photos/6207794/pexels-photo-6207794.jpeg',
      'https://images.pexels.com/photos/6207795/pexels-photo-6207795.jpeg',
      'https://images.pexels.com/photos/6207796/pexels-photo-6207796.jpeg'
    ],
    description: 'Artisan menuisier spécialisé dans la fabrication de meubles sur mesure.',
    languages: ['Français', 'Ewe', 'Mina'],
    specialties: ['Meubles sur mesure', 'Menuiserie traditionnelle', 'Restauration']
  },
  {
    id: 'provider-tg-3',
    name: 'Ayélé LAWSON',
    profession: 'Coiffeuse',
    country: 'TG',
    city: 'Sokodé',
    rating: 4.8,
    reviews: 178,
    memberSince: 'Mars 2021',
    avatar: 'https://images.pexels.com/photos/7518873/pexels-photo-7518873.jpeg',
    portfolio: [
      'https://images.pexels.com/photos/3065209/pexels-photo-3065209.jpeg',
      'https://images.pexels.com/photos/3065210/pexels-photo-3065210.jpeg',
      'https://images.pexels.com/photos/3065211/pexels-photo-3065211.jpeg'
    ],
    description: 'Spécialiste en coiffure africaine et tresses.',
    languages: ['Français', 'Ewe', 'Kabye'],
    specialties: ['Tresses', 'Coiffures traditionnelles', 'Extensions']
  },
  {
    id: 'provider-ci-1',
    name: 'Kouamé KOFFI',
    profession: 'Maçon',
    country: 'CI',
    city: 'Abidjan',
    rating: 4.8,
    reviews: 167,
    memberSince: 'Mai 2021',
    avatar: 'https://images.pexels.com/photos/8993571/pexels-photo-8993571.jpeg',
    portfolio: [
      'https://images.pexels.com/photos/8985470/pexels-photo-8985470.jpeg',
      'https://images.pexels.com/photos/8985472/pexels-photo-8985472.jpeg',
      'https://images.pexels.com/photos/8985474/pexels-photo-8985474.jpeg'
    ],
    description: 'Maçon expérimenté spécialisé dans la construction et la rénovation.',
    languages: ['Français', 'Baoulé', 'Dioula'],
    specialties: ['Construction', 'Rénovation', 'Carrelage']
  },
  {
    id: 'provider-ci-2',
    name: 'Kady TOURÉ',
    profession: 'Coiffeuse',
    country: 'CI',
    city: 'Abidjan',
    rating: 5.0,
    reviews: 289,
    memberSince: 'Avril 2020',
    avatar: 'https://images.pexels.com/photos/3992873/pexels-photo-3992873.jpeg',
    portfolio: [
      'https://images.pexels.com/photos/3065209/pexels-photo-3065209.jpeg',
      'https://images.pexels.com/photos/3065210/pexels-photo-3065210.jpeg',
      'https://images.pexels.com/photos/3065211/pexels-photo-3065211.jpeg'
    ],
    description: 'Coiffeuse professionnelle spécialisée dans les coiffures africaines modernes et traditionnelles.',
    languages: ['Français', 'Baoulé', 'Anglais'],
    specialties: ['Tresses', 'Coiffures de mariage', 'Extensions']
  },
  {
    id: 'provider-ci-3',
    name: 'Sékou DIABATÉ',
    profession: 'Électricien',
    country: 'CI',
    city: 'Bouaké',
    rating: 4.7,
    reviews: 145,
    memberSince: 'Juin 2021',
    avatar: 'https://images.pexels.com/photos/8993601/pexels-photo-8993601.jpeg',
    portfolio: [
      'https://images.pexels.com/photos/8985454/pexels-photo-8985454.jpeg',
      'https://images.pexels.com/photos/8985458/pexels-photo-8985458.jpeg',
      'https://images.pexels.com/photos/8985462/pexels-photo-8985462.jpeg'
    ],
    description: 'Électricien qualifié avec expertise en installations industrielles.',
    languages: ['Français', 'Dioula', 'Baoulé'],
    specialties: ['Installation électrique', 'Maintenance industrielle', 'Automatisation']
  }
];

export const categories = [
  {
    id: 'batiment',
    title: 'Bâtiment et construction',
    description: 'Professionnels du bâtiment et de la construction',
    servicesCount: 1243,
    subcategories: [
      { id: 'maconnerie', name: 'Maçonnerie' },
      { id: 'plomberie', name: 'Plomberie' },
      { id: 'electricite', name: 'Électricité' },
      { id: 'menuiserie', name: 'Menuiserie' },
      { id: 'peinture', name: 'Peinture' },
      { id: 'carrelage', name: 'Carrelage' },
      { id: 'toiture', name: 'Toiture' }
    ]
  },
  {
    id: 'technique',
    title: 'Services techniques',
    description: 'Experts en services techniques et réparation',
    servicesCount: 856,
    subcategories: [
      { id: 'informatique', name: 'Informatique' },
      { id: 'electromenager', name: 'Électroménager' },
      { id: 'climatisation', name: 'Climatisation' },
      { id: 'automobile', name: 'Mécanique automobile' },
      { id: 'electronique', name: 'Électronique' },
      { id: 'serrurerie', name: 'Serrurerie' }
    ]
  },
  {
    id: 'services-pro',
    title: 'Services professionnels',
    description: 'Services professionnels et expertise',
    servicesCount: 567,
    subcategories: [
      { id: 'redaction', name: 'Rédaction web' },
      { id: 'graphisme', name: 'Graphisme' },
      { id: 'photographie', name: 'Photographie' },
      { id: 'marketing', name: 'Marketing digital' },
      { id: 'traduction', name: 'Traduction' },
      { id: 'comptabilite', name: 'Comptabilité' },
      { id: 'juridique', name: 'Services juridiques' }
    ]
  },
  {
    id: 'decoration',
    title: 'Aménagement et décoration',
    description: 'Experts en décoration et aménagement d\'intérieur',
    servicesCount: 872,
    subcategories: [
      { id: 'decoration-interieure', name: 'Décoration intérieure' },
      { id: 'design-espace', name: 'Design d\'espace' },
      { id: 'tapisserie', name: 'Tapisserie' },
      { id: 'ameublement', name: 'Ameublement' },
      { id: 'jardinage', name: 'Jardinage et paysagisme' }
    ]
  },
  {
    id: 'beaute',
    title: 'Beauté et bien-être',
    description: 'Professionnels de la beauté et du bien-être',
    servicesCount: 654,
    subcategories: [
      { id: 'coiffure', name: 'Coiffure' },
      { id: 'esthetique', name: 'Esthétique' },
      { id: 'massage', name: 'Massage' },
      { id: 'maquillage', name: 'Maquillage' },
      { id: 'soins', name: 'Soins du corps' }
    ]
  },
  {
    id: 'artisanat',
    title: 'Artisanat traditionnel',
    description: 'Artisans spécialisés dans les techniques traditionnelles',
    servicesCount: 423,
    subcategories: [
      { id: 'tissage', name: 'Tissage' },
      { id: 'poterie', name: 'Poterie' },
      { id: 'sculpture', name: 'Sculpture' },
      { id: 'bijouterie', name: 'Bijouterie traditionnelle' },
      { id: 'couture', name: 'Couture traditionnelle' }
    ]
  },
  {
    id: 'transport',
    title: 'Transport et logistique',
    description: 'Services de transport et logistique',
    servicesCount: 345,
    subcategories: [
      { id: 'demenagement', name: 'Déménagement' },
      { id: 'livraison', name: 'Livraison' },
      { id: 'transport-personnes', name: 'Transport de personnes' },
      { id: 'transport-marchandises', name: 'Transport de marchandises' }
    ]
  },
  {
    id: 'education',
    title: 'Éducation et formation',
    description: 'Services éducatifs et formation professionnelle',
    servicesCount: 289,
    subcategories: [
      { id: 'soutien-scolaire', name: 'Soutien scolaire' },
      { id: 'langues', name: 'Cours de langues' },
      { id: 'informatique', name: 'Formation informatique' },
      { id: 'professionnel', name: 'Formation professionnelle' }
    ]
  }
];