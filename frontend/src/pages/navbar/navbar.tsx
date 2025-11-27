import { useState, useEffect } from 'react'
import './navbar.css'
import messageIcon from '../../assets/Navbar/message_.png'
import messageIconWhite from '../../assets/Navbar/message-white.png'
import notificationIcon from '../../assets/Navbar/notification_.png'
import notificationIconWhite from '../../assets/Navbar/notification-white.png'
import profileIcon from '../../assets/Navbar/profile-circle_.png'
import profileIconWhite from '../../assets/Navbar/profile-circle-white.png'
import darkModeIcon from '../../assets/Navbar/dark-mode_.png'
import lightModeIconWhite from '../../assets/Navbar/light-mode-white.png'

interface NavbarProps {
  onMessageClick: () => void
  onLogout: () => void
  onLogoClick?: () => void
  isDarkMode: boolean
  onThemeToggle: (isDark: boolean) => void
}

export default function Navbar({ onMessageClick, onLogout, onLogoClick, isDarkMode, onThemeToggle }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Handle body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }

    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isMenuOpen])

  const handleMenuToggle = () => {
    setIsMenuOpen(prevState => !prevState)
  }

  const handleCloseMenu = () => {
    setIsMenuOpen(false)
  }

  const handleMessageClickWrapper = () => {
    onMessageClick()
    handleCloseMenu()
  }

  const handleLogoutWrapper = () => {
    handleCloseMenu()
    onLogout()
  }

  const handleLogoClick = () => {
    handleCloseMenu()
    if (onLogoClick) {
      onLogoClick()
    }
  }

  return (
    <>
      {/* Navbar */}
      <nav className={`navbar ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
        <div className="navbar-container">
          <div className="navbar-left">
            <h1 className="navbar-logo" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>LostLink</h1>
            <div className="navbar-search-container">
              <input 
                type="text" 
                placeholder="Suche..." 
                className="navbar-search-input"
              />
              <button className="navbar-search-btn">Search</button>
            </div>
          </div>

          <div className="navbar-right">
            <button className="navbar-post-button">Post</button>

            <button 
              className="navbar-theme-toggle"
              onClick={() => onThemeToggle(!isDarkMode)}
              title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
            >
              <img src={isDarkMode ? lightModeIconWhite : darkModeIcon} alt={isDarkMode ? 'Light Mode' : 'Dark Mode'} />
            </button>
            
            <button 
              className="navbar-message-btn"
              onClick={onMessageClick}
              title="Messages"
            >
              <img src={isDarkMode ? messageIconWhite : messageIcon} alt="Messages" />
            </button>
            
            <button className="navbar-notification-btn" title="Notifications">
              <img src={isDarkMode ? notificationIconWhite : notificationIcon} alt="Notifications" />
            </button>
            
            <button className="navbar-profile-btn" title="Profile">
              <img src={isDarkMode ? profileIconWhite : profileIcon} alt="Profile" />
            </button>

            <button 
              className="navbar-logout-button"
              onClick={onLogout}
            >
              Log Out
            </button>
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
      <div className={`navbar-mobile-container ${isMenuOpen ? 'visible' : ''} ${isDarkMode ? 'dark-mode' : ''}`}>
        <div className="navbar-mobile-content">
          {/* Close button */}
          

          <button className="navbar-post-button navbar-mobile-item">Post</button>
          <button 
            className="navbar-theme-toggle navbar-mobile-item"
            onClick={() => onThemeToggle(!isDarkMode)}
            title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
          >
            <img src={isDarkMode ? lightModeIconWhite : darkModeIcon} alt={isDarkMode ? 'Light Mode' : 'Dark Mode'} />
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button 
            className="navbar-message-btn navbar-mobile-item"
            onClick={handleMessageClickWrapper}
            title="Messages"
          >
            <img src={isDarkMode ? messageIconWhite : messageIcon} alt="Messages" /> Messages
          </button>
          <button className="navbar-notification-btn navbar-mobile-item" title="Notifications">
            <img src={isDarkMode ? notificationIconWhite : notificationIcon} alt="Notifications" /> Notifications
          </button>
          <button className="navbar-profile-btn navbar-mobile-item" title="Profile">
            <img src={isDarkMode ? profileIconWhite : profileIcon} alt="Profile" /> Profile
          </button>
          <button 
            className="navbar-logout-button navbar-mobile-item"
            onClick={handleLogoutWrapper}
          >
            Log Out
          </button>
        </div>
      </div>
    </>
  )
}
