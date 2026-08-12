/**
 * Serviceability Configuration for Aether Mart
 * Phase 1: Mahasamund-Only Foundation
 * Architecture allows easily adding future cities (Raipur, Bhilai, Durg) without code rewrites.
 */

export interface ServiceableCity {
  id: string;
  name: string;
  district: string;
  state: string;
  pincodes: string[];
  center: { latitude: number; longitude: number };
  maxRadiusKm: number;
  status: 'ACTIVE' | 'COMING_SOON';
}

export const SERVICEABILITY_CONFIG: {
  activeCity: ServiceableCity;
  upcomingCities: Array<{ name: string; district: string; state: string; status: 'COMING_SOON' }>;
} = {
  activeCity: {
    id: 'mahasamund',
    name: 'Mahasamund',
    district: 'Mahasamund',
    state: 'Chhattisgarh',
    pincodes: ['493445', '493551', '493449', '493526', '493558', '493554', '493555', '493441'],
    center: { latitude: 21.1085, longitude: 82.0965 },
    maxRadiusKm: 35, // Covers Mahasamund district & tehsils
    status: 'ACTIVE',
  },
  upcomingCities: [
    { name: 'Raipur', district: 'Raipur', state: 'Chhattisgarh', status: 'COMING_SOON' },
    { name: 'Bhilai', district: 'Durg', state: 'Chhattisgarh', status: 'COMING_SOON' },
    { name: 'Durg', district: 'Durg', state: 'Chhattisgarh', status: 'COMING_SOON' },
    { name: 'Rajnandgaon', district: 'Rajnandgaon', state: 'Chhattisgarh', status: 'COMING_SOON' },
    { name: 'Bilaspur', district: 'Bilaspur', state: 'Chhattisgarh', status: 'COMING_SOON' },
  ],
};

import type { Address, CustomerLocation } from '../../types';

export const DEFAULT_MAHASAMUND_ADDRESS: Address = {
  id: 'addr-default-mahasamund',
  label: 'Home',
  receiverName: 'Customer',
  receiverPhone: '',
  streetAddress: 'Main Market, Station Road, Mahasamund',
  postalCode: '493445',
  city: 'Mahasamund',
  district: 'Mahasamund',
  state: 'Chhattisgarh',
  coordinates: {
    latitude: 21.1085,
    longitude: 82.0965,
  },
  isServiceable: true,
};

export const DEFAULT_MAHASAMUND_LOCATION: CustomerLocation = {
  id: 'loc-default-mahasamund',
  selectionType: 'PRESET',
  label: 'Mahasamund',
  streetAddress: 'Main Market, Station Road, Mahasamund',
  postalCode: '493445',
  city: 'Mahasamund',
  district: 'Mahasamund',
  state: 'Chhattisgarh',
  coordinates: {
    latitude: 21.1085,
    longitude: 82.0965,
  },
  isServiceable: true,
};

/**
 * Checks if a given location/pincode/city is serviceable (Mahasamund only in MVP).
 */
export function checkLocationServiceability(input: {
  pincode?: string;
  city?: string;
  district?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
}): {
  isServiceable: boolean;
  serviceArea: string;
  message: string;
  status: 'ACTIVE' | 'COMING_SOON' | 'UNSERVICEABLE';
} {
  const { pincode, city, district, latitude, longitude } = input;
  const active = SERVICEABILITY_CONFIG.activeCity;

  // 1. PIN code check
  if (pincode) {
    const cleanPin = pincode.trim();
    if (active.pincodes.includes(cleanPin) || cleanPin.startsWith('4934') || cleanPin.startsWith('4935')) {
      return {
        isServiceable: true,
        serviceArea: active.name,
        message: `Aether Mart is active in ${active.name}`,
        status: 'ACTIVE',
      };
    }
  }

  // 2. City / District text match
  if (city || district) {
    const text = `${city || ''} ${district || ''}`.toLowerCase();
    if (text.includes('mahasamund')) {
      return {
        isServiceable: true,
        serviceArea: active.name,
        message: `Aether Mart is active in ${active.name}`,
        status: 'ACTIVE',
      };
    }

    // Check if it's one of the upcoming cities
    const isUpcoming = SERVICEABILITY_CONFIG.upcomingCities.some((c) =>
      text.includes(c.name.toLowerCase()) || text.includes(c.district.toLowerCase())
    );

    if (isUpcoming) {
      return {
        isServiceable: false,
        serviceArea: city || district || 'Your City',
        message: `We're coming soon to ${city || district}! Currently operating in Mahasamund.`,
        status: 'COMING_SOON',
      };
    }
  }

  // 3. Geolocation coordinates distance check
  if (latitude !== undefined && longitude !== undefined) {
    const distanceKm = haversineDistanceKm(
      latitude,
      longitude,
      active.center.latitude,
      active.center.longitude
    );

    if (distanceKm <= active.maxRadiusKm) {
      return {
        isServiceable: true,
        serviceArea: active.name,
        message: `Aether Mart is active in ${active.name}`,
        status: 'ACTIVE',
      };
    }
  }

  // 4. Default: Not serviceable outside Mahasamund
  return {
    isServiceable: false,
    serviceArea: city || pincode || 'this area',
    message: "Aether Mart isn't available here yet. We're currently delivering in Mahasamund.",
    status: 'UNSERVICEABLE',
  };
}

/**
 * Calculates Haversine distance in kilometers between two GPS points
 */
function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
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
