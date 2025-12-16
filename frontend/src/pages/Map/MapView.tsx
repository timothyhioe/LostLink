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
  const [filteredItems, setFilteredItems] = useState<MapItem[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Filter states
  const [typeFilter, setTypeFilter] = useState<"lost" | "found">("found");

  // Fetch items from API
  useEffect(() => {
    const fetchItems = async () => {
      try {
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

        setFilteredItems(transformedItems);
      } catch (err) {
        console.error("Error fetching items:", err);
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
        </div>

        {/* Map */}
        <div className="map-view-map-container">
          <ItemsMap
            apiBaseUrl={API_BASE_URL}
            className="map-view-items-map"
            items={filteredItems}
          />
        </div>
      </div>
    </div>
  );
}
