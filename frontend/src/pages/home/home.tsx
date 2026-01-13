import { useState, useEffect } from "react";
import "./home.css";
import Navbar from "../navbar/navbar";
import { useChat } from "../../contexts/ChatContext";

interface ItemImage {
  url: string;
  filename: string;
  uploadedAt: string;
}

interface DBItem {
  id: string;
  userId: string;
  type: "lost" | "found";
  title: string;
  description: string;
  buildingName: string;
  images: ItemImage[];
  status: string;
  matchCount: number;
  user?: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface FoundItem extends DBItem {
  id: string;
  image: string;
  what: string;
  where: string;
  location_display: string;
  when: string;
  founder: string;
}

const API_BASE_URL = `${
  import.meta.env.VITE_API_URL || "http://localhost:5000"
}/api`;
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Home() {
  const { openChatWithUser } = useChat();
  const [items, setItems] = useState<FoundItem[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Initialize from localStorage
    const savedTheme = localStorage.getItem("theme");
    return savedTheme === "dark";
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "lost" | "found">("all");
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(
    null
  );

  // Fetch items from backend
  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/items`);

      if (!response.ok) {
        throw new Error("Failed to fetch items");
      }

      const data = await response.json();

      // Transform backend data to frontend format
      const transformedItems: FoundItem[] = data.items.map((item: DBItem) => {
        // Only prepend BASE_URL if the image URL is not already absolute
        const imageUrl = item.images.length > 0 ? item.images[0].url : "";
        const fullImageUrl =
          imageUrl.startsWith("http://") || imageUrl.startsWith("https://")
            ? imageUrl
            : `${BASE_URL}${imageUrl}`;

        return {
          ...item,
          image: fullImageUrl,
          what: item.title,
          where: `Where found: ${item.buildingName}`,
          location_display: `Location: ${item.buildingName}`,
          when: `When found: ${new Date(item.createdAt).toLocaleDateString(
            "en-US"
          )} ${new Date(item.createdAt).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}`,
          founder: item.user?.name || "Unknown",
        };
      });

      setItems(transformedItems);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      console.error("Error fetching items:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    // Get current user
    const user = localStorage.getItem("user");
    if (user) {
      const parsedUser = JSON.parse(user);
      setCurrentUserId(parsedUser.id || parsedUser._id);
    }

    // Fetch items on mount
    fetchItems();

    // Listen for post success event to refetch
    const handlePostSuccess = () => {
      fetchItems();
    };

    window.addEventListener("itemPosted", handlePostSuccess);

    return () => {
      window.removeEventListener("itemPosted", handlePostSuccess);
    };
  }, []);

  // Sync theme with localStorage when component mounts or window gains focus
  useEffect(() => {
    const syncTheme = () => {
      const savedTheme = localStorage.getItem("theme");
      const shouldBeDark = savedTheme === "dark";
      if (isDarkMode !== shouldBeDark) {
        setIsDarkMode(shouldBeDark);
      }
    };

    // Sync on mount
    syncTheme();

    // Sync when window gains focus (user navigates back to this tab)
    const handleFocus = () => {
      syncTheme();
    };

    // Listen for custom theme change events (from Navbar)
    const handleThemeChange = () => {
      syncTheme();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("themechange", handleThemeChange as EventListener);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener(
        "themechange",
        handleThemeChange as EventListener
      );
    };
  }, [isDarkMode]);

  // Handle scrolling to item from URL hash
  useEffect(() => {
    // Check if URL has item hash
    const hash = window.location.hash;
    if (hash && hash.startsWith("#item-")) {
      const itemId = hash.replace("#item-", "");

      // Wait for items to load
      if (items.length > 0 && !loading) {
        setTimeout(() => {
          const element = document.querySelector(`[data-item-id="${itemId}"]`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            // Highlight the item
            setHighlightedItemId(itemId);
            // Remove highlight after 2 seconds
            setTimeout(() => {
              setHighlightedItemId(null);
            }, 2000);
            // Clear the hash from URL
            window.history.replaceState(null, "", window.location.pathname);
          }
        }, 300);
      }
    }
  }, [items, loading]);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const handleThemeToggle = (isDark: boolean) => {
    setIsDarkMode(isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
    // Dispatch custom event so other pages can sync
    window.dispatchEvent(new Event("themechange"));
  };

  const handleContactButton = (item: FoundItem) => {
    if (item.userId === currentUserId) {
      alert("You cannot contact yourself!");
      return;
    }
    // Open chat with this user
    openChatWithUser(item.userId, item.founder);
  };

  const handleLogoClick = () => {
    // Logo click handler
  };

  return (
    <div className={`home-page ${isDarkMode ? "dark-mode" : "light-mode"}`}>
      <Navbar
        onLogout={handleLogout}
        onLogoClick={handleLogoClick}
        isDarkMode={isDarkMode}
        onThemeToggle={handleThemeToggle}
      />

      {/* Main content */}
      <div className="home-main-content">
        {/* Left side - Items list */}
        <div className="home-items-column">
          {/* Filter buttons */}
          <div className="home-filters">
            <button
              className={`home-filter-btn ${
                filterType === "all" ? "active" : ""
              }`}
              onClick={() => setFilterType("all")}
            >
              All
            </button>
            <button
              className={`home-filter-btn home-filter-btn-lost ${
                filterType === "lost" ? "active" : ""
              }`}
              onClick={() => setFilterType("lost")}
            >
              Lost
            </button>
            <button
              className={`home-filter-btn home-filter-btn-found ${
                filterType === "found" ? "active" : ""
              }`}
              onClick={() => setFilterType("found")}
            >
              Found
            </button>
          </div>

          {loading ? (
            <p style={{ textAlign: "center", padding: "2rem" }}>
              Loading items...
            </p>
          ) : error ? (
            <p style={{ textAlign: "center", padding: "2rem", color: "red" }}>
              Error: {error}
            </p>
          ) : items.length === 0 ? (
            <p style={{ textAlign: "center", padding: "2rem" }}>
              No items found
            </p>
          ) : (
            items
              .filter(
                (item) => filterType === "all" || item.type === filterType
              )
              .map((item) => (
                <div
                  key={item.id}
                  className={`home-item-row ${
                    highlightedItemId === item.id ? "highlight-item" : ""
                  }`}
                  data-item-id={item.id}
                >
                  <div className="home-item-image">
                    {item.image ? (
                      <img src={item.image} alt={item.what} />
                    ) : (
                      <div className="home-item-no-image"></div>
                    )}
                  </div>

                  <div className="home-item-details">
                    <div className="home-item-header">
                      <span
                        className={`home-item-type-label ${
                          item.type === "lost" ? "lost" : "found"
                        }`}
                      >
                        {item.type === "lost" ? "Lost" : "Found"}
                      </span>
                    </div>
                    <h3 className="home-item-what">{item.what}</h3>
                    <p className="home-item-description">{item.description}</p>

                    <div className="home-item-meta">
                      <div className="home-item-location-row">
                        <img
                          src="src/assets/Home/location_logo.png"
                          alt="location"
                          className="home-item-icon"
                        />
                        <p className="home-item-location-text">
                          {item.buildingName}
                        </p>
                      </div>
                      <div className="home-item-date-row">
                        <img
                          src="src/assets/Home/date_logo.png"
                          alt="date"
                          className="home-item-icon"
                        />
                        <p className="home-item-date-text">
                          {new Date(item.createdAt).toLocaleDateString("de-DE")}{" "}
                          {new Date(item.createdAt).toLocaleTimeString(
                            "de-DE",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="home-item-right">
                    <div className="home-founder-card">
                      <div className="home-founder-header">
                        <div className="home-founder-avatar">
                          <img
                            className="home-founder-image"
                            alt="Profile"
                            src="/src/assets/Navbar/profile-circle_.png"
                          />
                        </div>
                        <div className="home-founder-info">
                          <p className="home-founder-label">
                            {item.type === "lost" ? "Lost by" : "Found by"}
                          </p>
                          <p className="home-founder-name">{item.founder}</p>
                        </div>
                      </div>
                      <button
                        className="home-contact-button"
                        onClick={() => handleContactButton(item)}
                        disabled={item.userId === currentUserId}
                        title={
                          item.userId === currentUserId
                            ? "You cannot contact yourself"
                            : "Click to chat"
                        }
                      >
                        Contact
                      </button>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
