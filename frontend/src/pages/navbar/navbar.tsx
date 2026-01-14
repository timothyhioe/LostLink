import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./navbar.css";
import ItemPostForm from "./itemPostForm/itemPostForm";
import NavbarChat from "../../components/NavbarChat/NavbarChat";
import { useChat } from "../../contexts/ChatContext";

import messageIcon from "../../assets/Navbar/message_.png";
import messageIconWhite from "../../assets/Navbar/message-white.png";
import profileIcon from "../../assets/Navbar/profile-circle_.png";
import profileIconWhite from "../../assets/Navbar/profile-circle-white.png";
import darkModeIcon from "../../assets/Navbar/dark-mode_.png";
import lightModeIconWhite from "../../assets/Navbar/light-mode-white.png";

interface NavbarProps {
  onLogout: () => void;
  onLogoClick?: () => void;
  isDarkMode: boolean;
  onThemeToggle: (isDark: boolean) => void;
  onItemPosted?: () => void;
  onSearch?: (searchQuery: string) => void;
}

export default function Navbar({
  onLogout,
  onLogoClick,
  isDarkMode,
  onThemeToggle,
  onItemPosted,
  onSearch,
}: NavbarProps) {
  const { unreadNotifications, chatOpenTrigger } = useChat();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPostFormOpen, setIsPostFormOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [postLimitReached, setPostLimitReached] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userName, setUserName] = useState<string>("");
  const navigate = useNavigate();

  // Get user name from localStorage
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setUserName(userData.name || "");
      } catch {
        // Unable to parse user data
      }
    }
  }, []);
  const API_BASE_URL = `${
    import.meta.env.VITE_API_URL || "http://localhost:5000"
  }/api`;

  // Fetch user's post count for post limit
  useEffect(() => {
    const fetchMyPostCount = async () => {
      const authToken = localStorage.getItem("authToken");
      if (!authToken) return;
      try {
        const response = await fetch(`${API_BASE_URL}/items/my`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (response.ok) {
          const data = await response.json();
          setPostLimitReached(data.items.length >= 10);
        }
      } catch {
        // Error fetching post count, silently ignore
      }
    };
    fetchMyPostCount();
  }, [isPostFormOpen, API_BASE_URL]);

  // Listen for itemDeleted event to refresh post count
  useEffect(() => {
    const handleItemDeleted = () => {
      const fetchMyPostCount = async () => {
        const authToken = localStorage.getItem("authToken");
        if (!authToken) return;
        try {
          const response = await fetch(`${API_BASE_URL}/items/my`, {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (response.ok) {
            const data = await response.json();
            setPostLimitReached(data.items.length >= 10);
          }
        } catch {
          // Error fetching post count, silently ignore
        }
      };
      fetchMyPostCount();
    };
    window.addEventListener("itemDeleted", handleItemDeleted);
    return () => window.removeEventListener("itemDeleted", handleItemDeleted);
  }, []);

  // Calculate total unread notifications
  const unreadCount = Object.keys(unreadNotifications).length;

  // Handle body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isMenuOpen]);

  // Open chat when chatOpenTrigger changes (for opening chat programmatically)
  useEffect(() => {
    if (chatOpenTrigger > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsChatOpen(true);
    }
  }, [chatOpenTrigger]);

  const handleMenuToggle = () => {
    setIsMenuOpen((prevState) => !prevState);
  };

  const handleCloseMenu = () => {
    setIsMenuOpen(false);
  };

  const handleMessageClickWrapper = () => {
    setIsChatOpen((prev) => !prev);
    handleCloseMenu();
  };

  const handleSearch = () => {
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    // Optional: search in real-time as user types
    if (onSearch) {
      onSearch(query);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleLogoutWrapper = () => {
    handleCloseMenu();
    onLogout();
  };

  const handlePostClick = () => {
    setIsPostFormOpen(true);
    handleCloseMenu();
  };

  const handlePostFormClose = () => {
    setIsPostFormOpen(false);
  };

  const handlePostSuccess = () => {
    if (onItemPosted) {
      onItemPosted();
    }
  };

  const handleLogoClick = () => {
    handleCloseMenu();
    if (onLogoClick) {
      onLogoClick();
    }
  };

  const handleProfileClick = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const handleMyPostsClick = () => {
    navigate("/my-posts");
    setIsProfileDropdownOpen(false);
    handleCloseMenu();
  };

  const handleMapClick = () => {
    navigate("/map");
    handleCloseMenu();
  };

  return (
    <>
      {/* Navbar */}
      <nav className={`navbar ${isDarkMode ? "dark-mode" : "light-mode"}`}>
        <div className="navbar-container">
          <div className="navbar-left">
            <h1
              className="navbar-logo"
              onClick={handleLogoClick}
              style={{ cursor: "pointer" }}
            >
              LostLink
            </h1>
          </div>

          <div className="navbar-search-container">
            <input
              type="text"
              placeholder="Search..."
              className="navbar-search-input"
              value={searchQuery}
              onChange={handleSearchInputChange}
              onKeyPress={handleSearchKeyPress}
            />
          </div>

          <div className="navbar-right">
            <button
              className="navbar-post-button"
              onClick={handlePostClick}
              disabled={postLimitReached}
            >
              + Post
            </button>

            <button
              className="navbar-map-button"
              onClick={handleMapClick}
              title="Map"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M21 10C21 17 12 23 12 23S3 17 3 10C3 5.58172 6.58172 2 12 2C17.4183 2 21 5.58172 21 10Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="12"
                  cy="10"
                  r="3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <button
              className="navbar-theme-toggle"
              onClick={() => onThemeToggle(!isDarkMode)}
              title={isDarkMode ? "Light Mode" : "Dark Mode"}
            >
              <img
                src={isDarkMode ? lightModeIconWhite : darkModeIcon}
                alt={isDarkMode ? "Light Mode" : "Dark Mode"}
              />
            </button>

            <button
              className="navbar-message-btn"
              onClick={handleMessageClickWrapper}
              title="Messages"
            >
              <img
                src={isDarkMode ? messageIconWhite : messageIcon}
                alt="Messages"
              />
              {unreadCount > 0 && (
                <span className="navbar-message-badge">{unreadCount}</span>
              )}
            </button>

            <div className="navbar-profile-container">
              <button
                className="navbar-profile-btn"
                title="Profile"
                onClick={handleProfileClick}
              >
                <img
                  src={isDarkMode ? profileIconWhite : profileIcon}
                  alt="Profile"
                />
              </button>
              {userName && <span className="navbar-username">{userName}</span>}
              {isProfileDropdownOpen && (
                <div
                  className={`navbar-profile-dropdown ${
                    isDarkMode ? "dark-mode" : ""
                  }`}
                >
                  <button
                    className="dropdown-item"
                    onClick={handleMyPostsClick}
                  >
                    My Posts
                  </button>
                  <button
                    className="dropdown-item logout-item"
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      onLogout();
                    }}
                  >
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            className="navbar-menu-toggle"
            onClick={handleMenuToggle}
            title="Menu"
          >
            ☰
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      <div
        className={`navbar-mobile-container ${isMenuOpen ? "visible" : ""} ${
          isDarkMode ? "dark-mode" : ""
        }`}
      >
        <div className="navbar-mobile-content">
          {/* Close button */}

          <button
            className="navbar-post-button navbar-mobile-item"
            onClick={handlePostClick}
          >
            Post
          </button>
          <button
            className="navbar-mobile-item"
            onClick={handleMapClick}
            title="Map"
          >
            <svg
              className="navbar-mobile-item-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M21 10C21 17 12 23 12 23S3 17 3 10C3 5.58172 6.58172 2 12 2C17.4183 2 21 5.58172 21 10Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="12"
                cy="10"
                r="3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Map
          </button>
          <button
            className="navbar-theme-toggle navbar-mobile-item"
            onClick={() => onThemeToggle(!isDarkMode)}
            title={isDarkMode ? "Light Mode" : "Dark Mode"}
          >
            <img
              src={isDarkMode ? lightModeIconWhite : darkModeIcon}
              alt={isDarkMode ? "Light Mode" : "Dark Mode"}
            />
            {isDarkMode ? "Light Mode" : "Dark Mode"}
          </button>
          <button
            className="navbar-message-btn navbar-mobile-item"
            onClick={handleMessageClickWrapper}
            title="Messages"
          >
            <img
              src={isDarkMode ? messageIconWhite : messageIcon}
              alt="Messages"
            />{" "}
            Messages
          </button>
          <button
            className="navbar-profile-btn navbar-mobile-item"
            title="Profile"
            onClick={handleMyPostsClick}
          >
            <img
              src={isDarkMode ? profileIconWhite : profileIcon}
              alt="Profile"
            />{" "}
            My Posts
          </button>
          <button
            className="navbar-logout-button navbar-mobile-item"
            onClick={handleLogoutWrapper}
          >
            Log Out
          </button>
        </div>
      </div>

      <ItemPostForm
        isOpen={isPostFormOpen}
        onClose={handlePostFormClose}
        isDarkMode={isDarkMode}
        onPostSuccess={handlePostSuccess}
      />

      <NavbarChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        isDarkMode={isDarkMode}
      />
    </>
  );
}
