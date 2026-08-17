"use client";

import { useEffect, memo } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { Navigation } from "lucide-react";

interface MapComponentProps {
  currentLocation: { lat: number; lng: number } | null;
}

function RecenterMap({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    if (center && typeof center.lat === 'number' && typeof center.lng === 'number') {
      map.setView([center.lat, center.lng], 16, { animate: true });
    }
  }, [center, map]);
  return null;
}

const createDriverLocationIcon = () => {
  const svgHtml = `
    <div style="transform: translate(-50%, -50%); filter: drop-shadow(0 0 12px rgba(59,130,246,0.9));">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="#3b82f6" stroke="#ffffff" stroke-width="2">
        <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
      </svg>
    </div>
  `;
  return L.divIcon({
    html: svgHtml,
    className: "custom-leaflet-driver-icon",
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

function MapComponent({ currentLocation }: MapComponentProps) {
  const center = currentLocation || { lat: 6.9271, lng: 79.8612 };

  return (
    <div className="w-full h-full relative bg-[#050505]">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={16}
        zoomControl={false}
        className="w-full h-full bg-[#050505] z-0"
        style={{ width: "100%", height: "100%", background: "#050505" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={19}
        />
        {currentLocation && <RecenterMap center={currentLocation} />}
        
        {currentLocation && (
          <Marker position={[currentLocation.lat, currentLocation.lng]} icon={createDriverLocationIcon()} />
        )}
      </MapContainer>
    </div>
  );
}

export default memo(MapComponent);
