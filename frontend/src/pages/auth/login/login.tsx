import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './login.css';

//auto detect API URL based on current environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    console.log('=== LOGIN ATTEMPT ===');
    console.log('API_URL:', API_URL);
    console.log('Email:', email);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log('Login response status:', response.status);
      console.log('Login response data:', data);

      if (!response.ok) {
        // Handle unverified email case
        if (response.status === 403 && data.message?.includes("not verified")) {
          setShowVerificationPrompt(true);
          setError(data.message || 'Login failed');
          setLoading(false);
          return;
        }
        
        setError(data.message || 'Login failed');
        setLoading(false);
        console.log('Login failed:', data.message);
        return;
      }

      //store token and user data
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      console.log('Token stored in localStorage:', !!localStorage.getItem('authToken'));
      console.log('User stored in localStorage:', !!localStorage.getItem('user'));

      //show the success message
      setSuccess('Login successful! Redirecting to home...');
      console.log('Success, redirecting');

      //reload the page to refresh authentication state
      setTimeout(() => {
        console.log('REDIRECTING NOW with window.location.href');
        window.location.href = '/';
      }, 1000);
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Login error:', err);
      setLoading(false);
    }
  };

  // Development mode - bypass login
  // Removed - no longer needed for production

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Login</h1>
        
        {error && (
          <div className="error-message">
            <p>{error}</p>
            {showVerificationPrompt && (
              <button 
                type="button"
                className="verify-link-btn"
                onClick={() => navigate('/verify-email', { state: { email } })}
              >
                Go to Verification
              </button>
            )}
          </div>
        )}
        {success && <div className="success-message">{success}</div>}
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="john.doe@stud.h-da.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="signup-link">
          Don't have a user? <a href="/signup">Sign up</a>
        </div>

        <div className="verify-email-link">
          Need to verify your email? <a href="/verify-email">Verify here</a>
        </div>
      </div>

      <div className='login-lostlink-container'>
        <p className='login-lostlink-text'>LostLink</p>
        <p className='login-lostlink-description'>Found the stuff you lost at h_da easily.</p>
      </div>
     
    </div>
  );
}
