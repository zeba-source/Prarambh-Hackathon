import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Report } from "@/types/report";
import { Button } from "@/components/ui/button";
import { Map, Satellite, Layers } from "lucide-react";

// Fix for default marker icon
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapViewProps {
  reports?: Report[];
  center?: { lat: number; lon: number };
  zoom?: number;
  height?: string;
  onLocationDetect?: (lat: number, lon: number) => void;
  showLayerControl?: boolean;
}

type MapType = 'roadmap' | 'satellite' | 'hybrid' | 'terrain';

const MapView = ({ reports = [], center, zoom = 13, height = "400px", onLocationDetect, showLayerControl = false }: MapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const reportMarkersRef = useRef<L.Marker[]>([]);
  const locationDetectedRef = useRef(false);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);
  const [mapType, setMapType] = useState<MapType>('roadmap');

  // Initialize map only once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const defaultCenter: [number, number] = center ? [center.lat, center.lon] : [40.7128, -74.0060];
    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(defaultCenter, zoom);

    // Use Google Maps tiles if API key is available, otherwise fallback to OpenStreetMap
    const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API;

    if (googleMapsApiKey) {
      // Google Maps Roadmap layer (default)
      const tileLayer = L.tileLayer(`https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}`, {
        attribution: '&copy; <a href="https://www.google.com/maps">Google Maps</a>',
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      }).addTo(map);
      currentTileLayerRef.current = tileLayer;
    } else {
      // Fallback to OpenStreetMap
      const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      currentTileLayerRef.current = tileLayer;
    }

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - only initialize once

  // Handle map type changes
  useEffect(() => {
    if (!mapInstanceRef.current || !currentTileLayerRef.current) return;

    const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API;
    if (!googleMapsApiKey) return;

    // Remove current tile layer
    mapInstanceRef.current.removeLayer(currentTileLayerRef.current);

    // Map type codes for Google Maps:
    // m = roadmap, s = satellite, y = hybrid, p = terrain
    const layerCodes: Record<MapType, string> = {
      roadmap: 'm',
      satellite: 's',
      hybrid: 'y',
      terrain: 'p'
    };

    const layerCode = layerCodes[mapType];
    const newTileLayer = L.tileLayer(`https://mt1.google.com/vt/lyrs=${layerCode}&x={x}&y={y}&z={z}`, {
      attribution: '&copy; <a href="https://www.google.com/maps">Google Maps</a>',
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(mapInstanceRef.current);

    currentTileLayerRef.current = newTileLayer;
  }, [mapType]);

  // Update map center when center prop changes
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setView([center.lat, center.lon], zoom);
    }
  }, [center, zoom]);

  // Update report markers when reports change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing report markers
    reportMarkersRef.current.forEach(marker => marker.remove());
    reportMarkersRef.current = [];

    // If there are reports, adjust map to show all markers
    if (reports.length > 0) {
      const bounds = L.latLngBounds(reports.map(r => [r.location.lat, r.location.lon] as L.LatLngTuple));
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }

    // Define custom marker icons based on category
    const getMarkerIcon = (category: string, status: string) => {
      let color = '#6b7280'; // default gray
      if (category === 'pothole') color = '#f97316'; // orange
      else if (category === 'garbage') color = '#10b981'; // green
      else if (category === 'streetlight') color = '#3b82f6'; // blue

      // Use different opacity for different statuses
      const opacity = status === 'resolved' ? 0.5 : 1;

      return L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background-color: ${color};
            opacity: ${opacity};
            width: 30px;
            height: 30px;
            border-radius: 50% 50% 50% 0;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="transform: rotate(45deg); color: white; font-size: 16px; font-weight: bold;">
              ${category === 'pothole' ? '🕳️' : category === 'garbage' ? '🗑️' : category === 'streetlight' ? '💡' : '⚠️'}
            </div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
      });
    };

    // Add new markers for reports
    reports.forEach((report) => {
      const icon = getMarkerIcon(report.category, report.status);
      const marker = L.marker([report.location.lat, report.location.lon], { icon }).addTo(mapInstanceRef.current!);

      const statusColor =
        report.status === "pending" ? "bg-yellow-100 text-yellow-800 border-yellow-300" :
          report.status === "in-progress" ? "bg-blue-100 text-blue-800 border-blue-300" :
            "bg-green-100 text-green-800 border-green-300";

      const categoryColor =
        report.category === "pothole" ? "bg-orange-100 text-orange-800" :
          report.category === "garbage" ? "bg-green-100 text-green-800" :
            report.category === "streetlight" ? "bg-blue-100 text-blue-800" :
              "bg-gray-100 text-gray-800";

      const popupContent = `
        <div class="p-3 min-w-[250px] max-w-[300px]">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xs px-2 py-1 rounded font-semibold ${categoryColor}">
              ${report.category.toUpperCase()}
            </span>
            <span class="text-xs px-2 py-1 rounded border font-medium ${statusColor}">
              ${report.status.toUpperCase()}
            </span>
          </div>
          
          ${report.image ? `
            <img 
              src="${report.image}" 
              alt="Issue" 
              class="w-full h-32 object-cover rounded-lg mb-2 border border-gray-200"
              onerror="this.style.display='none'"
            />
          ` : ''}
          
          <p class="text-sm text-gray-700 mb-2 line-clamp-3">${report.description || 'No description provided'}</p>
          
          <div class="space-y-1 text-xs text-gray-600 mb-2">
            <div><strong>Department:</strong> ${report.department}</div>
            <div><strong>Reported:</strong> ${new Date(report.createdAt).toLocaleDateString()}</div>
            <div><strong>Location:</strong> ${report.location.lat.toFixed(4)}, ${report.location.lon.toFixed(4)}</div>
          </div>
          
          <button 
            onclick="window.location.href='/report/${report.id}'" 
            class="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded font-medium transition-colors"
          >
            View Full Details →
          </button>
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'custom-popup'
      });

      reportMarkersRef.current.push(marker);
    });
  }, [reports]);

  // Detect user location only once when component mounts
  useEffect(() => {
    if (!mapInstanceRef.current || !onLocationDetect || locationDetectedRef.current) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          if (mapInstanceRef.current && !locationDetectedRef.current) {
            mapInstanceRef.current.setView([latitude, longitude], zoom);

            // Remove existing user marker if any
            if (userMarkerRef.current) {
              userMarkerRef.current.remove();
            }

            // Add new user marker
            userMarkerRef.current = L.marker([latitude, longitude])
              .addTo(mapInstanceRef.current)
              .bindPopup("Your Location")
              .openPopup();

            // Call the callback only once
            locationDetectedRef.current = true;
            onLocationDetect(latitude, longitude);
          }
        },
        (error) => {
          console.error("Error detecting location:", error);
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - only run on mount

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API;

  return (
    <div className="relative">
      <div ref={mapRef} style={{ height, width: "100%" }} className="rounded-lg shadow-md" />

      {/* Layer Control - Only show if Google Maps is enabled and showLayerControl is true */}
      {googleMapsApiKey && showLayerControl && (
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 bg-white dark:bg-card rounded-lg shadow-lg p-2 border border-border">
          <Button
            variant={mapType === 'roadmap' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMapType('roadmap')}
            className="w-full justify-start"
          >
            <Map className="w-4 h-4 mr-2" />
            Roadmap
          </Button>
          <Button
            variant={mapType === 'satellite' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMapType('satellite')}
            className="w-full justify-start"
          >
            <Satellite className="w-4 h-4 mr-2" />
            Satellite
          </Button>
          <Button
            variant={mapType === 'hybrid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMapType('hybrid')}
            className="w-full justify-start"
          >
            <Layers className="w-4 h-4 mr-2" />
            Hybrid
          </Button>
          <Button
            variant={mapType === 'terrain' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMapType('terrain')}
            className="w-full justify-start"
          >
            <Map className="w-4 h-4 mr-2" />
            Terrain
          </Button>
        </div>
      )}
    </div>
  );
};

export default MapView;
