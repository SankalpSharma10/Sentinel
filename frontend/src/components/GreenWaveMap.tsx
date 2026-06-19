'use client';

import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Waypoint {
  junction: string;
  lat: number;
  lng: number;
}

interface GreenWaveMapProps {
  waypoints: Waypoint[];
  onClose: () => void;
}

export function GreenWaveMap({ waypoints, onClose }: GreenWaveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || waypoints.length === 0) return;

    // Calculate bounding box for the waypoints
    const bounds = new maplibregl.LngLatBounds();
    waypoints.forEach(w => bounds.extend([w.lng, w.lat]));

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      bounds: bounds,
      fitBoundsOptions: { padding: 80 },
      interactive: true,
    });

    const m = map.current;

    m.on('load', async () => {
      try {
        // Fetch real road geometry from OSRM
        const coordsStr = waypoints.map(w => `${w.lng},${w.lat}`).join(';');
        const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`);
        const osrmData = await osrmRes.json();
        
        let routeGeoJSON;
        if (osrmData.code === 'Ok' && osrmData.routes.length > 0) {
          routeGeoJSON = osrmData.routes[0].geometry; // This is a GeoJSON LineString
        } else {
          // Fallback to straight lines if OSRM fails
          routeGeoJSON = {
            type: 'LineString',
            coordinates: waypoints.map(w => [w.lng, w.lat]),
          };
        }

        m.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: routeGeoJSON,
          },
        });

      // Outer glow
      m.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#22c55e',
          'line-width': 12,
          'line-opacity': 0.2,
          'line-blur': 10,
        },
      });

      // Inner line
      m.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#22c55e',
          'line-width': 4,
        },
      });

      // Add markers for waypoints
      waypoints.forEach((w, i) => {
        const el = document.createElement('div');
        el.className = 'w-3 h-3 bg-[#111] rounded-full border-2 border-[#22c55e] shadow-[0_0_10px_#22c55e]';
        
        // Use custom popup to style it nicely
        const popup = new maplibregl.Popup({ offset: 15, closeButton: false, className: 'greenwave-popup' })
          .setHTML(`<div style="background: rgba(0,0,0,0.8); color: #22c55e; padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(34,197,94,0.3); font-family: monospace; font-size: 11px;">${w.junction}</div>`);

        new maplibregl.Marker({ element: el })
          .setLngLat([w.lng, w.lat])
          .setPopup(popup)
          .addTo(m);
      });
      } catch (err) {
        console.error("Failed to route with OSRM", err);
      }
    });

    return () => {
      m.remove();
    };
  }, [waypoints]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/80 backdrop-blur-sm">
      <style dangerouslySetInnerHTML={{__html: `
        .maplibregl-popup-content { background: transparent !important; padding: 0 !important; box-shadow: none !important; }
        .maplibregl-popup-tip { display: none !important; }
      `}} />
      <div className="relative w-full h-full max-w-6xl max-h-[800px] bg-[#0A0A0B] rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(34,197,94,0.1)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-[#22c55e]/10 to-transparent">
          <div>
            <h2 className="text-lg font-black font-mono text-[#22c55e] tracking-widest uppercase flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse shadow-[0_0_8px_#22c55e]" />
              Green Wave Diversion Activated
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-1">Dedicated Mapbox GL instance for high-fidelity path rendering</p>
          </div>
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold font-mono tracking-widest uppercase text-white bg-white/10 hover:bg-white/20 transition-colors cursor-pointer rounded border border-white/20">
            ✕ Close
          </button>
        </div>
        
        {/* Map Container */}
        <div ref={mapContainer} className="flex-1 w-full" />
      </div>
    </div>
  );
}
