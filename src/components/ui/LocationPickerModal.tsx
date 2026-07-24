import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, X, AlertTriangle } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../utils/cn';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAddress: (addressData: {
    streetAddress: string;
    houseNumber: string;
    landmark: string;
    postalCode: string;
    city: string;
    state: string;
    latitude: number;
    longitude: number;
    deliveryInstruction?: string;
  }) => void;
  initialLat?: number;
  initialLng?: number;
  storeLat?: number;
  storeLng?: number;
  maxRadiusKm?: number;
}

// Haversine Distance Formula in Kilometers
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectAddress,
  initialLat = 12.9716,
  initialLng = 77.5946,
  storeLat,
  storeLng,
  maxRadiusKm = 5,
}) => {
  const { showToast } = useToast();

  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [isDetectingGPS, setIsDetectingGPS] = useState(false);

  // Address fields
  const [houseNumber, setHouseNumber] = useState('');
  const [streetAddress, setStreetAddress] = useState('Block 3, Koramangala');
  const [landmark, setLandmark] = useState('');
  const [postalCode, setPostalCode] = useState('560034');
  const [city, setCity] = useState('Bangalore');
  const [state, setState] = useState('Karnataka');
  const [deliveryInstruction, setDeliveryInstruction] = useState('');

  // Calculate distance if store coordinates provided
  const distanceFromStore =
    storeLat && storeLng ? calculateHaversineDistance(storeLat, storeLng, lat, lng) : null;
  const isOutOfServiceArea = distanceFromStore !== null && distanceFromStore > maxRadiusKm;

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      showToast({ type: 'error', title: 'GPS Unavailable', description: 'Geolocation is not supported by your browser.' });
      return;
    }

    setIsDetectingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setIsDetectingGPS(false);
        showToast({ type: 'success', title: 'GPS Location Detected', description: 'Updated pin to current coordinates.' });
      },
      () => {
        setIsDetectingGPS(false);
        showToast({ type: 'error', title: 'Location Access Denied', description: 'Please select location on the map.' });
      }
    );
  };

  const handleConfirm = () => {
    if (isOutOfServiceArea) {
      showToast({
        type: 'error',
        title: 'Outside Service Radius',
        description: `Selected location is ${distanceFromStore}km away. Store only delivers up to ${maxRadiusKm}km.`,
      });
      return;
    }

    if (!streetAddress.trim()) {
      showToast({ type: 'error', title: 'Address Required', description: 'Please enter street name or area.' });
      return;
    }

    onSelectAddress({
      streetAddress: streetAddress.trim(),
      houseNumber: houseNumber.trim(),
      landmark: landmark.trim(),
      postalCode: postalCode.trim(),
      city: city.trim(),
      state: state.trim(),
      latitude: lat,
      longitude: lng,
      deliveryInstruction: deliveryInstruction.trim(),
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-surface border border-border rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-brand-primary" />
              <h3 className="text-base font-bold text-text-primary">Select Delivery Location</h3>
            </div>
            <button onClick={onClose} className="p-1 text-text-secondary hover:text-text-primary rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Map Simulation & Pin Drop */}
          <div className="relative h-44 bg-surface-subtle border border-border rounded-2xl overflow-hidden flex flex-col items-center justify-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-lg animate-bounce">
              <MapPin className="w-6 h-6" />
            </div>

            <p className="text-xs font-bold text-text-primary">
              Coordinates: {lat.toFixed(4)}, {lng.toFixed(4)}
            </p>

            {distanceFromStore !== null && (
              <span
                className={cn(
                  'px-2.5 py-1 rounded-full text-[10px] font-bold border',
                  isOutOfServiceArea
                    ? 'bg-error/10 text-error border-error/30'
                    : 'bg-success/10 text-success border-success/30'
                )}
              >
                {distanceFromStore} km from Store {isOutOfServiceArea ? '(Unserviceable)' : '(Serviceable)'}
              </span>
            )}

            <button
              type="button"
              onClick={handleDetectGPS}
              disabled={isDetectingGPS}
              className="absolute top-2 right-2 px-3 py-1.5 bg-surface border border-border hover:bg-border text-brand-primary text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>{isDetectingGPS ? 'Detecting...' : 'Use Current GPS'}</span>
            </button>
          </div>

          {/* Service Area Warning */}
          {isOutOfServiceArea && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-xl flex items-center space-x-2 text-xs font-semibold text-error">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Location is {distanceFromStore}km away from store. Maximum allowed delivery radius is {maxRadiusKm}km.
              </span>
            </div>
          )}

          {/* Address Fields */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">House / Flat No.</label>
                <input
                  type="text"
                  placeholder="e.g. Flat 302, B-Block"
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">Landmark (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Near Metro Station"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-primary mb-1">Street Address / Area *</label>
              <input
                type="text"
                required
                placeholder="e.g. 8th Main, Koramangala"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-text-primary mb-1">Pincode</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-text-primary mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-text-primary mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-primary mb-1">Delivery Instructions for Rider</label>
              <input
                type="text"
                placeholder="e.g. Leave at security gate / ring doorbell"
                value={deliveryInstruction}
                onChange={(e) => setDeliveryInstruction(e.target.value)}
                className="w-full px-3 py-2 bg-surface-subtle border border-border rounded-xl text-xs font-medium"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-text-secondary bg-surface-subtle hover:bg-border rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isOutOfServiceArea}
              className="px-5 py-2 text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary/90 rounded-xl shadow-xs disabled:opacity-50"
            >
              Confirm Address & Save
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
