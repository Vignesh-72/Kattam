import * as Astronomy from 'astronomy-engine';

const ENGLISH_TO_NATIVE: Record<string, string> = {
  Sun: 'சூரியன்',
  Moon: 'சந்திரன்',
  Mars: 'செவ்வாய்',
  Mercury: 'புதன்',
  Jupiter: 'வியாழன்',
  Venus: 'சுக்கிரன்',
  Saturn: 'சனி',
};

function getAyanamsa(year: number) {
  // Simple Lahiri Ayanamsa approximation
  return 23.85 + (year - 2000) * (50.290966 / 3600);
}

export function calculateVedicChart(dateStr: string, timeStr: string, lat: number, lon: number, isTamil: boolean) {
  const dateTime = new Date(`${dateStr}T${timeStr}:00`);
  if (isNaN(dateTime.getTime())) return null;

  const time = new Astronomy.AstroTime(dateTime);
  const observer = new Astronomy.Observer(lat, lon, 0);
  const ayanamsa = getAyanamsa(dateTime.getUTCFullYear() + dateTime.getUTCMonth()/12);

  const bodies = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const;
  
  const rasiData: Record<number, string[]> = {};
  const amsamData: Record<number, string[]> = {};

  // Initialize grids
  for (let i = 1; i <= 12; i++) {
    rasiData[i] = [];
    amsamData[i] = [];
  }

  const tilt = Astronomy.e_tilt(time);
  const obl = tilt.tobl * Math.PI / 180;

  bodies.forEach(body => {
    const eq = Astronomy.Equator(body as unknown as Astronomy.Body, time, observer, true, true);
    const ra = eq.ra * 15 * Math.PI / 180; 
    const dec = eq.dec * Math.PI / 180;

    const y = Math.sin(ra) * Math.cos(obl) + Math.tan(dec) * Math.sin(obl);
    const x = Math.cos(ra);
    let tropicalLon = Math.atan2(y, x) * 180 / Math.PI;
    if (tropicalLon < 0) tropicalLon += 360;

    let siderealLon = tropicalLon - ayanamsa;
    if (siderealLon < 0) siderealLon += 360;

    const rasiIndex = Math.floor(siderealLon / 30);
    const rasiHouse = rasiIndex + 1;

    const navamsaInRasi = Math.floor((siderealLon % 30) / (30 / 9));
    let startHouseIndex = 0;
    if ([0, 4, 8].includes(rasiIndex)) startHouseIndex = 0; 
    else if ([1, 5, 9].includes(rasiIndex)) startHouseIndex = 9; 
    else if ([2, 6, 10].includes(rasiIndex)) startHouseIndex = 6; 
    else if ([3, 7, 11].includes(rasiIndex)) startHouseIndex = 3; 

    const amsamHouse = ((startHouseIndex + navamsaInRasi) % 12) + 1;

    const grahaName = isTamil ? ENGLISH_TO_NATIVE[body] : body;
    rasiData[rasiHouse].push(grahaName);
    amsamData[amsamHouse].push(grahaName);
  });

  return { rasiData, amsamData };
}
