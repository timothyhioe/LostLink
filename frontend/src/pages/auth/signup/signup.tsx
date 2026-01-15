import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './signup.css';

//auto detect API URL based on current environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const navigate = useNavigate();

  // Check for pending verification on mount
  useEffect(() => {
    const pendingEmail = localStorage.getItem('signupEmail');
    const isReturningFromSignup = localStorage.getItem('isReturningFromSignup');
    if (pendingEmail && isReturningFromSignup === 'true') {
      // Only redirect if we just came from signup, then clear the flag
      localStorage.removeItem('isReturningFromSignup');
      navigate('/verify-email', { state: { email: pendingEmail } });
    }
  }, [navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!email.endsWith('@stud.h-da.de')) {
      setError('Email must be from @stud.h-da.de domain');
      return;
    }

    setLoading(true);

    console.log('=== SIGNUP ATTEMPT ===');
    console.log('API_URL:', API_URL);
    console.log('Email:', email);
    console.log('Name:', name);

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();
      console.log('Signup response status:', response.status);
      console.log('Signup response data:', data);

      if (!response.ok) {
        setError(data.message || 'Signup failed');
        setLoading(false);
        console.log('Signup failed:', data.message);
        return;
      }

      //show success and verification form
      setSuccess('Account created! Check your email for verification code.');
      localStorage.setItem('signupEmail', email);
      localStorage.setItem('isReturningFromSignup', 'true');
      setTimeout(() => {
        navigate('/verify-email', { state: { email } });
      }, 1500);
      setLoading(false);
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Signup error:', err);
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!verificationCode) {
      setError('Verification code is required');
      return;
    }

    setVerifyLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code: verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Verification failed');
        setVerifyLoading(false);
        return;
      }

      setSuccess('Email verified successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      setError('An error occurred during verification. Please try again.');
      console.error('Verification error:', err);
      setVerifyLoading(false);
    }
  };

  if (showVerification) {
    return (
      <div className="signup-container">
        <div className="signup-box">
          <h1>Verify Email</h1>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <p className="verification-info">
            We've sent a 6-digit verification code to <strong>{email}</strong>
          </p>

          <p className="verification-dev-note">
            (In development mode: Check the backend logs or use code <strong>000000</strong> for testing)
          </p>

          <form onSubmit={handleVerifyEmail}>
            <div className="form-group">
              <label htmlFor="code">Verification Code</label>
              <input
                id="code"
                type="text"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
                disabled={verifyLoading}
              />
            </div>

            <button type="submit" disabled={verifyLoading} className="signup-btn">
              {verifyLoading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <div className="back-link">
            <button
              onClick={() => {
                setShowVerification(false);
                setVerificationCode('');
                setError('');
                setSuccess('');
              }}
              className="back-button"
            >
              Back to Signup
            </button>
          </div>
        </div>

        <div className='signup-lostlink-container'>
          <p className='signup-lostlink-text'>LostLink</p>
          <p className='signup-lostlink-description'>Found the stuff you lost at h_da easily.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-container">
      <div className="signup-box">
        <h1>Sign Up</h1>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSignup}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

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
              placeholder="Enter your password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading} className="signup-btn">
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="login-link">
          Already have an account? <a href="/login">Login here</a>
        </div>
      </div>

      <div className='signup-lostlink-container'>
        <p className='signup-lostlink-text'>LostLink</p>
        <p className='signup-lostlink-description'>Found the stuff you lost at h_da easily.</p>
      </div>
    </div>
  );
}
