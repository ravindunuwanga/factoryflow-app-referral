"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

interface OSMPublicMapProps {
  center: { lat: number; lng: number };
  zoom: number;
  vehicleId?: string;
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

const createTruckIcon = () => {
  const svgHtml = `
    <div style="transform: translate(-50%, -50%); filter: drop-shadow(0 0 12px rgba(37,99,235,0.9));">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="#2563eb" stroke="#ffffff" stroke-width="1.5">
        <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z"/>
        <circle cx="6" cy="18" r="1.5" fill="#000000"/>
        <circle cx="18" cy="18" r="1.5" fill="#000000"/>
      </svg>
    </div>
  `;
  return L.divIcon({
    html: svgHtml,
    className: "custom-leaflet-public-truck-icon",
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

export default function OSMPublicMap({ center, zoom, vehicleId }: OSMPublicMapProps) {
  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        zoomControl={false}
        className="w-full h-full bg-[#050505] z-0"
        style={{ width: "100%", height: "100%", background: "#050505" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={19}
        />
        <RecenterMap center={center} zoom={zoom} />
        
        <Marker position={[center.lat, center.lng]} icon={createTruckIcon()}>
          {vehicleId && (
            <Popup className="custom-leaflet-popup">
              <div className="p-2 text-black font-sans font-bold text-xs">
                Unit ID: {vehicleId}
                <div className="text-[10px] text-blue-600 font-black uppercase">Live Telemetry Active</div>
              </div>
            </Popup>
          )}
        </Marker>
      </MapContainer>
    </div>
  );
}
