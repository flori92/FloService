import React from 'react';
import { countries } from '../data/locations';
import { CountryCode } from '../types';

interface LocationFilterProps {
  selectedCountry: CountryCode | '';
  selectedCity: string;
  onCountryChange: (country: CountryCode | '') => void;
  onCityChange: (city: string) => void;
}

const LocationFilter: React.FC<LocationFilterProps> = ({
  selectedCountry,
  selectedCity,
  onCountryChange,
  onCityChange
}) => {
  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as CountryCode | '';
    onCountryChange(value);
    onCityChange('');
  };

  const selectedCountryData = selectedCountry ? 
    countries.find(country => country.code === selectedCountry) : 
    null;

  return (
    <div className="flex gap-4">
      <select
        value={selectedCountry}
        onChange={handleCountryChange}
        className="w-full p-3 border border-gray-300 rounded-lg"
      >
        <option value="">Tous les pays</option>
        {countries.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </select>

      <select
        value={selectedCity}
        onChange={(e) => onCityChange(e.target.value)}
        className="w-full p-3 border border-gray-300 rounded-lg"
        disabled={!selectedCountry}
      >
        <option value="">Toutes les villes</option>
        {selectedCountryData?.cities.map((city) => (
          <option key={city.code} value={city.code}>
            {city.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LocationFilter;