import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

interface KattamGridProps {
  title: string;
  data: Record<number, string[]>;
  onChange: (houseIndex: number, grahas: string[]) => void;
}

// CPU-02: Moved all constants to module scope so they are evaluated ONCE
// when the file is first imported — not recreated on every component render.
const GRAHAS_TA = [
  'சூரியன்', 'சந்திரன்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'சுக்கிரன்', 'சனி', 'ராகு', 'கேது', 'லக்னம்'
];

const GRAHAS_EN = [
  'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu', 'Lagnam'
];

// CPU-02: Object lookup replaces a 12-case switch function — O(1) vs O(n)
const GRID_AREAS: Record<number, string> = {
  12: '1 / 1 / 2 / 2', 1: '1 / 2 / 2 / 3', 2: '1 / 3 / 2 / 4', 3: '1 / 4 / 2 / 5',
  4: '2 / 4 / 3 / 5',  5: '3 / 4 / 4 / 5', 6: '4 / 4 / 5 / 5', 7: '4 / 3 / 5 / 4',
  8: '4 / 2 / 5 / 3',  9: '4 / 1 / 5 / 2', 10: '3 / 1 / 4 / 2', 11: '2 / 1 / 3 / 2',
};

export default function KattamGrid({ title, data, onChange }: KattamGridProps) {
  const { t, language } = useLanguage();

  const GRAHAS = language === 'ta' ? GRAHAS_TA : GRAHAS_EN;

  const handleSelect = (house: number, e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) return;
    const current = data[house] || [];
    if (!current.includes(val)) {
      onChange(house, [...current, val]);
    }
    e.target.value = '';
  };

  const removeGraha = (house: number, graha: string) => {
    const current = data[house] || [];
    onChange(house, current.filter(g => g !== graha));
  };

  return (
    <div className="kattam-grid">
      <div className="kattam-center">{title}</div>
      {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(house => (
        <div key={house} className="kattam-box" style={{ gridArea: GRID_AREAS[house] }}>
          <div className="kattam-box-title" style={{ fontSize: '0.65rem', color: '#a1a1aa' }}>
            {house}
          </div>
          {(data[house] || []).map(graha => (
            <div key={graha} className="graha-pill">
              {graha}
              <button type="button" onClick={() => removeGraha(house, graha)}>&times;</button>
            </div>
          ))}
          <select className="kattam-box-select no-print" onChange={(e) => handleSelect(house, e)} defaultValue="">
            <option value="">{t('add')}</option>
            {GRAHAS.map(g => (
              <option key={g} value={g} disabled={(data[house] || []).includes(g)}>
                {g}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
