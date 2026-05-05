'use client';

import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

interface MapInnerProps {
  pickup?: { lat: number, lng: number, name: string };
  dropoff?: { lat: number, lng: number, name: string };
  driverLocation?: { lat: number, lng: number };
  zoom?: number;
}

// Helper to auto-fit bounds and fix visibility issues
function MapEffects({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  const isManualRef = React.useRef(false);
  
  useEffect(() => {
    const handleManual = () => { isManualRef.current = true; };
    map.on('dragstart zoomstart', handleManual);
    return () => { map.off('dragstart zoomstart', handleManual); };
  }, [map]);

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    
    if (bounds && !isManualRef.current) {
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
    
    return () => clearTimeout(timer);
  }, [bounds, map]);
  
  return null;
}

export default function MapInner({ pickup, dropoff, driverLocation }: MapInnerProps) {
  const MapIcons = useMemo(() => ({
    pickup: L.divIcon({
      className: 'custom-map-icon',
      html: `<div style="background-color: #22c55e; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    }),
    dropoff: L.divIcon({
      className: 'custom-map-icon',
      html: `<div style="background-color: #ef4444; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    }),
    driver: L.divIcon({
      className: 'custom-map-icon',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-10 h-10 bg-yellow-400 rounded-full animate-ping opacity-20"></div>
          <div style="background-color: #FACC15; width: 32px; height: 32px; border-radius: 12px; border: 3px solid white; box-shadow: 0 4px 15px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; position: relative; z-index: 10;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e293b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/>
              <path d="M9 17h6"/>
              <circle cx="17" cy="17" r="2"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    }),
  }), []);

  const center: L.LatLngExpression = useMemo(() => {
    if (driverLocation) return [driverLocation.lat, driverLocation.lng];
    if (pickup) return [pickup.lat, pickup.lng];
    return [10.7769, 106.7009];
  }, [pickup, driverLocation]);

  const bounds = useMemo(() => {
    const points: L.LatLngExpression[] = [];
    if (pickup) points.push([pickup.lat, pickup.lng]);
    if (dropoff) points.push([dropoff.lat, dropoff.lng]);
    if (driverLocation) points.push([driverLocation.lat, driverLocation.lng]);
    
    if (points.length < 2) return null;
    return L.latLngBounds(points);
  }, [pickup, dropoff, driverLocation]);

  return (
    <MapContainer 
      center={center} 
      zoom={15} 
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
      attributionControl={false}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {pickup && (
        <Marker position={[pickup.lat, pickup.lng]} icon={MapIcons.pickup as any}>
          <Popup className="custom-popup">{pickup.name}</Popup>
        </Marker>
      )}

      {dropoff && (
        <Marker position={[dropoff.lat, dropoff.lng]} icon={MapIcons.dropoff as any}>
          <Popup className="custom-popup">{dropoff.name}</Popup>
        </Marker>
      )}

      {driverLocation && (
        <Marker position={[driverLocation.lat, driverLocation.lng]} icon={MapIcons.driver as any}>
          <Popup className="custom-popup">Bạn đang ở đây</Popup>
        </Marker>
      )}

      <MapEffects bounds={bounds} />
    </MapContainer>
  );
}
