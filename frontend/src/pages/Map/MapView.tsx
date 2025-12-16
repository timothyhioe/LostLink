import { useState, useEffect } from "react";
import { ItemsMap } from "../../components/Map/ItemsMap";
import Navbar from "../navbar/navbar";
import "./MapView.css";

const API_BASE_URL = "http://localhost:5000/api";

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
  longitude?: number;
  latitude?: number;
}

export default function MapView() {
  const [items, setItems] = useState<MapItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Filter states
  const [typeFilter, setTypeFilter] = useState<"lost" | "found">("found");
  const [showSidebar, setShowSidebar] = useState(false);

  // Fetch items from API
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query parameters
        const params = new URLSearchParams();
        params.append("type", typeFilter);

        const queryString = params.toString();
        const url = `${API_BASE_URL}/items${
          queryString ? `?${queryString}` : ""
        }`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Failed to fetch items");
        }

        const data = await response.json();
        const transformedItems: MapItem[] = (data.items || [])
          .map((item: any) => ({
            ...item,
            longitude: item.coordinates?.longitude ?? item.longitude,
            latitude: item.coordinates?.latitude ?? item.latitude,
          }))
          // Filter to only show items with status 'open' or 'matched'
          .filter(
            (item: MapItem) =>
              item.status === "open" || item.status === "matched"
          );

        setItems(transformedItems);
        setFilteredItems(transformedItems);
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
  }, [typeFilter]);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const handleThemeToggle = (isDark: boolean) => {
    setIsDarkMode(isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  };

  const handleLogoClick = () => {
    window.location.href = "/";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "#4caf50";
      case "matched":
        return "#ff9800";
      case "resolved":
        return "#2196f3";
      case "closed":
        return "#9e9e9e";
      default:
        return "#666";
    }
  };

  return (
    <div className={`map-view-page ${isDarkMode ? "dark-mode" : "light-mode"}`}>
      <Navbar
        onLogout={handleLogout}
        onLogoClick={handleLogoClick}
        isDarkMode={isDarkMode}
        onThemeToggle={handleThemeToggle}
      />

      <div className="map-view-container">
        {/* Filters */}
        <div className="map-view-filters">
          <div className="map-view-filter-group">
            <label htmlFor="type-filter">Type:</label>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as "lost" | "found")
              }
              className="map-view-filter-select"
            >
              <option value="found">Found</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          <button
            className="map-view-sidebar-toggle"
            onClick={() => setShowSidebar(!showSidebar)}
            title={showSidebar ? "Hide item list" : "Show item list"}
          >
            {showSidebar ? "Hide List" : "Show List"}
          </button>
        </div>

        {/* Main content area */}
        <div className="map-view-content">
          {/* Map */}
          <div className="map-view-map-container">
            <ItemsMap
              apiBaseUrl={API_BASE_URL}
              className="map-view-items-map"
              items={filteredItems}
            />
          </div>

          {/* Sidebar with item list */}
          {showSidebar && (
            <div className="map-view-sidebar">
              <div className="map-view-sidebar-header">
                <h3>Items ({filteredItems.length})</h3>
                <button
                  className="map-view-sidebar-close"
                  onClick={() => setShowSidebar(false)}
                >
                  ×
                </button>
              </div>
              <div className="map-view-sidebar-content">
                {filteredItems.length === 0 ? (
                  <p className="map-view-sidebar-empty">
                    No items found with current filters
                  </p>
                ) : (
                  filteredItems.map((item) => {
                    const imageUrl =
                      item.images && item.images.length > 0
                        ? `http://localhost:5000${item.images[0].url}`
                        : null;
                    const formattedDate = new Date(
                      item.createdAt
                    ).toLocaleDateString("de-DE", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });

                    return (
                      <div key={item.id} className="map-view-sidebar-item">
                        {imageUrl && (
                          <img
                            src={imageUrl}
                            alt={item.title}
                            className="map-view-sidebar-item-image"
                          />
                        )}
                        <div className="map-view-sidebar-item-content">
                          <div className="map-view-sidebar-item-header">
                            <span
                              className={`map-view-sidebar-item-type map-view-sidebar-item-type-${item.type}`}
                            >
                              {item.type === "lost" ? "Verloren" : "Gefunden"}
                            </span>
                            <span
                              className="map-view-sidebar-item-status"
                              style={{ color: getStatusColor(item.status) }}
                            >
                              {item.status}
                            </span>
                          </div>
                          <h4 className="map-view-sidebar-item-title">
                            {item.title}
                          </h4>
                          <p className="map-view-sidebar-item-description">
                            {item.description || "No description"}
                          </p>
                          {item.buildingName && (
                            <p className="map-view-sidebar-item-location">
                              📍 {item.buildingName}
                            </p>
                          )}
                          <p className="map-view-sidebar-item-date">
                            📅 {formattedDate}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
