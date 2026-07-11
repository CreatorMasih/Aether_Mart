/**
 * Standard utility formatters for hyperlocal metrics
 */

/**
 * Formats a currency value to INR format (₹X.XX or ₹X)
 * @param amount - Number in decimal format (e.g. 129.5)
 */
export const formatCurrency = (amount: number, locale = 'en-IN'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Formats weight and volume metrics (grams, kilograms, milliliters, liters)
 * @param amount - Value quantity
 * @param unit - Unit type ('g' | 'kg' | 'ml' | 'l')
 */
export const formatWeight = (amount: number, unit: 'g' | 'kg' | 'ml' | 'l'): string => {
  if (amount >= 1000 && unit === 'g') {
    return `${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)} kg`;
  }
  if (amount >= 1000 && unit === 'ml') {
    return `${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)} l`;
  }
  return `${amount} ${unit}`;
};

/**
 * Formats distance metrics for delivery ranges
 * @param meters - Distance in meters
 */
export const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${meters} m`;
};

/**
 * Formats timestamps into readable delivery slot times
 * @param dateString - ISO string or Date
 */
export const formatTime = (dateString: string | Date): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Formats timestamps into a short date (e.g., "12 Jul, 10:30 PM")
 */
export const formatShortDateTime = (dateString: string | Date): string => {
  const date = new Date(dateString);
  const dayMonth = date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  });
  const time = formatTime(date);
  return `${dayMonth}, ${time}`;
};

/**
 * Formats a 10-digit phone number into standardized Indian telephone format.
 * @param phone - E.g. "9876543210" or "+919876543210"
 */
export const formatPhone = (phone: string): string => {
  const clean = phone.replace(/\D/g, '');
  const match = clean.match(/^(?:91)?(\d{5})(\d{5})$/);
  if (match) {
    return `+91 ${match[1]} ${match[2]}`;
  }
  return phone;
};
