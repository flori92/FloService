import { Country } from '../types';

export const countries: Country[] = [
  {
    code: 'BJ',
    name: 'Bénin',
    cities: [
      { name: 'Cotonou', code: 'cot' },
      { name: 'Porto-Novo', code: 'pnv' },
      { name: 'Parakou', code: 'pkx' },
      { name: 'Abomey-Calavi', code: 'abc' },
      { name: 'Bohicon', code: 'boh' }
    ]
  },
  {
    code: 'TG',
    name: 'Togo',
    cities: [
      { name: 'Lomé', code: 'lom' },
      { name: 'Sokodé', code: 'sok' },
      { name: 'Kara', code: 'kar' },
      { name: 'Kpalimé', code: 'kpa' },
      { name: 'Atakpamé', code: 'atk' }
    ]
  },
  {
    code: 'CI',
    name: "Côte d'Ivoire",
    cities: [
      { name: 'Abidjan', code: 'abj' },
      { name: 'Bouaké', code: 'bke' },
      { name: 'Yamoussoukro', code: 'yam' },
      { name: 'Korhogo', code: 'kor' },
      { name: 'San-Pédro', code: 'spd' }
    ]
  }
];