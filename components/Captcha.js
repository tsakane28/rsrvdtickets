import { useState, useEffect, useRef } from 'react';
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
  const [debugInfo, setDebugInfo] = useState(null);
  const [svgContent, setSvgContent] = useState(null);
  const [useAltCaptcha, setUseAltCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const imgRef = useRef(null);
  const inputRef = useRef(null);

  // Function to refresh the CAPTCHA
  const refreshCaptcha = () => {
    setLoading(true);
    setSvgContent(null);
    setCaptchaToken(null);
    setTimestamp(Date.now());
    setCaptchaValue(''); // Clear the input when refreshing
    
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    
    // If we've had errors, try using the alternative CAPTCHA
    if (errorCount >= 2) {
      setUseAltCaptcha(true);
    }
  };

  // Use the token-based CAPTCHA as fallback
  const fetchAltCaptcha = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/alt-captcha?format=json&t=${Date.now()}`);
      const data = await response.json();
      
      if (data.success && data.image && data.token) {
        setSvgContent(data.image);
        setCaptchaToken(data.token);
        setLoading(false);
        setErrorCount(0);
        
        // Store debug info
        console.log('Using alternative CAPTCHA');
      } else {
        throw new Error('Failed to load alternative CAPTCHA');
      }
    } catch (error) {
      console.error('Error fetching alt CAPTCHA:', error);
      setErrorCount(prev => prev + 1);
      setLoading(false);
    }
  };

  // Get CAPTCHA using fetch instead of img tag
  const fetchCaptchaData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/captcha?format=json&t=${Date.now()}`);
      const data = await response.json();
      
      if (data.success && data.image) {
        setSvgContent(data.image);
        setLoading(false);
        setErrorCount(0);
      } else {
        throw new Error('Failed to load CAPTCHA data');
      }
    } catch (error) {
      console.error('Error fetching CAPTCHA data:', error);
      
      // Try the alt CAPTCHA if the session-based one fails
      if (!useAltCaptcha) {
        setUseAltCaptcha(true);
        fetchAltCaptcha();
      } else {
        setErrorCount(prev => prev + 1);
        setLoading(false);
      }
    }
  };

  // Handle image load complete
  const handleImageLoad = () => {
    setLoading(false);
    setErrorCount(0);
    setDebugInfo(null);
  };

  // Handle image load error
  const handleImageError = (e) => {
    console.log('CAPTCHA image load error');
    
    // Use fetch as fallback if direct image loading fails
    if (!svgContent) {
      if (useAltCaptcha) {
        fetchAltCaptcha();
      } else {
        fetchCaptchaData();
      }
    } else {
      setLoading(false);
      setErrorCount(prev => prev + 1);
    }
    
    // After multiple failures, try the alternative CAPTCHA
    if (errorCount >= 2 && !useAltCaptcha) {
      setUseAltCaptcha(true);
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const value = e.target.value;
    
    // If we're using the alternative CAPTCHA, include the token
    if (useAltCaptcha && captchaToken) {
      setCaptchaValue({
        captcha: value,
        token: captchaToken,
        isAlt: true
      });
    } else {
      setCaptchaValue(value);
    }
  };

  // Set up initial load
  useEffect(() => {
    // Determine which CAPTCHA to use
    if (useAltCaptcha) {
      fetchAltCaptcha();
    } else {
      // Try session-based CAPTCHA first
      fetch('/api/debug-session')
        .then(res => res.json())
        .catch(() => {
          // If session check fails, switch to alternative CAPTCHA
          setUseAltCaptcha(true);
          fetchAltCaptcha();
        });
    }
  }, [useAltCaptcha]);

  return (
    <div className={styles.captchaContainer}>
      <div className={styles.captchaImageContainer}>
        {loading && <div className={styles.loadingSpinner}>Loading...</div>}
        
        {!svgContent ? (
          // First try: Use img tag to load CAPTCHA
          <img 
            ref={imgRef}
            src={useAltCaptcha 
              ? `/api/alt-captcha?t=${timestamp}` 
              : `/api/captcha?t=${timestamp}`
            } 
            alt="CAPTCHA verification" 
            className={styles.captchaImage}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          // Fallback: Use inline SVG when img tag fails
          <div 
            className={styles.captchaImage} 
            dangerouslySetInnerHTML={{ __html: svgContent }} 
          />
        )}
        
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
          ref={inputRef}
          type="text"
          placeholder="Enter CAPTCHA text"
          className={styles.captchaInput}
          onChange={handleInputChange}
          required
          aria-label="CAPTCHA input"
        />
        {errorCount >= 3 && (
          <p className={styles.errorText}>
            CAPTCHA not loading correctly. Please try refreshing the page.
          </p>
        )}
        {useAltCaptcha && (
          <small className={styles.altNote}>Using alternative CAPTCHA system</small>
        )}
      </div>
    </div>
  );
};

export default Captcha; 