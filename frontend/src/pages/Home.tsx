import './Home.css'
import testPicture from '../assets/testFolder/mockup-image.png'

export default function Home() {
  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    // Reload to login page
    window.location.href = '/login';
  };

  return (
    <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1>Home</h1>
          <button onClick={handleLogout} className='home-logout-button'>
            Logout
          </button>
        </div>


        <img src={testPicture}/>
    </div>
  )
}
