import React, { useEffect, useRef, useState } from 'react';

export interface LocationPoint {
  lat: number;
  lng: number;
  name?: string;
  address?: string;
}

interface RealTrackingMapProps {
  storeLocation: LocationPoint;
  customerLocation: LocationPoint;
  riderLocation?: LocationPoint | null;
  height?: string;
  activeStep?: 'TO_STORE' | 'TO_CUSTOMER' | 'DELIVERED';
  onRouteCalculated?: (metrics: { distanceKm: number; durationMins: number }) => void;
}

export const RealTrackingMap: React.FC<RealTrackingMapProps> = ({
  storeLocation,
  customerLocation,
  riderLocation,
  height = '360px',
  activeStep = 'TO_CUSTOMER',
  onRouteCalculated,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const storeMarkerRef = useRef<any>(null);
  const customerMarkerRef = useRef<any>(null);
  const riderMarkerRef = useRef<any>(null);
  const routePolylineRef = useRef<any>(null);

  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMins: number } | null>(null);

  // Helper to create custom div icons for Leaflet
  const createDivIcon = (type: 'STORE' | 'CUSTOMER' | 'RIDER') => {
    const L = (window as any).L;
    if (!L) return null;
    if (type === 'STORE') {
      return L.divIcon({
        className: 'custom-map-marker-store',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="background-color: #10b981; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
              <span style="font-size: 18px;">🏪</span>
            </div>
            <span style="background-color: rgba(15, 23, 42, 0.85); color: #10b981; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; margin-top: 2px; text-transform: uppercase; border: 1px solid rgba(16, 185, 129, 0.4); white-space: nowrap;">Store</span>
          </div>
        `,
        iconSize: [40, 56],
        iconAnchor: [20, 28],
      });
    }

    if (type === 'CUSTOMER') {
      return L.divIcon({
        className: 'custom-map-marker-customer',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="background-color: #8b5cf6; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
              <span style="font-size: 18px;">🏠</span>
            </div>
            <span style="background-color: rgba(15, 23, 42, 0.85); color: #a78bfa; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; margin-top: 2px; text-transform: uppercase; border: 1px solid rgba(139, 92, 246, 0.4); white-space: nowrap;">Customer</span>
          </div>
        `,
        iconSize: [40, 56],
        iconAnchor: [20, 28],
      });
    }

    // RIDER
    return L.divIcon({
      className: 'custom-map-marker-rider',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
          <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background-color: rgba(16, 185, 129, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="background-color: #059669; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.4); z-index: 10;">
            <span style="font-size: 18px;">🛵</span>
          </div>
          <span style="background-color: #059669; color: white; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; margin-top: 2px; text-transform: uppercase; border: 1px solid white; white-space: nowrap; z-index: 10;">Rider</span>
        </div>
      `,
      iconSize: [44, 60],
      iconAnchor: [22, 30],
    });
  };

  // Initialize Map
  useEffect(() => {
    const L = (window as any).L;
    if (!L) return;
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView([storeLocation.lat, storeLocation.lng], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers & Route
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = (window as any).L;
    if (!map || !L) return;

    // 1. Update / Create Store Marker
    if (!storeMarkerRef.current) {
      storeMarkerRef.current = L.marker([storeLocation.lat, storeLocation.lng], {
        icon: createDivIcon('STORE'),
      })
        .addTo(map)
        .bindPopup(`<b>${storeLocation.name || 'Store'}</b><br/>${storeLocation.address || ''}`);
    } else {
      storeMarkerRef.current.setLatLng([storeLocation.lat, storeLocation.lng]);
    }

    // 2. Update / Create Customer Marker
    if (!customerMarkerRef.current) {
      customerMarkerRef.current = L.marker([customerLocation.lat, customerLocation.lng], {
        icon: createDivIcon('CUSTOMER'),
      })
        .addTo(map)
        .bindPopup(`<b>Customer Delivery Address</b><br/>${customerLocation.address || ''}`);
    } else {
      customerMarkerRef.current.setLatLng([customerLocation.lat, customerLocation.lng]);
    }

    // 3. Update / Create Rider Marker
    if (riderLocation && riderLocation.lat && riderLocation.lng) {
      if (!riderMarkerRef.current) {
        riderMarkerRef.current = L.marker([riderLocation.lat, riderLocation.lng], {
          icon: createDivIcon('RIDER'),
        })
          .addTo(map)
          .bindPopup('<b>Live Rider Location</b>');
      } else {
        riderMarkerRef.current.setLatLng([riderLocation.lat, riderLocation.lng]);
      }
    } else if (riderMarkerRef.current) {
      map.removeLayer(riderMarkerRef.current);
      riderMarkerRef.current = null;
    }

    // 4. Auto-fit bounds
    const boundsPoints: any[] = [
      [storeLocation.lat, storeLocation.lng],
      [customerLocation.lat, customerLocation.lng],
    ];
    if (riderLocation && riderLocation.lat && riderLocation.lng) {
      boundsPoints.push([riderLocation.lat, riderLocation.lng]);
    }

    const bounds = L.latLngBounds(boundsPoints);
    map.fitBounds(bounds, { padding: [50, 50] });

    // 5. Fetch OSRM Real Road Route
    const fetchRealRoute = async () => {
      try {
        let startPt = storeLocation;
        let endPt = customerLocation;

        if (riderLocation && riderLocation.lat && riderLocation.lng) {
          if (activeStep === 'TO_STORE') {
            startPt = riderLocation;
            endPt = storeLocation;
          } else {
            startPt = riderLocation;
            endPt = customerLocation;
          }
        }

        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startPt.lng},${startPt.lat};${endPt.lng},${endPt.lat}?overview=full&geometries=geojson`;
        const res = await fetch(osrmUrl);
        const data = await res.json();

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coordsGeoJSON: [number, number][] = route.geometry.coordinates;
          const latLngList: any[] = coordsGeoJSON.map((c) => [c[1], c[0]]);

          const distanceKm = parseFloat((route.distance / 1000).toFixed(2));
          const durationMins = Math.ceil(route.duration / 60);

          // If distance exceeds local delivery threshold (>50km), suppress misleading ETA
          if (distanceKm > 50.0) {
            console.warn('[RealTrackingMap] Route distance exceeds local threshold:', distanceKm, 'km');
            setRouteInfo(null);
            return;
          }

          setRouteInfo({ distanceKm, durationMins });
          if (onRouteCalculated) {
            onRouteCalculated({ distanceKm, durationMins });
          }

          if (routePolylineRef.current) {
            map.removeLayer(routePolylineRef.current);
          }

          routePolylineRef.current = L.polyline(latLngList, {
            color: '#10b981',
            weight: 5,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);
        } else {
          // Fallback straight polyline if OSRM is unreachable
          const fallbackList: any[] = [
            [startPt.lat, startPt.lng],
            [endPt.lat, endPt.lng],
          ];
          if (routePolylineRef.current) map.removeLayer(routePolylineRef.current);
          routePolylineRef.current = L.polyline(fallbackList, {
            color: '#10b981',
            weight: 4,
            dashArray: '8, 8',
            opacity: 0.7,
          }).addTo(map);
        }
      } catch (err) {
        console.warn('OSRM routing fetch failed, falling back to direct line', err);
      }
    };

    fetchRealRoute();
  }, [
    storeLocation.lat,
    storeLocation.lng,
    customerLocation.lat,
    customerLocation.lng,
    riderLocation?.lat,
    riderLocation?.lng,
    activeStep,
  ]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-border-primary bg-bg-tertiary shadow-subtle" style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Route Info Badge */}
      {routeInfo && (
        <div className="absolute top-3 left-3 bg-bg-secondary/95 backdrop-blur border border-border-primary px-3 py-1.5 rounded-xl text-xs font-bold text-text-primary shadow-subtle z-[400] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-emerald animate-ping" />
          <span>
            {routeInfo.distanceKm} km • ~{routeInfo.durationMins} min driving
          </span>
        </div>
      )}
    </div>
  );
};

export default RealTrackingMap;
