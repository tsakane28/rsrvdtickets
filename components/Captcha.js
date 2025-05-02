import { useState, useEffect } from 'react';
import styles from '../styles/Captcha.module.css';

/**
 * CAPTCHA component for form validation
 * @param {Object} props - Component props
 * @param {Function} props.setCaptchaValue - Called when CAPTCHA input changes
 */
const Captcha = ({ setCaptchaValue }) => {
  const [timestamp, setTimestamp] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [errorCount, setErrorCount] = useState(0);

  // Function to refresh the CAPTCHA
  const refreshCaptcha = () => {
    setLoading(true);
    setTimestamp(Date.now());
    setCaptchaValue(''); // Clear the input when refreshing
  };

  // Handle image load complete
  const handleImageLoad = () => {
    setLoading(false);
    setErrorCount(0);
  };

  // Handle image load error
  const handleImageError = () => {
    setLoading(false);
    setErrorCount(prev => prev + 1);
    
    // Try refreshing automatically if error occurs (max 3 attempts)
    if (errorCount < 3) {
      setTimeout(refreshCaptcha, 1000);
    }
  };

  // Set up initial load
  useEffect(() => {
    // Nothing special needed here, the img will load with the src provided
  }, []);

  return (
    <div className={styles.captchaContainer}>
      <div className={styles.captchaImageContainer}>
        {loading && <div className={styles.loadingSpinner}>Loading...</div>}
        <img 
          src={`/api/captcha?t=${timestamp}`} 
          alt="CAPTCHA verification" 
          className={styles.captchaImage}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
        <button 
          type="button"
          onClick={refreshCaptcha}
          className={styles.refreshButton}
          aria-label="Refresh CAPTCHA"
        >
          ↻
        </button>
      </div>
      <div className={styles.captchaInputContainer}>
        <input
          type="text"
          placeholder="Enter CAPTCHA text"
          className={styles.captchaInput}
          onChange={(e) => setCaptchaValue(e.target.value)}
          required
          aria-label="CAPTCHA input"
        />
        {errorCount >= 3 && (
          <p className={styles.errorText}>
            CAPTCHA not loading. Please try again later or contact support.
          </p>
        )}
      </div>
    </div>
  );
};

export default Captcha; 