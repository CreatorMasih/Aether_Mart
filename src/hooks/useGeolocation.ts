import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { GeoCoordinates } from '../types';

interface GeolocationState {
  coordinates: GeoCoordinates | null;
  loading: boolean;
  error: string | null;
  permissionStatus: PermissionState | null;
}

export const useGeolocation = (options?: PositionOptions) => {
  const [state, setState] = useState<GeolocationState>({
    coordinates: null,
    loading: false,
    error: null,
    permissionStatus: null,
  });

  // Track active state to prevent updates after unmount or during overlapping requests
  const activeRequestRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  // Destructure options to stabilize dependencies
  const enableHighAccuracy = options?.enableHighAccuracy;
  const timeout = options?.timeout;
  const maximumAge = options?.maximumAge;

  const stableOptions = useMemo(() => ({
    enableHighAccuracy,
    timeout,
    maximumAge,
  }), [enableHighAccuracy, timeout, maximumAge]);

  const fetchCoordinates = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => {
        if (prev.error === 'Geolocation is not supported by this browser.' && prev.loading === false) {
          return prev;
        }
        return {
          ...prev,
          loading: false,
          error: 'Geolocation is not supported by this browser.',
        };
      });
      return;
    }

    // If permission is already denied, fail early and avoid calling getCurrentPosition
    if (state.permissionStatus === 'denied') {
      setState((prev) => {
        if (prev.error === 'Permission denied by user.' && prev.loading === false) {
          return prev;
        }
        return {
          ...prev,
          loading: false,
          error: 'Permission denied by user.',
        };
      });
      return;
    }

    // Increment request ID to ignore previous pending requests
    const requestId = ++activeRequestRef.current;

    setState((prev) => {
      if (prev.loading === true && prev.error === null) return prev;
      return { ...prev, loading: true, error: null };
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isMountedRef.current || requestId !== activeRequestRef.current) return;

        setState((prev) => {
          const hasCoordsChanged =
            !prev.coordinates ||
            prev.coordinates.latitude !== position.coords.latitude ||
            prev.coordinates.longitude !== position.coords.longitude;

          if (!hasCoordsChanged && prev.loading === false && prev.error === null) {
            return prev;
          }

          return {
            ...prev,
            loading: false,
            coordinates: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
            error: null,
          };
        });
      },
      (error) => {
        if (!isMountedRef.current || requestId !== activeRequestRef.current) return;

        let errorMsg = 'Failed to retrieve location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'Permission denied by user.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMsg = 'Request timed out.';
            break;
        }

        setState((prev) => {
          if (prev.error === errorMsg && prev.loading === false) {
            return prev;
          }
          return {
            ...prev,
            loading: false,
            error: errorMsg,
          };
        });
      },
      stableOptions
    );
  }, [stableOptions, state.permissionStatus]);

  // Keep a ref to the latest fetchCoordinates to avoid re-triggering permissions effect
  const fetchCoordinatesRef = useRef(fetchCoordinates);
  useEffect(() => {
    fetchCoordinatesRef.current = fetchCoordinates;
  }, [fetchCoordinates]);

  // Handle permissions query and listener registration
  useEffect(() => {
    isMountedRef.current = true;
    let active = true;
    let permissionStatusObj: PermissionStatus | null = null;
    let handlePermissionChange: (() => void) | null = null;

    const checkPermission = async () => {
      if (!navigator.permissions) return;
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' });
        if (!active) return;

        permissionStatusObj = status;

        setState((prev) => {
          if (prev.permissionStatus === status.state) return prev;
          return { ...prev, permissionStatus: status.state };
        });

        handlePermissionChange = () => {
          if (!active) return;
          setState((prev) => {
            if (prev.permissionStatus === status.state) return prev;
            return { ...prev, permissionStatus: status.state };
          });
        };

        status.addEventListener('change', handlePermissionChange);
      } catch (e) {
        console.warn('Navigator permissions query not supported', e);
      }
    };

    checkPermission();

    return () => {
      active = false;
      isMountedRef.current = false;
      if (permissionStatusObj && handlePermissionChange) {
        permissionStatusObj.removeEventListener('change', handlePermissionChange);
      }
    };
  }, []);

  // Trigger initial fetch on mount or if stableOptions changes
  useEffect(() => {
    fetchCoordinates();
  }, [fetchCoordinates]);

  return { ...state, refetch: fetchCoordinates };
};

