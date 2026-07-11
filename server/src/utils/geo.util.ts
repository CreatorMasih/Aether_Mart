/**
 * Geospatial utilities for hyperlocal commerce.
 * Uses the Haversine formula for accurate earth-surface distance calculation.
 */

const EARTH_RADIUS_KM = 6371;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate the great-circle distance between two points on Earth
 * using the Haversine formula.
 *
 * @returns Distance in kilometers
 */
export function haversineDistance(from: Coordinates, to: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) *
      Math.cos(toRad(to.latitude)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Check if a coordinate is within a given radius of a center point.
 *
 * @param center - The reference center point
 * @param point - The point to check
 * @param radiusKm - The maximum allowed distance in km
 */
export function isWithinRadius(
  center: Coordinates,
  point: Coordinates,
  radiusKm: number
): boolean {
  return haversineDistance(center, point) <= radiusKm;
}

/**
 * Sort an array of items with coordinates by their distance from a center point.
 *
 * @param center - The user's location
 * @param items - Items with latitude/longitude fields
 * @param getCoords - Extractor function for coordinates
 */
export function sortByDistance<T>(
  center: Coordinates,
  items: T[],
  getCoords: (item: T) => Coordinates
): T[] {
  return [...items].sort((a, b) => {
    const distA = haversineDistance(center, getCoords(a));
    const distB = haversineDistance(center, getCoords(b));
    return distA - distB;
  });
}

/**
 * Build a bounding box for a rough DB pre-filter before Haversine refinement.
 * This avoids a full table scan — filter by lat/lng range first, then refine.
 *
 * @returns { minLat, maxLat, minLng, maxLng }
 */
export function getBoundingBox(
  center: Coordinates,
  radiusKm: number
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const latDelta = radiusKm / EARTH_RADIUS_KM * (180 / Math.PI);
  const lngDelta = latDelta / Math.cos((center.latitude * Math.PI) / 180);

  return {
    minLat: center.latitude - latDelta,
    maxLat: center.latitude + latDelta,
    minLng: center.longitude - lngDelta,
    maxLng: center.longitude + lngDelta,
  };
}

/**
 * Estimate delivery time in minutes based on distance and average speed.
 *
 * @param distanceKm - Distance in km
 * @param avgSpeedKmh - Average rider speed (default: 25 km/h for city)
 * @param preparationMins - Store preparation time (default: 5 min)
 */
export function estimateDeliveryMinutes(
  distanceKm: number,
  avgSpeedKmh = 25,
  preparationMins = 5
): number {
  const travelMins = (distanceKm / avgSpeedKmh) * 60;
  return Math.ceil(preparationMins + travelMins);
}
