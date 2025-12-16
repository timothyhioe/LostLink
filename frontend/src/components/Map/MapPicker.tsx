import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN, CENTER } from "../../config/mapbox";
import "./MapPicker.css";

interface MapPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number) => void;
  isDarkMode?: boolean;
}

export function MapPicker({
  initialLat,
  initialLng,
  onLocationSelect,
  isDarkMode = false,
}: MapPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const onLocationSelectRef = useRef(onLocationSelect);
  const isInitialized = useRef(false);

  // Keep callback ref up to date
  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  // Initialize map only once
  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      console.error("Mapbox access token missing");
      return;
    }
    if (!mapContainer.current) return;
    if (isInitialized.current) return; // Prevent re-initialization

    isInitialized.current = true;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      accessToken: MAPBOX_TOKEN,
      style: isDarkMode
        ? "mapbox://styles/mapbox/dark-v11"
        : "mapbox://styles/mapbox/streets-v12",
      center: [initialLng || CENTER.lng, initialLat || CENTER.lat],
      zoom: 16,
      attributionControl: false, // Disable attribution control
    });

    // Wait for map to load before setting up marker and handlers
    map.current.on("load", () => {
      if (!map.current || !mapContainer.current) return;

      // Create draggable marker
      const markerElement = document.createElement("div");
      markerElement.className = "map-picker-marker";
      markerElement.innerHTML = `
        <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 13 16 26 16 26s16-13 16-26c0-8.837-7.163-16-16-16z" fill="#3b82f6"/>
          <circle cx="16" cy="16" r="6" fill="white"/>
        </svg>
      `;

      marker.current = new mapboxgl.Marker({
        element: markerElement,
        draggable: true,
      })
        .setLngLat([initialLng || CENTER.lng, initialLat || CENTER.lat])
        .addTo(map.current);

      // Handle marker drag
      marker.current.on("dragend", () => {
        if (marker.current) {
          const lngLat = marker.current.getLngLat();
          onLocationSelectRef.current(lngLat.lat, lngLat.lng);
        }
      });

      // Handle map click to move marker
      map.current.on("click", (e) => {
        if (marker.current) {
          const newLngLat = [e.lngLat.lng, e.lngLat.lat] as [number, number];
          marker.current.setLngLat(newLngLat);
          onLocationSelectRef.current(e.lngLat.lat, e.lngLat.lng);
        }
      });
    });

    // Cleanup
    return () => {
      if (marker.current) {
        marker.current.remove();
        marker.current = null;
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      isInitialized.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only initialize once - isDarkMode, initialLat, initialLng handled by separate effects

  // Update map style when dark mode changes (only if map is already initialized)
  useEffect(() => {
    if (map.current && map.current.loaded() && isInitialized.current) {
      const newStyle = isDarkMode
        ? "mapbox://styles/mapbox/dark-v11"
        : "mapbox://styles/mapbox/streets-v12";
      map.current.setStyle(newStyle);
    }
  }, [isDarkMode]);

  // Update marker position if initial coordinates change
  useEffect(() => {
    if (
      marker.current &&
      (initialLat !== undefined || initialLng !== undefined)
    ) {
      const newLng = initialLng ?? CENTER.lng;
      const newLat = initialLat ?? CENTER.lat;
      marker.current.setLngLat([newLng, newLat]);
    }
  }, [initialLat, initialLng]);

  return (
    <div className="map-picker-container">
      <div ref={mapContainer} className="map-picker-map" />

      <div className="map-picker-instructions">
        Click on the map or drag the marker to select a location
      </div>
    </div>
  );
}
