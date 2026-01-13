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
  items?: MapItem[]; // Optional: pass items directly instead of fetching
  typeFilter?: "all" | "lost" | "found"; // Optional: filter by type
  statusFilter?: "all" | "open" | "matched" | "resolved" | "closed"; // Optional: filter by status
  isDarkMode?: boolean; // Optional: enable dark mode map style
}

export function ItemsMap({
  className,
  style,
  apiBaseUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`,
  items: providedItems,
  typeFilter,
  statusFilter,
  isDarkMode = false,
}: ItemsMapProps) {
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const popups = useRef<mapboxgl.Popup[]>([]);
  const [items, setItems] = useState<MapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialized = useRef(false);
  const isUpdatingMarkers = useRef(false);

  // Use provided items or fetch from API
  useEffect(() => {
    if (providedItems) {
      // Use provided items (from parent component)
      setItems(providedItems);
      setLoading(false);
      setError(null);
      return;
    }

    // Fetch items from API
    const fetchItems = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query parameters
        const params = new URLSearchParams();
        if (typeFilter && typeFilter !== "all") {
          params.append("type", typeFilter);
        }
        if (statusFilter && statusFilter !== "all") {
          params.append("status", statusFilter);
        }

        const queryString = params.toString();
        const url = `${apiBaseUrl}/items${
          queryString ? `?${queryString}` : ""
        }`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Failed to fetch items");
        }

        const data = await response.json();
        console.log("ItemsMap: Fetched items from API", data);
        // Transform items to handle nested coordinates structure
        const transformedItems: MapItem[] = (data.items || []).map(
          (
            item: MapItem & {
              coordinates?: { longitude?: number; latitude?: number };
            }
          ) => ({
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
  }, [apiBaseUrl, providedItems, typeFilter, statusFilter]);

  // Create custom marker element
  const createMarkerElement = (type: "lost" | "found", count?: number) => {
    const markerElement = document.createElement("div");

    // Cluster marker if count > 1
    if (count && count > 1) {
      markerElement.className = `items-map-marker items-map-marker-cluster items-map-marker-cluster-${type}`;
      const color = type === "lost" ? "#ef4444" : "#3b82f6";

      markerElement.innerHTML = `
        <div class="items-map-marker-cluster-circle" style="background-color: ${color}">
          <span class="items-map-marker-cluster-count">${count}</span>
        </div>
      `;
    } else {
      // Single item marker
      markerElement.className = `items-map-marker items-map-marker-${type}`;
      const color = type === "lost" ? "#ef4444" : "#3b82f6";

      markerElement.innerHTML = `
        <div class="items-map-marker-pin">
          <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.163 0 0 7.163 0 16c0 13 16 26 16 26s16-13 16-26c0-8.837-7.163-16-16-16z" fill="${color}"/>
            <circle cx="16" cy="16" r="5" fill="white"/>
          </svg>
        </div>
      `;
    }

    return markerElement;
  };

  // Create popup content for a single item
  const createSingleItemPopup = useCallback(
    (item: MapItem) => {
      const imageUrl =
        item.images && item.images.length > 0
          ? `${BASE_URL}${item.images[0].url}`
          : null;
      const formattedDate = new Date(item.createdAt).toLocaleDateString(
        "de-DE",
        {
          day: "2-digit",
          month: "short",
        }
      );

      return `
      <div class="items-map-popup items-map-popup-single ${
        isDarkMode ? "dark-mode" : ""
      }">
        <div class="items-map-popup-content">
          ${
            item.buildingName
              ? `<h3 class="items-map-popup-building">${item.buildingName}</h3>`
              : ""
          }
          <div class="items-map-popup-single-item" data-item-id="${item.id}">
            ${
              imageUrl
                ? `<img src="${imageUrl}" alt="${item.title}" class="items-map-popup-single-image" />`
                : `<div class="items-map-popup-single-no-image"></div>`
            }
            <div class="items-map-popup-single-content">
              <div class="items-map-popup-single-header">
                <span class="items-map-popup-type items-map-popup-type-${
                  item.type
                }">
                  ${item.type === "lost" ? "Verloren" : "Gefunden"}
                </span>
                <span class="items-map-popup-single-date">${formattedDate}</span>
              </div>
              <h4 class="items-map-popup-single-title">${item.title}</h4>
              ${
                item.user?.name
                  ? `<p class="items-map-popup-single-user">👤 ${item.user.name}</p>`
                  : ""
              }
            </div>
          </div>
        </div>
      </div>
    `;
    },
    [isDarkMode]
  );

  // Create popup content for clustered items
  const createClusterPopup = useCallback(
    (items: MapItem[], buildingName: string) => {
      const lostItems = items.filter((item) => item.type === "lost");
      const foundItems = items.filter((item) => item.type === "found");

      return `
      <div class="items-map-popup items-map-popup-cluster ${
        isDarkMode ? "dark-mode" : ""
      }">
        <div class="items-map-popup-content">
          <h3 class="items-map-popup-title">${buildingName}</h3>
          <p class="items-map-popup-cluster-summary">
            ${items.length} ${items.length === 1 ? "Item" : "Items"}${
        foundItems.length > 0 || lostItems.length > 0 ? " • " : ""
      }${foundItems.length > 0 ? `${foundItems.length} gefunden` : ""}${
        lostItems.length > 0 && foundItems.length > 0 ? " • " : ""
      }${lostItems.length > 0 ? `${lostItems.length} verloren` : ""}
          </p>
          <div class="items-map-popup-cluster-list">
            ${items
              .map((item) => {
                const imageUrl =
                  item.images && item.images.length > 0
                    ? `${BASE_URL}${item.images[0].url}`
                    : null;
                const formattedDate = new Date(
                  item.createdAt
                ).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "short",
                });

                return `
                <div class="items-map-popup-cluster-item" data-item-id="${item.id}">
                  ${
                    imageUrl
                      ? `<img src="${imageUrl}" alt="${item.title}" class="items-map-popup-cluster-item-image" />`
                      : `<div class="items-map-popup-cluster-item-no-image"></div>`
                  }
                  <div class="items-map-popup-cluster-item-content">
                    <div class="items-map-popup-cluster-item-header">
                      <span class="items-map-popup-type items-map-popup-type-${
                        item.type
                      }">
                        ${item.type === "lost" ? "Verloren" : "Gefunden"}
                      </span>
                      <span class="items-map-popup-cluster-item-date">${formattedDate}</span>
                    </div>
                    <h4 class="items-map-popup-cluster-item-title">${
                      item.title
                    }</h4>
                    ${
                      item.user?.name
                        ? `<p class="items-map-popup-cluster-item-user">👤 ${item.user.name}</p>`
                        : ""
                    }
                  </div>
                </div>
              `;
              })
              .join("")}
          </div>
        </div>
      </div>
    `;
    },
    [isDarkMode]
  );

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
        style: isDarkMode
          ? "mapbox://styles/mapbox/dark-v11"
          : "mapbox://styles/mapbox/streets-v12",
        center: [CENTER.lng, CENTER.lat],
        zoom: 16,
        attributionControl: false, // Disable attribution control
      });

      // Close popups when clicking on the map (but not on markers/popups)
      map.current.on("click", (e) => {
        // Check if the click target is a marker or popup element
        const target = e.originalEvent.target as HTMLElement;
        const isMarker = target.closest(".items-map-marker");
        const isPopup = target.closest(".mapboxgl-popup");
        const isPopupCloseButton = target.closest(
          ".mapboxgl-popup-close-button"
        );

        // If clicking on map (not marker, popup, or popup close button), close all popups
        if (!isMarker && !isPopup && !isPopupCloseButton) {
          markers.current.forEach((marker) => {
            const popup = marker.getPopup();
            if (popup && popup.isOpen()) {
              popup.remove();
            }
          });
        }
      });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only initialize once - isDarkMode is handled by separate effect below

  // Update map style when dark mode changes (only if map is already initialized)
  useEffect(() => {
    if (map.current && map.current.loaded() && isInitialized.current) {
      const newStyle = isDarkMode
        ? "mapbox://styles/mapbox/dark-v11"
        : "mapbox://styles/mapbox/streets-v12";
      map.current.setStyle(newStyle);
    }
  }, [isDarkMode]);

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
      isUpdatingMarkers.current = false;
      return;
    }

    // Group items by building or very close coordinates
    const DISTANCE_THRESHOLD = 0.0001; // ~10 meters
    const clusters = new Map<string, MapItem[]>();

    validItems.forEach((item) => {
      const lng = item.longitude ?? item.coordinates?.longitude ?? 0;
      const lat = item.latitude ?? item.coordinates?.latitude ?? 0;

      // Try to find an existing cluster with the same building or very close location
      let foundCluster = false;

      for (const [, clusterItems] of clusters.entries()) {
        const firstItem = clusterItems[0];
        const clusterLng =
          firstItem.longitude ?? firstItem.coordinates?.longitude ?? 0;
        const clusterLat =
          firstItem.latitude ?? firstItem.coordinates?.latitude ?? 0;

        // Check if same building name or very close coordinates
        const sameBuilding =
          item.buildingName &&
          firstItem.buildingName &&
          item.buildingName === firstItem.buildingName;
        const closeCoordinates =
          Math.abs(lng - clusterLng) < DISTANCE_THRESHOLD &&
          Math.abs(lat - clusterLat) < DISTANCE_THRESHOLD;

        if (sameBuilding || closeCoordinates) {
          clusterItems.push(item);
          foundCluster = true;
          break;
        }
      }

      if (!foundCluster) {
        // Create new cluster
        const clusterKey = `${lng.toFixed(4)},${lat.toFixed(4)}`;
        clusters.set(clusterKey, [item]);
      }
    });

    console.log("ItemsMap: Created", clusters.size, "clusters");

    // Create markers for each cluster
    const allBounds: [number, number][] = [];

    clusters.forEach((clusterItems) => {
      const firstItem = clusterItems[0];
      const lng = firstItem.longitude ?? firstItem.coordinates?.longitude ?? 0;
      const lat = firstItem.latitude ?? firstItem.coordinates?.latitude ?? 0;

      allBounds.push([lng, lat]);

      // Determine cluster type (if all same type, use that; otherwise use "found" as default)
      const allLost = clusterItems.every((item) => item.type === "lost");
      const clusterType = allLost ? "lost" : "found";

      const markerElement = createMarkerElement(
        clusterType,
        clusterItems.length
      );
      const marker = new mapboxgl.Marker({
        element: markerElement,
        anchor: clusterItems.length > 1 ? "center" : "bottom",
      })
        .setLngLat([lng, lat])
        .addTo(map.current!);

      // Create popup based on cluster size
      let popup;
      if (clusterItems.length === 1) {
        popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: false,
          closeOnClick: false,
          maxWidth: "320px",
        }).setHTML(createSingleItemPopup(clusterItems[0]));
      } else {
        const buildingName =
          clusterItems[0].buildingName || "Unbekannter Standort";
        popup = new mapboxgl.Popup({
          offset: 15,
          closeButton: false,
          closeOnClick: false,
          maxWidth: "400px",
        }).setHTML(createClusterPopup(clusterItems, buildingName));
      }

      // Set popup on marker
      marker.setPopup(popup);
      markers.current.push(marker);
    });

    // Fit map to show all markers
    if (allBounds.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      allBounds.forEach((coord) => bounds.extend(coord));
      map.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 18,
      });
    } else if (allBounds.length === 1) {
      // Center on single marker
      map.current.setCenter(allBounds[0]);
      map.current.setZoom(17);
    }

    isUpdatingMarkers.current = false;
    console.log(
      "ItemsMap: Finished marker update, total markers:",
      markers.current.length
    );
  }, [items, createSingleItemPopup, createClusterPopup]);

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

  // Add click handler for popup items to navigate to home page
  useEffect(() => {
    if (!map.current) return;

    const handleItemClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const itemCard = target.closest("[data-item-id]");
      if (itemCard) {
        const itemId = itemCard.getAttribute("data-item-id");
        if (itemId) {
          // Navigate to home page with item hash
          window.location.href = `/#item-${itemId}`;
        }
      }
    };

    // Add click listener to map container
    const mapContainer = map.current.getContainer();
    mapContainer.addEventListener("click", handleItemClick);

    return () => {
      mapContainer.removeEventListener("click", handleItemClick);
    };
  }, []);

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
