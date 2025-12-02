import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  onPostClick: () => void
  unreadCount?: number
}

export default function Navbar({ onMessageClick, onLogout, onLogoClick, isDarkMode, onThemeToggle, onPostClick, unreadCount }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navigate = useNavigate()

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
            <button className="navbar-post-button" onClick={onPostClick}>Post</button>

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
              style={{ position: 'relative' }}
            >
              <img src={isDarkMode ? messageIconWhite : messageIcon} alt="Messages" />
              {unreadCount && unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  backgroundColor: '#ff4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>
            
            <button className="navbar-notification-btn" title="Notifications">
              <img src={isDarkMode ? notificationIconWhite : notificationIcon} alt="Notifications" />
            </button>
            
            <div className="navbar-profile-dropdown">
              <button 
                className="navbar-profile-btn" 
                title="Profile"
              >
                <img src={isDarkMode ? profileIconWhite : profileIcon} alt="Profile" />
              </button>

              <div className={`navbar-profile-menu ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
                <button 
                  className="navbar-profile-menu-item"
                  onClick={() => {
                    navigate('/my-items')
                  }}
                >
                  Meine Posts
                </button>
              </div>
            </div>

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
          

          <button className="navbar-post-button navbar-mobile-item" onClick={onPostClick}>Post</button>
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
          <button 
            className="navbar-profile-btn navbar-mobile-item" 
            title="Profile"
            onClick={() => {
              navigate('/my-items')
              handleCloseMenu()
            }}
          >
            <img src={isDarkMode ? profileIconWhite : profileIcon} alt="Profile" /> My Posted Items
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
