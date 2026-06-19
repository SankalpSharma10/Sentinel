'use client';

import React, { useEffect, useRef, useState } from 'react';

export function ActiveEventsMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (document.getElementById('mappls-script') || mapLoaded) return;

    const script = document.createElement('script');
    script.id = 'mappls-script';
    script.src = 'https://apis.mappls.com/advancedmaps/api/61f5d47dc37d256e409040f5926b1dad/map_sdk?layer=vector&v=3.0';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      try {
        // @ts-ignore
        const mapplsObj = window.mappls || window.Mappls;
        
        if (mapplsObj && mapplsObj.Map && mapRef.current) {
          mapInstance.current = new mapplsObj.Map(mapRef.current, {
            center: [12.9716, 77.5946],
            zoom: 11,
            theme: "dark", 
          });
          setMapLoaded(true);
        } else {
          setError("Map SDK loaded, but Map constructor is missing.");
        }
      } catch (err: any) {
        setError(err.message);
      }
    };

    script.onerror = () => setError("Failed to load the MapmyIndia SDK script.");
    document.head.appendChild(script);
  }, [mapLoaded]);

  const layersRef = useRef<any[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  // Listen for global simulation state changes
  useEffect(() => {
    const handleSimChange = (e: any) => {
      const nowActive: boolean = e.detail?.active ?? false;
      setIsSimulating(nowActive);
      // Immediately fetch a fresh frame on toggle
      if (nowActive) fetchMapData(true);
      else fetchMapData(false);
    };
    window.addEventListener('simulationChange', handleSimChange);
    return () => window.removeEventListener('simulationChange', handleSimChange);
  }, []);

  // Data Fetching & Plotting
  const fetchMapData = (live: boolean = false) => {
    if (!mapInstance.current) return;
    const mapplsObj = window.mappls || window.Mappls;

    fetch(`/api/v1/events/active?live=${live}&t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        const { live_events, cascade_zones, dispatch_assignments } = data;

        // Clear existing layers (Garbage Collection)
        layersRef.current.forEach(layer => {
          if (layer && typeof layer.remove === 'function') {
            layer.remove(); // Leaflet / Mapbox native
          } else if (layer && typeof layer.setMap === 'function') {
            layer.setMap(null); // Google Maps / Mappls v3 wrapper style
          } else if (mapInstance.current && typeof mapInstance.current.removeLayer === 'function') {
            mapInstance.current.removeLayer(layer); // Old Mappls style
          }
        });
        layersRef.current = [];

        // 1. Plot Live Incidents
        live_events?.forEach((event: any) => {
          const m = new mapplsObj.Marker({
            map: mapInstance.current,
            position: { lat: event.lat, lng: event.lon },
            html: `<div style="width:12px;height:12px;background:${event.prediction.high_impact ? '#ff2a2a' : '#ffb320'};border-radius:50%;box-shadow:0 0 10px ${event.prediction.high_impact ? '#ff2a2a' : '#ffb320'}"></div>`,
          });
          layersRef.current.push(m);
        });

        // 2. Plot Cascade Zones (Blast Radiuses)
        cascade_zones?.forEach((zone: any) => {
          const c = new mapplsObj.Circle({
            map: mapInstance.current,
            center: { lat: zone.lat, lng: zone.lon },
            radius: 600 + Math.random() * 400, // 600m to 1km radius
            fillColor: "#ff2a2a", // Match crimson theme
            fillOpacity: 0.08, // Very subtle, avoids obscuring the map
            strokeColor: "#ff2a2a",
            strokeOpacity: 0.4,
            strokeWeight: 1,
          });
          layersRef.current.push(c);
        });

        // 3. Plot Dispatch Assignments (Lines)
        dispatch_assignments?.forEach((dispatch: any) => {
          const m = new mapplsObj.Marker({
            map: mapInstance.current,
            position: { lat: dispatch.truck_lat, lng: dispatch.truck_lon },
            html: `<div style="width:14px;height:14px;background:#00f0ff;border-radius:2px;box-shadow:0 0 10px #00f0ff"></div>`,
          });
          layersRef.current.push(m);

          const p = new mapplsObj.Polyline({
            map: mapInstance.current,
            path: [
              { lat: dispatch.truck_lat, lng: dispatch.truck_lon },
              { lat: dispatch.incident_lat, lng: dispatch.incident_lon }
            ],
            strokeColor: "#00f0ff",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            strokeDasharray: "5, 5"
          });
          layersRef.current.push(p);
        });

      })
      .catch(err => console.error("Error fetching map layers:", err));
  };

  // Initial Load
  useEffect(() => {
    if (mapLoaded) fetchMapData(false);
  }, [mapLoaded]);

  // Simulation Loop
  useEffect(() => {
    if (!isSimulating || !mapLoaded) return;
    const interval = setInterval(() => {
      fetchMapData(true);
    }, 4000); // 4 seconds polling

    return () => clearInterval(interval);
  }, [isSimulating, mapLoaded]);

  // Green Wave Path Listener
  useEffect(() => {
    let greenMarkers: any[] = [];

    const handleGreenWave = (e: any) => {
      // @ts-ignore
      const mapplsObj = window.mappls || window.Mappls;
      const { waypoints } = e.detail;
      if (!mapInstance.current || !waypoints?.length || !mapplsObj) return;

      // Clear previous green wave
      greenMarkers.forEach(obj => {
        if (obj && typeof obj.setMap === 'function') obj.setMap(null);
        else if (obj && typeof obj.remove === 'function') obj.remove();
      });
      greenMarkers = [];

      // Draw animated green polyline along the path
      const path = waypoints.map((w: any) => ({ lat: w.lat, lng: w.lng }));
      const line = new mapplsObj.Polyline({
        map: mapInstance.current,
        path,
        strokeColor: '#22c55e',
        strokeOpacity: 0.95,
        strokeWeight: 4,
        strokeDasharray: '8, 4',
        zIndex: 999,
      });
      greenMarkers.push(line);

      // Drop a glowing green marker on each waypoint junction
      waypoints.forEach((w: any, i: number) => {
        const isEnd = i === waypoints.length - 1;
        const m = new mapplsObj.Marker({
          map: mapInstance.current,
          position: { lat: w.lat, lng: w.lng },
          html: `<div style="
            width:${isEnd ? 18 : 10}px;
            height:${isEnd ? 18 : 10}px;
            background:${isEnd ? '#22c55e' : 'rgba(34,197,94,0.5)'};
            border-radius:50%;
            border:2px solid #22c55e;
            box-shadow:0 0 ${isEnd ? 20 : 10}px #22c55e;
          "></div>`,
          zIndex: 1000,
        });
        greenMarkers.push(m);
      });
    };

    window.addEventListener('greenWavePath', handleGreenWave);
    return () => {
      window.removeEventListener('greenWavePath', handleGreenWave);
      greenMarkers.forEach(obj => {
        if (obj && typeof obj.setMap === 'function') obj.setMap(null);
        else if (obj && typeof obj.remove === 'function') obj.remove();
      });
    };
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {/* Map Container */}
      <div 
        ref={mapRef} 
        id="map-container"
        className="w-full h-full absolute inset-0 bg-transparent"
        style={{ width: '100%', height: '100%' }}
      ></div>

      {/* Loading Overlay */}
      {!mapLoaded && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md z-10">
          <div className="w-12 h-12 rounded-full border-t-2 border-sentinel-cyan animate-spin mb-4"></div>
          <div className="text-sentinel-cyan text-sm tracking-widest uppercase animate-pulse">Initializing Sentinel Satellite Feed...</div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 text-center px-6">
          <div className="text-sentinel-crimson text-xl font-bold tracking-widest uppercase mb-2">Map Load Error</div>
          <div className="text-gray-400 text-sm">{error}</div>
        </div>
      )}

      {/* Overlay UI */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
        <div className="glass-panel px-3 py-1 text-xs text-sentinel-cyan border-sentinel-cyan/30 rounded bg-black/50 backdrop-blur">
          <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded bg-[#00f0ff] glow-cyan"></div> AUTO-DISPATCH ACTIVE</div>
          <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded bg-[#ff2a2a] glow-crimson"></div> HIGH IMPACT EVENT</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full border border-[#ff0055]"></div> 30-MIN CASCADE RISK</div>
        </div>
      </div>
    </div>
  );
}
