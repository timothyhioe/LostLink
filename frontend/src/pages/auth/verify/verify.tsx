import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './verify.css';

//auto detect API URL based on current environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function VerifyEmail() {
  const location = useLocation();
  const stateEmail = location.state?.email;
  const storedEmail = typeof window !== 'undefined' ? localStorage.getItem('signupEmail') : null;
  
  const [email, setEmail] = useState<string>(() => stateEmail || storedEmail || '');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const navigate = useNavigate();

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!verificationCode) {
      setError('Verification code is required');
      return;
    }

    setLoading(true);

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
        setLoading(false);
        return;
      }

      setSuccess('Email verified successfully! Redirecting to login...');
      localStorage.removeItem('signupEmail');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      setError('An error occurred during verification. Please try again.');
      console.error('Verification error:', err);
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setSuccess('');
    setResendLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/resend-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to resend code');
        setResendLoading(false);
        return;
      }

      setSuccess('Verification code sent! Check your email.');
      setResendLoading(false);
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Resend error:', err);
      setResendLoading(false);
    }
  };

  return (
    <div className="verify-container">
      <div className="verify-box">
        <h1>Verify Email</h1>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleVerifyEmail}>
          {!email && (
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
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
          )}

          {email && (
            <p className="verification-info">
              Verification code will be sent to <strong>{email}</strong>
            </p>
          )}

          <div className="form-group">
            <label htmlFor="code">Verification Code</label>
            <input
              id="code"
              type="text"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              maxLength={6}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading} className="verify-btn">
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="resend-section">
          <p>Didn't receive the code?</p>
          <button
            type="button"
            className="resend-btn"
            onClick={handleResendCode}
            disabled={resendLoading}
          >
            {resendLoading ? 'Resending...' : 'Resend Code'}
          </button>
        </div>

        <div className="back-link">
          <a href="/login">Back to Login</a>
        </div>
      </div>

      <div className='verify-lostlink-container'>
        <p className='verify-lostlink-text'>LostLink</p>
        <p className='verify-lostlink-description'>Found the stuff you lost at h_da easily.</p>
      </div>
    </div>
  );
}
