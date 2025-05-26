export interface ServiceProvider {
  id: string;
  name: string;
  profession: string;
  country: string;
  city: string;
  rating: number;
  reviews: number;
  memberSince: string;
  avatar: string;
  portfolio: string[];
  description: string;
  languages: string[];
  specialties: string[];
}

export interface Category {
  id: string;
  title: string;
  description: string;
  servicesCount: number;
  providers: ServiceProvider[];
}

export type CountryCode = 'BJ' | 'TG' | 'CI';

export interface City {
  name: string;
  code: string;
}

export interface Country {
  code: CountryCode;
  name: string;
  cities: City[];
}