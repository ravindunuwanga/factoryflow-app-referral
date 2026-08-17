"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

interface Vehicle {
  id: string;
  last_latitude?: number;
  last_longitude?: number;
  current_lat?: number;
  current_lng?: number;
  is_mission_active?: boolean;
  profiles?: {
    full_name?: string;
    phone_number?: string;
  };
}

interface OSMTrackingMapProps {
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  mapCenter: { lat: number; lng: number };
  currentZoom: number;
  onSelectVehicle: (vehicle: Vehicle) => void;
}

function RecenterMap({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (center && typeof center.lat === 'number' && typeof center.lng === 'number') {
      map.setView([center.lat, center.lng], zoom, { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

const createTruckIcon = (isSelected: boolean, isActive: boolean) => {
  const color = isSelected ? "#3b82f6" : isActive ? "#4ade80" : "#ffffff";
  const glow = isSelected ? "drop-shadow(0 0 10px rgba(59,130,246,0.8))" : isActive ? "drop-shadow(0 0 8px rgba(74,222,128,0.8))" : "";
  
  const svgHtml = `
    <div style="transform: translate(-50%, -50%); filter: ${glow}; cursor: pointer;">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="${color}" stroke="#000000" stroke-width="1.5">
        <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z"/>
        <circle cx="6" cy="18" r="1.5" fill="#000000"/>
        <circle cx="18" cy="18" r="1.5" fill="#000000"/>
      </svg>
    </div>
  `;
  return L.divIcon({
    html: svgHtml,
    className: "custom-leaflet-truck-icon",
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
};

export default function OSMTrackingMap({
  vehicles,
  selectedVehicleId,
  mapCenter,
  currentZoom,
  onSelectVehicle
}: OSMTrackingMapProps) {
  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={currentZoom}
        zoomControl={false}
        className="w-full h-full bg-[#050505] z-0"
        style={{ width: "100%", height: "100%", background: "#050505" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={19}
        />
        <RecenterMap center={mapCenter} zoom={currentZoom} />

        {vehicles.map((vehicle) => {
          const lat = vehicle.last_latitude || vehicle.current_lat || 6.9271;
          const lng = vehicle.last_longitude || vehicle.current_lng || 79.8612;
          const isSelected = selectedVehicleId === vehicle.id;
          const isActive = !!vehicle.is_mission_active;

          return (
            <Marker
              key={vehicle.id}
              position={[lat, lng]}
              icon={createTruckIcon(isSelected, isActive)}
              eventHandlers={{
                click: () => onSelectVehicle(vehicle)
              }}
            >
              <Popup className="custom-leaflet-popup">
                <div className="p-2 text-black font-sans">
                  <div className="font-black text-sm uppercase tracking-wider">{vehicle.id}</div>
                  <div className="text-xs text-neutral-600 font-bold">{vehicle.profiles?.full_name || "Unknown Operator"}</div>
                  <div className="mt-1 text-[10px] font-black uppercase text-blue-600">
                    Status: {isActive ? "IN TRANSIT" : "STANDBY"}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
