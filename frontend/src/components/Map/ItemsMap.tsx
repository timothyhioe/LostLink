import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN, CENTER } from "../../config/mapbox";
import "./ItemsMap.css";

interface ItemImage {
  url: string;
  filename: string;
  uploadedAt: string;
}

interface MapItem {
  id: string;
  userId: string;
  type: "lost" | "found";
  title: string;
  description: string;
  buildingName: string | null;
  images: ItemImage[];
  tags: string[];
  status: string;
  matchCount: number;
  user?: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  coordinates?: {
    longitude: number;
    latitude: number;
  };
  // Also support direct properties for backward compatibility
  longitude?: number;
  latitude?: number;
}

interface ItemsMapProps {
  className?: string;
  style?: React.CSSProperties;
  apiBaseUrl?: string;
}

export function ItemsMap({
  className,
  style,
  apiBaseUrl = "http://localhost:5000/api",
}: ItemsMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const popups = useRef<mapboxgl.Popup[]>([]);
  const [items, setItems] = useState<MapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialized = useRef(false);
  const isUpdatingMarkers = useRef(false);

  // Fetch items from API
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${apiBaseUrl}/items`);

        if (!response.ok) {
          throw new Error("Failed to fetch items");
        }

        const data = await response.json();
        console.log("ItemsMap: Fetched items from API", data);
        // Transform items to handle nested coordinates structure
        const transformedItems: MapItem[] = (data.items || []).map(
          (item: any) => ({
            ...item,
            // Extract coordinates from nested object if present
            longitude: item.coordinates?.longitude ?? item.longitude,
            latitude: item.coordinates?.latitude ?? item.latitude,
          })
        );
        console.log("ItemsMap: Transformed items", transformedItems);
        setItems(transformedItems);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An error occurred";
        setError(message);
        console.error("Error fetching items:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [apiBaseUrl]);

  // Create custom marker element
  const createMarkerElement = (type: "lost" | "found") => {
    const markerElement = document.createElement("div");
    markerElement.className = `items-map-marker items-map-marker-${type}`;

    const color = type === "lost" ? "#ef4444" : "#3b82f6"; // Red for lost, blue for found

    markerElement.innerHTML = `
      <div class="items-map-marker-pin">
        <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 13 16 26 16 26s16-13 16-26c0-8.837-7.163-16-16-16z" fill="${color}"/>
          <circle cx="16" cy="16" r="5" fill="white"/>
        </svg>
      </div>
    `;

    return markerElement;
  };

  // Create popup content
  const createPopupContent = (item: MapItem) => {
    const imageUrl =
      item.images && item.images.length > 0
        ? `http://localhost:5000${item.images[0].url}`
        : null;
    const formattedDate = new Date(item.createdAt).toLocaleDateString("de-DE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return `
      <div class="items-map-popup">
        ${
          imageUrl
            ? `<img src="${imageUrl}" alt="${item.title}" class="items-map-popup-image" />`
            : ""
        }
        <div class="items-map-popup-content">
          <div class="items-map-popup-header">
            <span class="items-map-popup-type items-map-popup-type-${
              item.type
            }">
              ${item.type === "lost" ? "Verloren" : "Gefunden"}
            </span>
            <span class="items-map-popup-status">${item.status}</span>
          </div>
          <h3 class="items-map-popup-title">${item.title}</h3>
          <p class="items-map-popup-description">${
            item.description || "Keine Beschreibung"
          }</p>
          ${
            item.buildingName
              ? `<p class="items-map-popup-location">📍 ${item.buildingName}</p>`
              : ""
          }
          <p class="items-map-popup-date">📅 ${formattedDate}</p>
          ${
            item.user?.name
              ? `<p class="items-map-popup-user">👤 ${item.user.name}</p>`
              : ""
          }
        </div>
      </div>
    `;
  };

  // Initialize map and add markers
  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      console.error("ItemsMap: Mapbox access token missing");
      setError("Mapbox access token missing");
      return;
    }
    if (!mapContainer.current) {
      console.error("ItemsMap: Map container ref is null");
      return;
    }
    if (isInitialized.current) {
      console.log("ItemsMap: Map already initialized, skipping");
      return;
    }

    console.log("ItemsMap: Initializing map...");
    isInitialized.current = true;

    try {
      // Initialize map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        accessToken: MAPBOX_TOKEN,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [CENTER.lng, CENTER.lat],
        zoom: 16,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

      // Wait for map to load
      map.current.on("load", () => {
        console.log("ItemsMap: Map loaded successfully");
        // Markers will be updated by the useEffect when items are ready
      });

      map.current.on("error", (e) => {
        console.error("ItemsMap: Map error", e);
        setError(
          "Failed to load map: " + (e.error?.message || "Unknown error")
        );
      });
    } catch (err) {
      console.error("ItemsMap: Error initializing map", err);
      setError("Failed to initialize map");
      isInitialized.current = false;
    }

    // Cleanup
    return () => {
      // Remove all markers and popups
      markers.current.forEach((marker) => marker.remove());
      popups.current.forEach((popup) => popup.remove());
      markers.current = [];
      popups.current = [];

      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      isInitialized.current = false;
    };
  }, []);

  const updateMarkers = useCallback(() => {
    if (!map.current) return;
    if (isUpdatingMarkers.current) {
      console.log("ItemsMap: Already updating markers, skipping");
      return;
    }

    isUpdatingMarkers.current = true;
    console.log("ItemsMap: Starting marker update");

    // Remove existing markers and popups
    markers.current.forEach((marker) => marker.remove());
    popups.current.forEach((popup) => popup.remove());
    markers.current = [];
    popups.current = [];

    // Filter items with valid coordinates
    const validItems = items.filter((item) => {
      const lng = item.longitude ?? item.coordinates?.longitude;
      const lat = item.latitude ?? item.coordinates?.latitude;
      return (
        lng !== undefined &&
        lat !== undefined &&
        lng !== null &&
        lat !== null &&
        !isNaN(lng) &&
        !isNaN(lat) &&
        lng !== 0 &&
        lat !== 0 // Filter out default (0,0) coordinates
      );
    });

    console.log(
      "ItemsMap: Valid items with coordinates",
      validItems.length,
      "out of",
      items.length
    );

    if (validItems.length === 0) {
      console.warn("ItemsMap: No items with valid coordinates found");
      return;
    }

    // Create markers for each item
    validItems.forEach((item) => {
      const lng = item.longitude ?? item.coordinates?.longitude ?? 0;
      const lat = item.latitude ?? item.coordinates?.latitude ?? 0;

      console.log(
        "ItemsMap: Creating marker for item",
        item.id,
        "at",
        lng,
        lat
      );

      const markerElement = createMarkerElement(item.type);
      const marker = new mapboxgl.Marker({
        element: markerElement,
        anchor: "bottom",
      })
        .setLngLat([lng, lat])
        .addTo(map.current!);

      console.log("ItemsMap: Marker created and added to map", marker);

      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
      }).setHTML(createPopupContent(item));

      // Set popup on marker
      marker.setPopup(popup);

      markers.current.push(marker);
    });

    // Fit map to show all markers if there are multiple items
    if (validItems.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      validItems.forEach((item) => {
        const lng = item.longitude ?? item.coordinates?.longitude ?? 0;
        const lat = item.latitude ?? item.coordinates?.latitude ?? 0;
        bounds.extend([lng, lat]);
      });
      map.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 18,
      });
    } else if (validItems.length === 1) {
      // Center on single item
      const lng =
        validItems[0].longitude ?? validItems[0].coordinates?.longitude ?? 0;
      const lat =
        validItems[0].latitude ?? validItems[0].coordinates?.latitude ?? 0;
      map.current.setCenter([lng, lat]);
      map.current.setZoom(17);
    }

    isUpdatingMarkers.current = false;
    console.log(
      "ItemsMap: Finished marker update, total markers:",
      markers.current.length
    );
  }, [items]);

  // Update markers when items change or map loads
  useEffect(() => {
    if (!map.current) return;
    if (loading) return; // Wait for items to finish loading
    if (!map.current.loaded()) {
      // Wait for map to load first
      map.current.once("load", () => {
        if (items.length > 0) {
          console.log(
            "ItemsMap: Map loaded, updating markers, items count:",
            items.length
          );
          updateMarkers();
        }
      });
      return;
    }

    // Map is loaded, update markers if we have items
    if (items.length > 0) {
      console.log("ItemsMap: Updating markers, items count:", items.length);
      updateMarkers();
    }
  }, [items, loading, updateMarkers]);

  return (
    <div className={`items-map-container ${className || ""}`} style={style}>
      {loading && <div className="items-map-loading">Loading items...</div>}
      {error && <div className="items-map-error">Error: {error}</div>}
      <div ref={mapContainer} className="items-map-map" />
      {!loading && !error && items.length === 0 && (
        <div className="items-map-empty">No items found</div>
      )}
    </div>
  );
}
