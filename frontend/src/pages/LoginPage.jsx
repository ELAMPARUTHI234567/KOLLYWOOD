import React, { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authLogin } from '../services/api';
import './LoginPage.css';

// ─── Simple email format validator ────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (v) => EMAIL_RE.test(v.trim());

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from     = location.state?.from?.pathname || '/';

  // ── Form state ────────────────────────────────────────────────────────────
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPass,     setShowPass]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [errors,       setErrors]       = useState({});
  const [serverError,  setServerError]  = useState('');
  const [emailTouched, setEmailTouched] = useState(false);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const clearErrors = () => { setErrors({}); setServerError(''); };

  const handleSuccess = useCallback((token, user) => {
    localStorage.setItem('kw_token', token);
    localStorage.setItem('kw_user', JSON.stringify(user));
    navigate(from, { replace: true });
  }, [navigate, from]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();

    // Client-side validation
    const fieldErrors = {};
    if (!email.trim())             fieldErrors.email    = 'Email is required.';
    else if (!isValidEmail(email)) fieldErrors.email    = 'Please enter a valid email address.';
    if (!password)                 fieldErrors.password = 'Password is required.';
    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return; }

    setLoading(true);
    try {
      const res = await authLogin({ email: email.trim().toLowerCase(), password });
      handleSuccess(res.data.token, res.data.user);
    } catch (err) {
      setServerError(err.friendlyMessage || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="login-page">
      {/* Cinematic animated background */}
      <div className="login-bg" aria-hidden="true">
        <div className="login-bg__orb login-bg__orb--1" />
        <div className="login-bg__orb login-bg__orb--2" />
        <div className="login-bg__orb login-bg__orb--3" />
        <div className="login-bg__grid" />
      </div>

      <div className="login-container">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo__icon">🎬</div>
          <h1 className="login-title logo-text">KOLLYWOOD</h1>
          <p className="login-subtitle">Sign in to play the ultimate Kollywood trivia game</p>
        </div>

        {/* Card */}
        <div className="login-card">
          <h2 className="login-card__heading">Welcome back</h2>

          {/* Server / general error */}
          {serverError && (
            <div className="login-alert login-alert--error" role="alert" id="login-server-error">
              <span className="login-alert__icon">⚠️</span>
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate autoComplete="on" id="login-form">
            {/* Email */}
            <div className={`login-field ${errors.email ? 'login-field--error' : emailTouched && isValidEmail(email) ? 'login-field--valid' : ''}`}>
              <label className="login-field__label" htmlFor="login-email">Email</label>
              <div className="login-field__input-wrap">
                <span className="login-field__icon">✉️</span>
                <input
                  id="login-email"
                  type="email"
                  className="login-field__input"
                  placeholder="you@example.com"
                  value={email}
                  autoComplete="email"
                  onChange={(e) => { setEmail(e.target.value); clearErrors(); }}
                  onBlur={() => setEmailTouched(true)}
                  disabled={loading}
                  aria-describedby={errors.email ? 'login-email-error' : undefined}
                  aria-invalid={!!errors.email}
                />
                {emailTouched && isValidEmail(email) && !errors.email && (
                  <span className="login-field__check" aria-hidden="true">✓</span>
                )}
              </div>
              {errors.email && (
                <p className="login-field__error" id="login-email-error" role="alert">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className={`login-field ${errors.password ? 'login-field--error' : ''}`}>
              <label className="login-field__label" htmlFor="login-password">Password</label>
              <div className="login-field__input-wrap">
                <span className="login-field__icon">🔒</span>
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  className="login-field__input"
                  placeholder="Enter your password"
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => { setPassword(e.target.value); clearErrors(); }}
                  disabled={loading}
                  aria-describedby={errors.password ? 'login-password-error' : undefined}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  className="login-field__toggle"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                  id="btn-toggle-password"
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && (
                <p className="login-field__error" id="login-password-error" role="alert">{errors.password}</p>
              )}
            </div>

            {/* Login button */}
            <button
              type="submit"
              className="btn btn-purple login-submit"
              disabled={loading}
              id="btn-login-submit"
            >
              {loading ? (
                <>
                  <span className="login-spinner" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="login-register-hint">
            New here?{' '}
            <button
              className="login-link-btn"
              onClick={() => navigate('/register')}
              id="btn-goto-register"
              type="button"
            >
              Create an account
            </button>
          </p>
        </div>

        <p className="login-footer">
          &copy; {new Date().getFullYear()} Kollywood Game — &ldquo;Cinema is not just a film, it&apos;s an emotion!&rdquo;
        </p>
      </div>
    </div>
  );
}
