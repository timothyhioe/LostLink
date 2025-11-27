import { useState } from 'react'
import './Home.css'
import Navbar from './navbar/navbar'
import headsetImage from '../assets/Home/headset-mock-image.webp'
import ipadImage from '../assets/Home/ipad-mock-photo.jpg'
import bottleImage from '../assets/Home/bottle-mock-image.jpg'
import federmachenImage from '../assets/Home/federmapchen-mock-image.jpg'

interface FoundItem {
  id: number
  image: string
  what: string
  where: string
  location: string
  when: string
  founder: string
}

export default function Home() {
  const [selectedChat, setSelectedChat] = useState<FoundItem | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    // Reload to login page
    window.location.href = '/login';
  };

  const handleThemeToggle = (isDark: boolean) => {
    setIsDarkMode(isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }

  const handleMessageClick = () => {
    setIsChatOpen(!isChatOpen)
    if (isChatOpen) {
      setSelectedChat(null)
    }
  }

  const handleContactButton = (item: FoundItem) => {
    setSelectedChat(item)
    setIsChatOpen(true)
  }

  const handleLogoClick = () => {
    setIsChatOpen(false)
    setSelectedChat(null)
  }

  const foundItems = [
    {
      id: 1,
      image: headsetImage,
      what: 'Kopfhörer',
      where: 'Wo wurde gefunden: D14.0.04',
      location: 'Wo zu finden ist: Sekretariat D14.0.09',
      when: 'Wann wurde gefunden: 17.11, 12:31',
      founder: 'Plorian Wirtz'
    },
    {
      id: 2,
      image: ipadImage,
      what: 'Ipad S9 Mega+ Pro Max',
      where: 'Wo wurde gefunden: C20 Cafe',
      location: 'Wo zu finden ist: Ist mit mir',
      when: 'Wann wurde gefunden: 18.11, 14:00',
      founder: 'Jonas Kimmich'
    },
    {
      id: 3,
      image: bottleImage,
      what: 'Water bottle',
      where: 'Wo wurde gefunden: In front of C23',
      location: 'Wo zu finden ist: Secretary person at C23, Floor 0',
      when: 'Wann wurde gefunden: 14.11 10:30',
      founder: 'Giorgia Giovanna'
    },
    {
      id: 4,
      image: federmachenImage,
      what: 'Federmäppchen',
      where: 'Wo wurde gefunden: D15, 1.05',
      location: 'Wo zu finden ist: Mit mir',
      when: 'Wann wurde gefunden: 19.11 16:00',
      founder: 'Laus Fichtel'
    }
  ];

  return (
    <div className={`home-page ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      <Navbar onMessageClick={handleMessageClick} onLogout={handleLogout} onLogoClick={handleLogoClick} isDarkMode={isDarkMode} onThemeToggle={handleThemeToggle} />

      {/* Main content */}
      <div className={`home-main-content ${isChatOpen ? 'home-chat-open' : ''}`}>
        {/* Left side - Items list */}
        <div className="home-items-column">
          {foundItems.map((item) => (
            <div key={item.id} className="home-item-row">
              <div className="home-item-image">
                <img src={item.image} alt={item.what} />
              </div>
              
              <div className="home-item-details">
                <h3 className="home-item-what">{item.what}</h3>
                <p className="home-item-where">{item.where}</p>
                <p className="home-item-location">{item.location}</p>
                <p className="home-item-when">{item.when}</p>
              </div>

              <div className="home-item-right">
                <p className="home-founder-label">Wer hat das gefunden:</p>
                <p className="home-founder-name">{item.founder}</p>
                <button 
                  className="home-contact-button"
                  onClick={() => handleContactButton(item)}
                >
                  Kontaktieren
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right side - Chat box */}
        {isChatOpen && (
          <div className="home-chat-section">
            {selectedChat ? (
              <div className="home-chat-box">
                <div className="home-chat-header">
                  <h3>{selectedChat.founder}</h3>
                  <p>sucht nach: {selectedChat.what}</p>
                </div>
                
                <div className="home-chat-messages">
                  {/* Empty chat area */}
                </div>

                <div className="home-chat-input-area">
                  <input 
                    type="text" 
                    placeholder="Message" 
                    className="home-chat-input"
                  />
                  <button className="home-chat-send">→</button>
                </div>
              </div>
            ) : (
              <div className="home-empty-chat">
                <p>Select a contact to start messaging</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
