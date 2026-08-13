import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Store as StoreIcon,
  MapPin,
  Clock,
  Truck,
  CreditCard,
  Save,
  PauseCircle,
  Sun,
  Navigation,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '../../../core/network/api-client';
import { queryKeys } from '../../../core/network/queryKeys';
import { useToast } from '../../../hooks/useToast';
import { cn } from '../../../utils/cn';

const BUSINESS_TYPES = [
  'Kirana & Grocery Store',
  'Fruits & Vegetables',
  'Dairy, Bakery & Eggs',
  'Meat, Fish & Poultry',
  'Organic & Gourmet',
  'Beverages & Snacks',
  'General Merchandise',
];

export const StoreProfileEditor: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'GENERAL' | 'LOCATION' | 'HOURS' | 'DELIVERY' | 'PAYMENTS'>('GENERAL');
  const [isMapReady, setIsMapReady] = useState(false);

  // Leaflet Map Refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  // Queries
  const { data: profileMe, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/me');
      return res.data.data;
    },
  });

  const store = profileMe?.profile?.store;
  const merchant = profileMe?.profile;

  // Form states — Section 1: General Info
  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0]);
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  // Form states — Section 2: Location & Map
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number>(12.9716);
  const [longitude, setLongitude] = useState<number>(77.5946);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isGPSDetecting, setIsGPSDetecting] = useState(false);

  // Form states — Section 3: Hours & Operating Status
  const [isOpen, setIsOpen] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);
  const [is24x7, setIs24x7] = useState(false);
  const [openingTime, setOpeningTime] = useState('08:00');
  const [closingTime, setClosingTime] = useState('22:00');

  // Form states — Section 4: Delivery Radius & Pricing
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState<number>(5.0);
  const [minimumOrderValue, setMinimumOrderValue] = useState<number | ''>(100);
  const [deliveryFee, setDeliveryFee] = useState<number | ''>(0);

  // Form states — Section 5: Payouts & Credentials
  const [upiId, setUpiId] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankName, setBankName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [fssaiNumber, setFssaiNumber] = useState('');

  // Load Leaflet CDN script & CSS dynamically
  useEffect(() => {
    if ((window as any).L) {
      setIsMapReady(true);
      return;
    }

    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(cssLink);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setIsMapReady(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (store) {
      setStoreName(store.name || '');
      setDescription(store.description || '');
      setBusinessType(store.businessType || BUSINESS_TYPES[0]);
      setContactPhone(store.contactPhone || profileMe?.phone || '');
      setContactEmail(store.contactEmail || profileMe?.email || '');
      setLogoUrl(store.logoUrl || '🥬');
      setBannerUrl(store.bannerUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e');
      setAddress(store.address || '');
      setLatitude(store.latitude ?? 12.9716);
      setLongitude(store.longitude ?? 77.5946);
      setDeliveryRadiusKm(store.deliveryRadiusKm ?? 5.0);
      setMinimumOrderValue(store.minimumOrderValue ?? 100);
      setDeliveryFee(store.deliveryFee ?? 0);
      setOpeningTime(store.openingTime || '08:00');
      setClosingTime(store.closingTime || '22:00');
      setIsOpen(store.isOpen ?? true);
      setIsPaused(store.isPaused ?? false);
      setIsHoliday(store.isHoliday ?? false);
      setUpiId(store.upiId || '');
    }
    if (merchant) {
      setOwnerName(merchant.fullName || '');
      setGstNumber(merchant.gstNumber || '');
      setPanNumber(merchant.panNumber || '');
      setFssaiNumber(merchant.fssaiNumber || '');
      setBankAccount(merchant.bankAccount || '');
      setBankName(merchant.bankName || '');
    }
  }, [store, merchant, profileMe]);

  // Onboarding Setup Checklist Math
  const tasks = [
    { name: 'Store Name', done: !!storeName },
    { name: 'Physical Address', done: !!address },
    { name: 'GPS Coordinates', done: !!latitude && !!longitude },
    { name: 'Delivery Radius', done: deliveryRadiusKm > 0 },
    { name: 'Store Timings', done: !!openingTime && !!closingTime },
    { name: 'UPI ID / Bank Payout', done: !!upiId || !!bankAccount },
    { name: 'GST / License', done: !!gstNumber || !!fssaiNumber },
  ];
  const completedCount = tasks.filter((t) => t.done).length;
  const completionPercentage = Math.round((completedCount / tasks.length) * 100);

  // Auto-Fill Reverse Geocoding helper
  const autoReverseGeocode = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const res = await apiClient.post('/location/reverse-geocode', { latitude: lat, longitude: lng });
      if (res.data?.data?.formattedAddress) {
        setAddress(res.data.data.formattedAddress);
        return;
      }
      const nomRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await nomRes.json();
      if (data && data.display_name) {
        setAddress(data.display_name);
        return;
      }
      setAddress(`Store Pin Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    } catch {
      setAddress(`Store Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Initialize Interactive Leaflet Map when LOCATION or DELIVERY tab is active
  useEffect(() => {
    if (activeTab !== 'LOCATION' && activeTab !== 'DELIVERY') return;
    if (!isMapReady) return;
    if (!mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 14,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Custom Pure SVG Draggable Store Pin Icon
      const pinIcon = L.divIcon({
        className: 'custom-store-pin-wrapper',
        html: `
          <div style="background-color: #10b981; width: 38px; height: 38px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.35); cursor: grab;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
      });

      // Draggable Store Marker Pin
      const marker = L.marker([latitude, longitude], {
        icon: pinIcon,
        draggable: true,
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        const newLat = Number(pos.lat.toFixed(6));
        const newLng = Number(pos.lng.toFixed(6));
        setLatitude(newLat);
        setLongitude(newLng);
        autoReverseGeocode(newLat, newLng);
      });

      // Map Click Location Picker
      map.on('click', (e: any) => {
        const newLat = Number(e.latlng.lat.toFixed(6));
        const newLng = Number(e.latlng.lng.toFixed(6));
        setLatitude(newLat);
        setLongitude(newLng);
        marker.setLatLng([newLat, newLng]);
        autoReverseGeocode(newLat, newLng);
      });

      // Delivery Coverage Radius Circle
      const circle = L.circle([latitude, longitude], {
        radius: deliveryRadiusKm * 1000,
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map);

      mapInstanceRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;
    } else {
      mapInstanceRef.current.setView([latitude, longitude], mapInstanceRef.current.getZoom());
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      }
      if (circleRef.current) {
        circleRef.current.setLatLng([latitude, longitude]);
        circleRef.current.setRadius(deliveryRadiusKm * 1000);
      }
    }

    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 150);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
  }, [activeTab, isMapReady]);

  // Update Leaflet marker & circle when lat/lng/radius states change
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([latitude, longitude], mapInstanceRef.current.getZoom());
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      }
      if (circleRef.current) {
        circleRef.current.setLatLng([latitude, longitude]);
        circleRef.current.setRadius(deliveryRadiusKm * 1000);
      }
    }
  }, [latitude, longitude, deliveryRadiusKm]);

  // Use Browser GPS Location
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      showToast({ type: 'error', title: 'GPS Unavailable', description: 'Browser does not support geolocation.' });
      return;
    }

    setIsGPSDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = Number(pos.coords.latitude.toFixed(6));
        const newLng = Number(pos.coords.longitude.toFixed(6));
        setLatitude(newLat);
        setLongitude(newLng);
        setIsGPSDetecting(false);
        autoReverseGeocode(newLat, newLng);
        showToast({ type: 'success', title: 'GPS Location Detected', description: 'Store coordinates set from device GPS.' });
      },
      () => {
        setIsGPSDetecting(false);
        showToast({ type: 'error', title: 'Location Access Denied', description: 'Please drop pin on map or enter coordinates.' });
      }
    );
  };

  const updateStoreMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.put('/merchant/profile', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantDashboard() });
      queryClient.invalidateQueries({ queryKey: ['homeFeed'] });
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      showToast({
        type: 'success',
        title: 'Store Profile Saved! 🏬',
        description: 'Store details, interactive location, radius coverage, and operating hours updated.',
      });
    },
    onError: (err: any) => {
      showToast({
        type: 'error',
        title: 'Save Failed',
        description: err.message || 'Unable to persist store changes.',
      });
    },
  });

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!storeName.trim()) {
      showToast({ type: 'error', title: 'Missing Store Name', description: 'Store name is required.' });
      return;
    }
    if (!address.trim()) {
      showToast({ type: 'error', title: 'Missing Address', description: 'Physical store address is required.' });
      return;
    }

    updateStoreMutation.mutate({
      name: storeName.trim(),
      description: description.trim(),
      businessType,
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim(),
      ownerName: ownerName.trim(),
      logoUrl,
      bannerUrl,
      address: address.trim(),
      latitude: Number(latitude),
      longitude: Number(longitude),
      deliveryRadiusKm: Number(deliveryRadiusKm),
      minimumOrderValue: Number(minimumOrderValue || 0),
      deliveryFee: Number(deliveryFee || 0),
      openingTime: is24x7 ? '00:00' : openingTime,
      closingTime: is24x7 ? '23:59' : closingTime,
      isOpen,
      isPaused,
      isHoliday,
      gstNumber: gstNumber.trim(),
      panNumber: panNumber.trim(),
      fssaiNumber: fssaiNumber.trim(),
      bankAccount: bankAccount.trim(),
      bankName: bankName.trim(),
      upiId: upiId.trim(),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 animate-pulse">
        <div className="h-8 bg-border/40 rounded-xl w-48" />
        <div className="h-64 bg-border/30 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-5xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-border shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center space-x-2">
            <StoreIcon className="w-5 h-5 text-brand-primary" />
            <span>Store Console & Profile Management</span>
          </h1>
          <p className="text-xs text-text-secondary">
            Manage your store information, map coordinates, delivery coverage radius, and payout accounts
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={updateStoreMutation.isPending}
            className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{updateStoreMutation.isPending ? 'Saving...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </div>

      {/* Onboarding Completion Progress */}
      <div className="p-4 bg-gradient-to-r from-brand-primary/10 to-accent-teal/10 border border-brand-primary/20 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-primary flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-brand-primary" />
            <span>Store Onboarding Setup Checklist</span>
          </span>
          <span className="text-xs font-extrabold text-brand-primary bg-surface px-3 py-1 rounded-xl border border-brand-primary/30 shadow-xs">
            {completionPercentage}% Configured
          </span>
        </div>

        <div className="w-full bg-surface/80 rounded-full h-2 overflow-hidden border border-border">
          <div
            className="bg-brand-primary h-full transition-all duration-500 rounded-full"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto border-b border-border bg-surface rounded-2xl p-1.5 gap-1 shadow-xs">
        {[
          { id: 'GENERAL', label: '1. General Info', icon: StoreIcon },
          { id: 'LOCATION', label: '2. Location & Map', icon: MapPin },
          { id: 'HOURS', label: '3. Business Hours', icon: Clock },
          { id: 'DELIVERY', label: '4. Delivery Radius', icon: Truck },
          { id: 'PAYMENTS', label: '5. Payouts & Tax', icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-2',
                activeTab === tab.id
                  ? 'bg-brand-primary text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* TAB 1: GENERAL STORE DETAILS */}
        {activeTab === 'GENERAL' && (
          <div className="p-5 bg-surface border border-border rounded-2xl space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Store Branding & Contact Info
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Store Display Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Green Kirana Superstore"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs text-text-primary font-medium focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">Business Category / Type</label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-semibold text-text-primary focus:outline-none"
                >
                  {BUSINESS_TYPES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-primary mb-1">Store Description & Catchline</label>
              <textarea
                rows={2}
                placeholder="e.g. Fresh organic vegetables, daily milk, pulses & instant 15-min delivery."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 bg-surface-subtle border border-border rounded-xl text-xs text-text-primary font-medium focus:outline-none focus:border-brand-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="+919999999999"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">Contact Email</label>
                <input
                  type="email"
                  placeholder="store@aethermart.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">Store Owner Name</label>
                <input
                  type="text"
                  placeholder="Owner Full Name"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-medium"
                />
              </div>
            </div>

            {/* Logo & Banner URLs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">Store Logo URL / Emoji</label>
                <div className="flex items-center space-x-2">
                  <span className="w-10 h-10 rounded-xl bg-surface-subtle border border-border flex items-center justify-center text-xl shrink-0">
                    {logoUrl.length <= 4 ? logoUrl || '🥬' : '🖼️'}
                  </span>
                  <input
                    type="text"
                    placeholder="🥬 or https://..."
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">Store Banner Image URL</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-medium"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INTERACTIVE LOCATION & LEAFLET MAP */}
        {activeTab === 'LOCATION' && (
          <div className="p-5 bg-surface border border-border rounded-2xl space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Interactive Store Location Map & Pin Picker
                </h3>
                <p className="text-xs text-text-secondary">
                  Drag the marker pin or click anywhere on the map to set your store exact GPS location
                </p>
              </div>

              <button
                type="button"
                onClick={handleDetectGPS}
                disabled={isGPSDetecting}
                className="px-3.5 py-2 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-xs font-bold rounded-xl border border-brand-primary/30 transition-all flex items-center space-x-1.5 self-start sm:self-auto"
              >
                <Navigation className="w-4 h-4" />
                <span>{isGPSDetecting ? 'Detecting GPS...' : 'Use Current GPS'}</span>
              </button>
            </div>

            {/* REAL INTERACTIVE LEAFLET MAP CANVAS */}
            <div className="relative rounded-2xl border border-border overflow-hidden shadow-xs">
              <div ref={mapContainerRef} className="w-full h-80 z-0 bg-surface-subtle" />

              <div className="absolute bottom-3 left-3 z-10 bg-surface/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-border text-[11px] font-bold text-text-primary shadow-md flex items-center space-x-2">
                <MapPin className="w-3.5 h-3.5 text-brand-primary" />
                <span>
                  {latitude.toFixed(4)}, {longitude.toFixed(4)}
                </span>
                <span className="text-brand-primary border-l border-border pl-2">
                  {deliveryRadiusKm} km Radius Zone
                </span>
              </div>
            </div>

            {/* Coordinate Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={latitude}
                  onChange={(e) => setLatitude(Number(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-mono font-bold text-text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={longitude}
                  onChange={(e) => setLongitude(Number(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-mono font-bold text-text-primary"
                />
              </div>
            </div>

            {/* Physical Address Text Area */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-text-primary">
                  Physical Store Address <span className="text-error">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => autoReverseGeocode(latitude, longitude)}
                  disabled={isGeocoding}
                  className="text-[11px] font-bold text-brand-primary hover:underline flex items-center space-x-1"
                >
                  <RefreshCw className={cn('w-3 h-3', isGeocoding && 'animate-spin')} />
                  <span>Auto-Fill from Pin</span>
                </button>
              </div>
              <textarea
                rows={3}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-medium text-text-primary focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>
        )}

        {/* TAB 3: OPERATING HOURS & AVAILABILITY */}
        {activeTab === 'HOURS' && (
          <div className="p-5 bg-surface border border-border rounded-2xl space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Store Status & Business Operating Hours
            </h3>

            {/* Live Toggles Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                  'p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between',
                  isOpen
                    ? 'bg-success/10 border-success/30 text-success'
                    : 'bg-surface-subtle border-border text-text-secondary'
                )}
              >
                <div className="flex items-center space-x-2">
                  <StoreIcon className="w-4 h-4" />
                  <span className="text-xs font-bold">{isOpen ? 'Store Open' : 'Store Closed'}</span>
                </div>
                <input type="checkbox" checked={isOpen} onChange={() => {}} className="accent-success cursor-pointer" />
              </div>

              <div
                onClick={() => setIsPaused(!isPaused)}
                className={cn(
                  'p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between',
                  isPaused
                    ? 'bg-warning/10 border-warning/30 text-warning'
                    : 'bg-surface-subtle border-border text-text-secondary'
                )}
              >
                <div className="flex items-center space-x-2">
                  <PauseCircle className="w-4 h-4" />
                  <span className="text-xs font-bold">{isPaused ? 'Orders Paused' : 'Receiving Orders'}</span>
                </div>
                <input type="checkbox" checked={isPaused} onChange={() => {}} className="accent-warning cursor-pointer" />
              </div>

              <div
                onClick={() => setIsHoliday(!isHoliday)}
                className={cn(
                  'p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between',
                  isHoliday
                    ? 'bg-error/10 border-error/30 text-error'
                    : 'bg-surface-subtle border-border text-text-secondary'
                )}
              >
                <div className="flex items-center space-x-2">
                  <Sun className="w-4 h-4" />
                  <span className="text-xs font-bold">{isHoliday ? 'Holiday Mode' : 'Regular Workday'}</span>
                </div>
                <input type="checkbox" checked={isHoliday} onChange={() => {}} className="accent-error cursor-pointer" />
              </div>
            </div>

            {/* 24/7 Switch */}
            <div className="p-3.5 bg-surface-subtle border border-border rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-text-primary">24/7 Continuous Store Operating</span>
                <p className="text-[10px] text-text-secondary">Keep store open around the clock for late night orders</p>
              </div>
              <input
                type="checkbox"
                checked={is24x7}
                onChange={(e) => setIs24x7(e.target.checked)}
                className="accent-brand-primary w-4 h-4 cursor-pointer"
              />
            </div>

            {!is24x7 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">Opening Time</label>
                  <input
                    type="time"
                    value={openingTime}
                    onChange={(e) => setOpeningTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-semibold text-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">Closing Time</label>
                  <input
                    type="time"
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-semibold text-text-primary"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DELIVERY RADIUS & LEAFLET MAP VISUALIZER */}
        {activeTab === 'DELIVERY' && (
          <div className="p-5 bg-surface border border-border rounded-2xl space-y-5 shadow-xs">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Hyperlocal Delivery Radius & Charges
            </h3>

            {/* Slider Control */}
            <div className="space-y-3 p-4 bg-surface-subtle rounded-2xl border border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-primary flex items-center space-x-1.5">
                  <Truck className="w-4 h-4 text-brand-primary" />
                  <span>Max Delivery Radius</span>
                </span>
                <span className="text-sm font-extrabold text-brand-primary bg-surface px-3 py-1 rounded-xl border border-brand-primary/30">
                  {deliveryRadiusKm} km Coverage Zone
                </span>
              </div>

              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={deliveryRadiusKm}
                onChange={(e) => setDeliveryRadiusKm(Number(e.target.value))}
                className="w-full accent-brand-primary cursor-pointer"
              />

              <div className="flex items-center justify-between text-[10px] text-text-secondary font-semibold">
                <span>1 km (Local Block)</span>
                <span>5 km (Standard Neighborhood)</span>
                <span>10 km (Suburban)</span>
                <span>20 km (Citywide)</span>
              </div>
            </div>

            {/* LEAFLET MAP VISUALIZER FOR RADIUS */}
            <div className="relative rounded-2xl border border-border overflow-hidden shadow-xs">
              <div ref={mapContainerRef} className="w-full h-64 z-0 bg-surface-subtle" />
              <div className="absolute top-3 right-3 z-10 bg-surface/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border text-[11px] font-bold text-brand-primary shadow-md">
                Active Radius: {deliveryRadiusKm} km Circle Overlay
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">Minimum Order Value (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={minimumOrderValue}
                  onChange={(e) => setMinimumOrderValue(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-bold text-text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">Delivery Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-bold text-text-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PAYOUTS & TAX CREDENTIALS */}
        {activeTab === 'PAYMENTS' && (
          <div className="p-5 bg-surface border border-border rounded-2xl space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Direct Payouts & Government Licenses
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">UPI ID for Payouts</label>
                <input
                  type="text"
                  placeholder="storename@okicici"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-semibold text-brand-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">Bank Name</label>
                <input
                  type="text"
                  placeholder="HDFC Bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">Bank Account Number</label>
                <input
                  type="text"
                  placeholder="5010000000000"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">GST Number</label>
                <input
                  type="text"
                  placeholder="29AAAAA0000A1Z5"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">PAN Number</label>
                <input
                  type="text"
                  placeholder="ABCDE1234F"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">FSSAI License</label>
                <input
                  type="text"
                  placeholder="10000000000000"
                  value={fssaiNumber}
                  onChange={(e) => setFssaiNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
