'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface MapPoint {
  lat: number;
  lng: number;
  label: string;
}

interface MapViewProps {
  pickup: MapPoint;
  destination: MapPoint;
  travelerRoute?: { sourceLat: number; sourceLng: number; destLat: number; destLng: number };
  matchId?: string; // Passed if we are tracking a specific match
  isLiveTracking?: boolean; // If true, listen to socket for carrier location
}

export default function MapView({ pickup, destination, travelerRoute, matchId, isLiveTracking }: MapViewProps) {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const carrierMarkerRef = useRef<any>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Initialize socket connection if live tracking is enabled
  useEffect(() => {
    if (!isLiveTracking || !matchId) return;

    const token = localStorage.getItem('cc_token');
    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    
    const newSocket = io(socketUrl, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      newSocket.emit('joinRoom', matchId);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [matchId, isLiveTracking]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const initMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (!mapRef.current) {
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
      }
    };

    initMap();

    // Clean up only when the component unmounts entirely (not on every re-render)
    return () => {
      // Intentionally not destroying the map here to prevent flicker if props change slightly.
      // We'll let React handle DOM removal.
    };
  }, [pickup, destination, travelerRoute]); // Removing map on cleanup causes issues with fast re-renders in dev mode

  // Handle live tracking updates
  useEffect(() => {
    if (!socket || !mapRef.current || !isLiveTracking) return;

    const L = require('leaflet'); // Safe here since map is initialized
    const carrierIcon = L.divIcon({
      html: '<div style="width:24px;height:24px;background:#8b5cf6;border-radius:50%;border:3px solid white;box-shadow:0 0 15px rgba(139,92,246,0.8);display:flex;align-items:center;justify-content:center;font-size:12px;">🚚</div>',
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    socket.on('locationUpdate', (data: { lat: number; lng: number; carrierId: string }) => {
      const { lat, lng } = data;
      
      if (!carrierMarkerRef.current) {
        // Create carrier marker
        carrierMarkerRef.current = L.marker([lat, lng], { icon: carrierIcon })
          .addTo(mapRef.current)
          .bindPopup('<b>🚚 Live Carrier Location</b><br>Tracking actively');
        
        // Pan to carrier location
        mapRef.current.panTo([lat, lng], { animate: true });
      } else {
        // Update existing marker
        carrierMarkerRef.current.setLatLng([lat, lng]);
        mapRef.current.panTo([lat, lng], { animate: true });
      }
    });

    return () => {
      socket.off('locationUpdate');
    };
  }, [socket, isLiveTracking]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-64 rounded-xl overflow-hidden shadow-lg border border-white/10"
      style={{ background: '#1a1a2e' }}
    />
  );
}
