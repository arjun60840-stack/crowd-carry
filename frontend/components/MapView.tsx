'use client';

import { useEffect, useRef } from 'react';

interface MapPoint {
  lat: number;
  lng: number;
  label: string;
}

interface MapViewProps {
  pickup: MapPoint;
  destination: MapPoint;
  travelerRoute?: { sourceLat: number; sourceLng: number; destLat: number; destLng: number };
}

export default function MapView({ pickup, destination, travelerRoute }: MapViewProps) {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (mapRef.current) return; // Already initialized

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      // Fix default marker icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      const centerLat = (pickup.lat + destination.lat) / 2;
      const centerLng = (pickup.lng + destination.lng) / 2;

      const map = L.map(mapContainerRef.current!, {
        center: [centerLat, centerLng],
        zoom: 5,
        zoomControl: true,
      });

      // Dark tile layer using OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      // Custom icons
      const greenIcon = L.divIcon({
        html: '<div style="width:14px;height:14px;background:#10b981;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(16,185,129,0.5)"></div>',
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const redIcon = L.divIcon({
        html: '<div style="width:14px;height:14px;background:#ef4444;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(239,68,68,0.5)"></div>',
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      // Markers
      L.marker([pickup.lat, pickup.lng], { icon: greenIcon })
        .addTo(map)
        .bindPopup(`<b>📦 Pickup</b><br>${pickup.label}`);

      L.marker([destination.lat, destination.lng], { icon: redIcon })
        .addTo(map)
        .bindPopup(`<b>🎯 Destination</b><br>${destination.label}`);

      // Draw package route line
      L.polyline(
        [[pickup.lat, pickup.lng], [destination.lat, destination.lng]],
        { color: '#6366f1', weight: 3, opacity: 0.7, dashArray: '8, 6' }
      ).addTo(map);

      // Traveler route if available
      if (travelerRoute) {
        const blueIcon = L.divIcon({
          html: '<div style="width:12px;height:12px;background:#06b6d4;border-radius:50%;border:2px solid white"></div>',
          className: '',
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });

        L.marker([travelerRoute.sourceLat, travelerRoute.sourceLng], { icon: blueIcon })
          .addTo(map)
          .bindPopup('<b>✈️ Traveler Start</b>');

        L.marker([travelerRoute.destLat, travelerRoute.destLng], { icon: blueIcon })
          .addTo(map)
          .bindPopup('<b>✈️ Traveler End</b>');

        L.polyline(
          [[travelerRoute.sourceLat, travelerRoute.sourceLng], [travelerRoute.destLat, travelerRoute.destLng]],
          { color: '#06b6d4', weight: 3, opacity: 0.5 }
        ).addTo(map);
      }

      // Fit bounds
      const bounds = L.latLngBounds([
        [pickup.lat, pickup.lng],
        [destination.lat, destination.lng],
      ]);
      map.fitBounds(bounds, { padding: [40, 40] });

      mapRef.current = map;
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [pickup, destination]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-64 rounded-xl overflow-hidden"
      style={{ background: '#1a1a2e' }}
    />
  );
}
