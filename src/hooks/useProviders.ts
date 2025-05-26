import { useMemo } from 'react';
import { serviceProviders } from '../data/providers';
import { ServiceProvider, CountryCode } from '../types';

export function useProviders(query?: string, country?: CountryCode | '', city?: string) {
  return useMemo(() => {
    let filtered = [...serviceProviders];

    // Filter by country first
    if (country) {
      filtered = filtered.filter(provider => provider.country === country);
    }

    // Then by city
    if (city) {
      filtered = filtered.filter(provider => 
        provider.city.toLowerCase() === city.toLowerCase()
      );
    }

    // Finally by search query
    if (query) {
      const searchTerms = query.toLowerCase().trim().split(/\s+/);
      filtered = filtered.filter(provider => {
        // Create a comprehensive searchable text from provider data
        const searchableText = [
          provider.name,
          provider.profession,
          provider.description,
          ...provider.specialties,
          ...provider.languages,
          // Add more searchable fields as needed
        ].join(' ').toLowerCase();

        // Match if any search term is found in the searchable text
        return searchTerms.some(term => searchableText.includes(term));
      });
    }

    return filtered;
  }, [query, country, city]);
}