'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center text-slate-400 font-bold tracking-widest text-[10px]">ĐANG TẢI BẢN ĐỒ...</div>,
});

interface OSMMapProps {
  pickup?: { lat: number, lng: number, name: string };
  dropoff?: { lat: number, lng: number, name: string };
  driverLocation?: { lat: number, lng: number };
  fleet?: Array<{ id: string, lat: number, lng: number, name: string }>;
}

export default function OSMMap(props: OSMMapProps) {
  return (
    <div className="w-full h-full relative">
      <MapInner {...props} />
    </div>
  );
}
