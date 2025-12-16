import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN, CENTER } from "../../config/mapbox";
import "./Map.css";

interface MapProps {
  className?: string;
  style?: React.CSSProperties;
  onMapLoad?: (map: mapboxgl.Map) => void;
}

/**
 * Map comoponent (base) using mapbox gl js
 */

export function Map({ className, style, onMapLoad }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    // Validate mapbox token
    if (!MAPBOX_TOKEN) {
      console.error("Mapbox access token missing, check /frontend .env");
      return;
    }

    // Don't initialize if container ref isn't available
    if (!mapContainer.current) return;

    // Don't re-initialize if map already exists
    if (map.current) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      accessToken: MAPBOX_TOKEN,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [CENTER.lng, CENTER.lat],
      zoom: 9, // TODO: figure out
      attributionControl: false, // Disable attribution control
    });

    // Add navigation controls (zoom, rotation)
    map.current.addControl(new mapboxgl.NavigationControl(), "bottom-right");

    // Call if provided
    if (onMapLoad) {
      map.current.on("load", () => {
        onMapLoad(map.current!);
      });
    }

    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [onMapLoad]);

  return (
    <div
      ref={mapContainer}
      className={`map-container ${className || ""}`}
      style={style}
    />
  );
}
