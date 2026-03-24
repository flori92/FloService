import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image as RNImage, ActivityIndicator } from 'react-native';
import { Search, MapPin, Wrench, Paintbrush, Truck, BookOpen, Star, ShieldCheck } from 'lucide-react-native';
import { supabase } from '@floservice/shared';

type Provider = {
  id: string;
  full_name: string;
  city: string;
  avatar_url: string;
  rating_average: number;
  review_count: number;
  provider_profiles?: {
    specialization: string;
    hourly_rate: number;
  }[];
};

export default function HomeScreen() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    { name: "Bricolage", icon: Wrench, color: "#e0e7ff", iconColor: "#4f46e5" },
    { name: "Ménage", icon: Paintbrush, color: "#fce7f3", iconColor: "#db2777" },
    { name: "Déménagement", icon: Truck, color: "#dcfce7", iconColor: "#16a34a" },
    { name: "Scolaire", icon: BookOpen, color: "#fef3c7", iconColor: "#d97706" },
  ];

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select(`
            id, full_name, city, avatar_url, rating_average, review_count,
            provider_profiles ( specialization, hourly_rate )
          `)
          .eq('is_provider', true)
          .limit(10);
        
        setProviders((data as any) || []);
      } catch (e) {
        console.error("Mobile DB Error", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProviders();
  }, []);

  return (
    <View style={styles.container}>
      {/* HEADER / SEARCH */}
      <View style={styles.header}>
        <Text style={styles.logo}>FloService.</Text>
        <View style={styles.searchBar}>
          <Search size={20} color="#94a3b8" />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Que recherchez-vous ?" 
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* CATEGORIES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Catégories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
            {categories.map((cat, i) => (
              <TouchableOpacity key={i} style={styles.categoryItem}>
                <View style={[styles.categoryIconWrap, { backgroundColor: cat.color }]}>
                  <cat.icon size={24} color={cat.iconColor} />
                </View>
                <Text style={styles.categoryName}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* TOP PROVIDERS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>À proximité de vous</Text>
            <TouchableOpacity><Text style={styles.seeAll}>Voir tout</Text></TouchableOpacity>
          </View>

          {loading ? (
             <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 20 }} />
          ) : providers.length === 0 ? (
             <Text style={{ textAlign: 'center', color: '#64748b', marginTop: 20 }}>Aucun prestataire trouvé.</Text>
          ) : (
            providers.map(provider => {
              const spec = provider.provider_profiles?.[0]?.specialization || "Service Multi-tâches";
              const price = provider.provider_profiles?.[0]?.hourly_rate || 15;
              const avatar = provider.avatar_url || `https://ui-avatars.com/api/?name=${provider.full_name}&background=e0e7ff&color=4f46e5`;

              return (
                <TouchableOpacity key={provider.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <RNImage source={{ uri: avatar }} style={styles.avatar} />
                    <View style={styles.cardInfo}>
                      <Text style={styles.providerName} numberOfLines={1}>{provider.full_name}</Text>
                      <Text style={styles.providerSpec} numberOfLines={1}>{spec}</Text>
                      <View style={styles.ratingRow}>
                        <ShieldCheck size={14} color="#16a34a" />
                        <Star size={14} color="#eab308" fill="#eab308" style={{ marginLeft: 6}} />
                        <Text style={styles.ratingText}>{provider.rating_average || 5.0} ({provider.review_count || 0})</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.cardFooter}>
                    <View style={styles.locationRow}>
                      <MapPin size={14} color="#94a3b8" />
                      <Text style={styles.locationText}>{provider.city || "À distance"}</Text>
                    </View>
                    <Text style={styles.price}>{price}€ <Text style={styles.priceUnit}>/ h</Text></Text>
                  </View>
                </TouchableOpacity>
              )
            })
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingTop: 60, paddingBottom: 15, paddingHorizontal: 20,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  logo: { fontSize: 24, fontWeight: '800', color: '#4f46e5', marginBottom: 15 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#0f172a' },
  scrollContent: { paddingBottom: 30 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', paddingHorizontal: 20, marginBottom: 15 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20 },
  seeAll: { color: '#4f46e5', fontWeight: '600', fontSize: 14 },
  categoriesContainer: { paddingHorizontal: 15 },
  categoryItem: { alignItems: 'center', marginRight: 20, width: 70 },
  categoryIconWrap: {
    width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  categoryName: { fontSize: 13, fontWeight: '500', color: '#475569', textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 20, marginBottom: 15,
    borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#94a3b8', shadowOpacity: 0.1, shadowRadius: 10, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', padding: 15, alignItems: 'flex-start' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#f1f5f9' },
  cardInfo: { flex: 1, marginLeft: 15 },
  providerName: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  providerSpec: { fontSize: 14, color: '#64748b', marginBottom: 6 },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 13, fontWeight: '600', color: '#475569', marginLeft: 4 },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 15, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#f8fafc', borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontSize: 13, color: '#64748b', marginLeft: 6 },
  price: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  priceUnit: { fontSize: 12, fontWeight: '600', color: '#64748b' },
});
