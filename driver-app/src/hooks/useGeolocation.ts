"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useGeolocation(vehicleId: string | null) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateLocationInDb = useCallback(async (lat: number, lng: number) => {
    if (!vehicleId) return;

    try {
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ 
          current_lat: lat, 
          current_lng: lng,
          last_latitude: lat,
          last_longitude: lng,
          last_updated: new Date().toISOString() 
        })
        .eq('id', vehicleId);

      if (updateError) throw updateError;

      await supabase
        .from('gps_logs')
        .insert({
          vehicle_id: vehicleId,
          latitude: lat,
          longitude: lng
        });

    } catch (err) {
      console.error('Error updating GPS location:', err);
    }
  }, [vehicleId]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        updateLocationInDb(latitude, longitude);
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [updateLocationInDb]);

  return { location, error };
}
