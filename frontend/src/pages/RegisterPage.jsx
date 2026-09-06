import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authRegister } from '../services/api';
import './LoginPage.css'; /* reuse the same stylesheet */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (v) => EMAIL_RE.test(v.trim());

export default function RegisterPage() {
  const navigate = useNavigate();

  const [displayName,  setDisplayName]  = useState('');
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [confirmPass,  setConfirmPass]  = useState('');
  const [showPass,     setShowPass]     = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [errors,       setErrors]       = useState({});
  const [serverError,  setServerError]  = useState('');
  const [emailTouched, setEmailTouched] = useState(false);

  const clearErrors = () => { setErrors({}); setServerError(''); };

  const handleSuccess = useCallback((token, user) => {
    localStorage.setItem('kw_token', token);
    localStorage.setItem('kw_user', JSON.stringify(user));
    navigate('/', { replace: true });
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();

    const fieldErrors = {};
    if (!displayName.trim())
      fieldErrors.displayName = 'A name is required.';
    if (!email.trim())
      fieldErrors.email = 'Email is required.';
    else if (!isValidEmail(email))
      fieldErrors.email = 'Please enter a valid email address.';
    if (!password || password.length < 6)
      fieldErrors.password = 'Password must be at least 6 characters.';
    if (!confirmPass)
      fieldErrors.confirmPass = 'Please confirm your password.';
    else if (password !== confirmPass)
      fieldErrors.confirmPass = 'Passwords do not match.';

    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return; }

    setLoading(true);
    try {
      const res = await authRegister({
        display_name: displayName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      handleSuccess(res.data.token, res.data.user);
    } catch (err) {
      setServerError(err.friendlyMessage || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg" aria-hidden="true">
        <div className="login-bg__orb login-bg__orb--1" />
        <div className="login-bg__orb login-bg__orb--2" />
        <div className="login-bg__orb login-bg__orb--3" />
        <div className="login-bg__grid" />
      </div>

      <div className="login-container">
        <div className="login-logo">
          <div className="login-logo__icon">🎬</div>
          <h1 className="login-title logo-text">KOLLYWOOD</h1>
          <p className="login-subtitle">Create your account and start playing!</p>
        </div>

        <div className="login-card">
          <h2 className="login-card__heading">Create account</h2>

          {serverError && (
            <div className="login-alert login-alert--error" role="alert" id="register-server-error">
              <span className="login-alert__icon">⚠️</span>
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate autoComplete="on" id="register-form">

            {/* Name */}
            <div className={`login-field ${errors.displayName ? 'login-field--error' : ''}`}>
              <label className="login-field__label" htmlFor="register-name">Name</label>
              <div className="login-field__input-wrap">
                <span className="login-field__icon">👤</span>
                <input
                  id="register-name"
                  type="text"
                  className="login-field__input"
                  placeholder="Your name in the game"
                  value={displayName}
                  autoComplete="name"
                  onChange={(e) => { setDisplayName(e.target.value); clearErrors(); }}
                  disabled={loading}
                  aria-invalid={!!errors.displayName}
                />
              </div>
              {errors.displayName && (
                <p className="login-field__error" role="alert">{errors.displayName}</p>
              )}
            </div>

            {/* Email */}
            <div className={`login-field ${errors.email ? 'login-field--error' : emailTouched && isValidEmail(email) ? 'login-field--valid' : ''}`}>
              <label className="login-field__label" htmlFor="register-email">Email</label>
              <div className="login-field__input-wrap">
                <span className="login-field__icon">✉️</span>
                <input
                  id="register-email"
                  type="email"
                  className="login-field__input"
                  placeholder="you@example.com"
                  value={email}
                  autoComplete="email"
                  onChange={(e) => { setEmail(e.target.value); clearErrors(); }}
                  onBlur={() => setEmailTouched(true)}
                  disabled={loading}
                  aria-invalid={!!errors.email}
                />
                {emailTouched && isValidEmail(email) && !errors.email && (
                  <span className="login-field__check" aria-hidden="true">✓</span>
                )}
              </div>
              {errors.email && (
                <p className="login-field__error" role="alert">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className={`login-field ${errors.password ? 'login-field--error' : ''}`}>
              <label className="login-field__label" htmlFor="register-password">Password</label>
              <div className="login-field__input-wrap">
                <span className="login-field__icon">🔒</span>
                <input
                  id="register-password"
                  type={showPass ? 'text' : 'password'}
                  className="login-field__input"
                  placeholder="At least 6 characters"
                  value={password}
                  autoComplete="new-password"
                  onChange={(e) => { setPassword(e.target.value); clearErrors(); }}
                  disabled={loading}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  className="login-field__toggle"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                  id="btn-toggle-register-password"
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && (
                <p className="login-field__error" role="alert">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className={`login-field ${errors.confirmPass ? 'login-field--error' : ''}`}>
              <label className="login-field__label" htmlFor="register-confirm-password">Confirm Password</label>
              <div className="login-field__input-wrap">
                <span className="login-field__icon">🔒</span>
                <input
                  id="register-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  className="login-field__input"
                  placeholder="Re-enter your password"
                  value={confirmPass}
                  autoComplete="new-password"
                  onChange={(e) => { setConfirmPass(e.target.value); clearErrors(); }}
                  disabled={loading}
                  aria-invalid={!!errors.confirmPass}
                />
                <button
                  type="button"
                  className="login-field__toggle"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                  id="btn-toggle-confirm-password"
                >
                  {showConfirm ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.confirmPass && (
                <p className="login-field__error" role="alert">{errors.confirmPass}</p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-purple login-submit"
              disabled={loading}
              id="btn-register-submit"
            >
              {loading ? (
                <><span className="login-spinner" aria-hidden="true" />Creating account…</>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="login-register-hint">
            Already have an account?{' '}
            <button
              className="login-link-btn"
              onClick={() => navigate('/login')}
              id="btn-goto-login"
              type="button"
            >
              Sign in
            </button>
          </p>
        </div>

        <p className="login-footer">
          &copy; {new Date().getFullYear()} Kollywood Game
        </p>
      </div>
    </div>
  );
}
