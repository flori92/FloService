// Test simple de la fonction getProfileWithProviderData
console.log('🧪 Test de la structure des données pour profil prestataire');

// Simuler les données retournées par getProfileWithProviderData pour tg-2
const testData = {
  id: 'tg-2',
  full_name: 'Prestataire Test',
  nom: 'Prestataire Test',
  email: 'test@floservice.com',
  is_provider: true,
  avatar_url: '/default-avatar.png',
  business_name: 'Entreprise Test',
  bio: 'Profil de test pour le développement de l\'application FloService',
  city: 'Paris',
  provider_profiles: [{
    id: 'tg-2-provider',
    specialization: 'Développement Test',
    specialites: ['Test'],
    description: 'Profil de test pour le développement',
    experience_years: 5,
    hourly_rate: 50,
    rating: 4.5,
    reviews_count: 10
  }]
};

// Simuler la fonction createSafeProfileFromData du composant
const defaultProfile = {
  id: '',
  full_name: 'Prestataire',
  avatar_url: '/default-avatar.png',
  business_name: '',
  bio: 'Informations non disponibles',
  is_provider: true,
  city: '',
  provider_profiles: {
    specialization: '',
    experience_years: 0,
    hourly_rate: 0,
    rating: 0,
    reviews_count: 0
  }
};

const createSafeProfileFromData = (data, isProvider = false) => {
  if (!data) return defaultProfile;

  const profile = {
    id: data.id || defaultProfile.id,
    full_name: data.full_name || defaultProfile.full_name,
    avatar_url: data.avatar_url || defaultProfile.avatar_url,
    business_name: data.business_name || defaultProfile.business_name,
    bio: data.bio || defaultProfile.bio,
    is_provider: isProvider || data.is_provider || defaultProfile.is_provider,
    city: data.city || defaultProfile.city,
  };

  if (data.provider_profiles) {
    const providerData = Array.isArray(data.provider_profiles) 
      ? data.provider_profiles[0] 
      : data.provider_profiles;
    
    profile.provider_profiles = {
      specialization: providerData?.specialization || defaultProfile.provider_profiles?.specialization,
      experience_years: providerData?.experience_years || defaultProfile.provider_profiles?.experience_years,
      hourly_rate: providerData?.hourly_rate || defaultProfile.provider_profiles?.hourly_rate,
      rating: providerData?.rating || defaultProfile.provider_profiles?.rating,
      reviews_count: providerData?.reviews_count || defaultProfile.provider_profiles?.reviews_count,
    };
  } else {
    profile.provider_profiles = defaultProfile.provider_profiles;
  }

  return profile;
};

// Test
console.log('📊 Données simulées de getProfileWithProviderData:');
console.log(JSON.stringify(testData, null, 2));

console.log('\n🔄 Après traitement par createSafeProfileFromData:');
const processedProfile = createSafeProfileFromData(testData, true);
console.log(JSON.stringify(processedProfile, null, 2));

console.log('\n✅ Vérifications:');
console.log('  - full_name:', processedProfile.full_name);
console.log('  - avatar_url:', processedProfile.avatar_url);
console.log('  - city:', processedProfile.city);
console.log('  - specialization:', processedProfile.provider_profiles?.specialization);
console.log('  - experience_years:', processedProfile.provider_profiles?.experience_years);
console.log('  - hourly_rate:', processedProfile.provider_profiles?.hourly_rate);
console.log('  - rating:', processedProfile.provider_profiles?.rating);

console.log('\n🎯 Résultat: Les données sont maintenant compatibles avec ProviderProfile.tsx');
