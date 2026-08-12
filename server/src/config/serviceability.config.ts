/**
 * Server-Side Serviceability Configuration
 * Phase 1: Mahasamund-Only Foundation
 */

export const MAHASAMUND_CONFIG = {
  id: 'mahasamund',
  name: 'Mahasamund',
  district: 'Mahasamund',
  state: 'Chhattisgarh',
  country: 'India',
  pincodes: ['493445', '493551', '493449', '493526', '493558', '493554', '493555', '493441'],
  center: { latitude: 21.1085, longitude: 82.0965 },
  maxRadiusKm: 35,
};

export function checkServerServiceability(params: {
  pincode?: string;
  city?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
}): {
  isServiceable: boolean;
  serviceArea: string;
  message: string;
  status: 'ACTIVE' | 'COMING_SOON' | 'UNSERVICEABLE';
} {
  const { pincode, city, district, latitude, longitude } = params;

  if (pincode) {
    const cleanPin = pincode.trim();
    if (MAHASAMUND_CONFIG.pincodes.includes(cleanPin) || cleanPin.startsWith('4934') || cleanPin.startsWith('4935')) {
      return {
        isServiceable: true,
        serviceArea: MAHASAMUND_CONFIG.name,
        message: 'Aether Mart is active in Mahasamund.',
        status: 'ACTIVE',
      };
    }
  }

  if (city || district) {
    const text = `${city || ''} ${district || ''}`.toLowerCase();
    if (text.includes('mahasamund')) {
      return {
        isServiceable: true,
        serviceArea: MAHASAMUND_CONFIG.name,
        message: 'Aether Mart is active in Mahasamund.',
        status: 'ACTIVE',
      };
    }

    if (text.includes('raipur') || text.includes('bhilai') || text.includes('durg')) {
      return {
        isServiceable: false,
        serviceArea: city || district || 'Selected Area',
        message: `Coming soon to ${city || district}! Currently delivering in Mahasamund.`,
        status: 'COMING_SOON',
      };
    }
  }

  if (latitude !== undefined && longitude !== undefined) {
    const distanceKm = haversineDistanceKm(
      latitude,
      longitude,
      MAHASAMUND_CONFIG.center.latitude,
      MAHASAMUND_CONFIG.center.longitude
    );

    if (distanceKm <= MAHASAMUND_CONFIG.maxRadiusKm) {
      return {
        isServiceable: true,
        serviceArea: MAHASAMUND_CONFIG.name,
        message: 'Aether Mart is active in Mahasamund.',
        status: 'ACTIVE',
      };
    }
  }

  return {
    isServiceable: false,
    serviceArea: city || pincode || 'this location',
    message: "Aether Mart isn't available here yet. We're currently delivering in Mahasamund.",
    status: 'UNSERVICEABLE',
  };
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
