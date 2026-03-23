
import React, { useEffect, useRef } from 'react';


interface GoogleMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: { position: { lat: number; lng: number }; title?: string; icon?: any; id?: string }[];
  directions?: google.maps.DirectionsResult | null;
  paths?: { id: string; points: { lat: number; lng: number }[]; color?: string }[];
  className?: string;
}

const GoogleMap: React.FC<GoogleMapProps> = ({ center, zoom = 14, markers = [], directions, paths = [], className = "w-full h-full" }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMap = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<{ [key: string]: google.maps.Marker }>({});
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const polylinesRef = useRef<{ [key: string]: google.maps.Polyline }>({});

  useEffect(() => {
    if (mapRef.current && !googleMap.current) {
      googleMap.current = new google.maps.Map(mapRef.current, {
        center,
        zoom,
        styles: [
          {
            "featureType": "all",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#7c93a3" }, { "lightness": "-10" }]
          },
          {
            "featureType": "administrative.country",
            "elementType": "geometry",
            "stylers": [{ "visibility": "on" }]
          },
          {
            "featureType": "landscape",
            "elementType": "geometry",
            "stylers": [{ "color": "#f5f5f5" }]
          },
          {
            "featureType": "poi",
            "elementType": "geometry",
            "stylers": [{ "color": "#eeeeee" }]
          },
          {
            "featureType": "road",
            "elementType": "geometry",
            "stylers": [{ "color": "#ffffff" }]
          },
          {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [{ "color": "#c9c9c9" }]
          }
        ],
        disableDefaultUI: true,
        zoomControl: true,
      });

      directionsRendererRef.current = new google.maps.DirectionsRenderer({
        map: googleMap.current,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: "#10b981",
          strokeWeight: 6,
          strokeOpacity: 0.8
        }
      });
    }
  }, []);

  useEffect(() => {
    if (googleMap.current) {
      googleMap.current.setCenter(center);
    }
  }, [center]);

  useEffect(() => {
    if (googleMap.current) {
      // Clear old markers that are not in the new markers list
      const markerIds = markers.map(m => m.id || `${m.position.lat}-${m.position.lng}`);
      Object.keys(markersRef.current).forEach(id => {
        if (!markerIds.includes(id)) {
          markersRef.current[id].setMap(null);
          delete markersRef.current[id];
        }
      });

      // Add or update markers
      markers.forEach(m => {
        const id = m.id || `${m.position.lat}-${m.position.lng}`;
        if (markersRef.current[id]) {
          markersRef.current[id].setPosition(m.position);
          if (m.icon) markersRef.current[id].setIcon(m.icon);
        } else {
          markersRef.current[id] = new google.maps.Marker({
            position: m.position,
            map: googleMap.current,
            title: m.title,
            icon: m.icon
          });
        }
      });
    }
  }, [markers]);

  useEffect(() => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections(directions || null);
    }
  }, [directions]);

  useEffect(() => {
    if (googleMap.current) {
      // Clear old polylines
      const pathIds = paths.map(p => p.id);
      Object.keys(polylinesRef.current).forEach(id => {
        if (!pathIds.includes(id)) {
          polylinesRef.current[id].setMap(null);
          delete polylinesRef.current[id];
        }
      });

      // Add or update polylines
      paths.forEach(p => {
        if (polylinesRef.current[p.id]) {
          polylinesRef.current[p.id].setPath(p.points);
        } else {
          polylinesRef.current[p.id] = new google.maps.Polyline({
            path: p.points,
            geodesic: true,
            strokeColor: p.color || '#10b981',
            strokeOpacity: 0.6,
            strokeWeight: 4,
            map: googleMap.current
          });
        }
      });
    }
  }, [paths]);

  return <div ref={mapRef} className={className} />;
};

export default GoogleMap;
