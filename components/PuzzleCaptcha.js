import React, { useState, useEffect, useRef } from 'react';
import styles from '../styles/PuzzleCaptcha.module.css';

const SHAPES = ['circle', 'square', 'triangle', 'diamond'];
const COLORS = ['#ff7c7c', '#74c0fc', '#63e6be', '#ffa94d', '#b197fc', '#a777e3', '#6e8efb'];

const PuzzleCaptcha = ({ onVerify, onError }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);
  const [targetShape, setTargetShape] = useState(null);
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [retries, setRetries] = useState(0);
  
  const generateCaptcha = async () => {
    setLoading(true);
    setError(null);
    setToken(null);
    setTargetShape(null);
    setOptions([]);
    setSelectedOption(null);
    setVerified(false);

    try {
      // Generate a random shape and color for the target
      const targetShapeType = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const targetColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      
      // Create random options including the correct one
      const correctIndex = Math.floor(Math.random() * 4);
      const newOptions = [];
      
      for (let i = 0; i < 4; i++) {
        if (i === correctIndex) {
          newOptions.push({
            shape: targetShapeType,
            color: targetColor,
            isCorrect: true
          });
        } else {
          // For incorrect options, always use a different shape
          let newShape;
          do {
            newShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
          } while (newShape === targetShapeType);
          
          // Use either the same color or a different one
          const useTargetColor = Math.random() > 0.5;
          let color = targetColor;
          
          if (!useTargetColor) {
            let newColor;
            do {
              newColor = COLORS[Math.floor(Math.random() * COLORS.length)];
            } while (newColor === targetColor);
            color = newColor;
          }
          
          newOptions.push({
            shape: newShape,
            color: color,
            isCorrect: false
          });
        }
      }
      
      // Create a token containing the correct index
      const tokenData = {
        correctIndex,
        timestamp: Date.now(),
      };
      
      const newToken = btoa(JSON.stringify(tokenData));
      
      setTargetShape({ shape: targetShapeType, color: targetColor });
      setOptions(newOptions);
      setToken(newToken);
      setLoading(false);
    } catch (err) {
      console.error('Error generating CAPTCHA:', err);
      setError('Failed to generate CAPTCHA. Please try again.');
      setLoading(false);
      
      if (onError) {
        onError(err);
      }
    }
  };
  
  const handleSelectOption = (index) => {
    if (verifying || verified) return;
    setSelectedOption(index);
  };
  
  const handleVerify = async () => {
    if (selectedOption === null || verifying || verified) return;
    
    setVerifying(true);
    
    try {
      // Simplify verification for demo - just check if the selected shape matches
      const selectedItem = options[selectedOption];
      const isCorrect = selectedItem && selectedItem.isCorrect;
      
      if (isCorrect) {
        setVerified(true);
        if (onVerify) {
          onVerify(token);
        }
      } else {
        setError('Incorrect selection. Please try again.');
        setTimeout(() => generateCaptcha(), 1000);
      }
    } catch (err) {
      console.error('Error verifying CAPTCHA:', err);
      setError('Failed to verify CAPTCHA. Please try again.');
      
      if (onError) {
        onError(err);
      }
    } finally {
      setVerifying(false);
    }
  };
  
  const handleRetry = () => {
    setRetries(retries + 1);
    generateCaptcha();
  };
  
  // Initialize on mount
  useEffect(() => {
    generateCaptcha();
  }, []);
  
  // Report errors to parent
  useEffect(() => {
    if (error && onError) {
      onError(new Error(error));
    }
  }, [error, onError]);
  
  if (loading) {
    return (
      <div className={styles.captchaContainer}>
        <div className={styles.captchaHeader}>
          <h3 className={styles.captchaTitle}>Security Check</h3>
        </div>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading security check...</p>
        </div>
      </div>
    );
  }
  
  if (error && !targetShape) {
    return (
      <div className={styles.captchaContainer}>
        <div className={styles.captchaHeader}>
          <h3 className={styles.captchaTitle}>Security Check</h3>
        </div>
        <div className={styles.error}>
          <p>{error}</p>
          <button className={styles.retryButton} onClick={handleRetry}>
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.captchaContainer}>
      <div className={styles.captchaHeader}>
        <h3 className={styles.captchaTitle}>Security Check</h3>
        <button 
          className={styles.refreshButton} 
          onClick={generateCaptcha}
          disabled={verifying || loading}
          aria-label="Refresh CAPTCHA"
        >
          ↻
        </button>
      </div>
      
      <div className={styles.captchaBody}>
        <div className={styles.captchaQuestion}>
          <p>Select the shape that matches this one:</p>
          <div className={styles.targetShape}>
            {targetShape && (
              <div 
                className={styles.shape} 
                style={{
                  backgroundColor: targetShape.color
                }}
                data-shape={targetShape.shape}
              />
            )}
          </div>
        </div>
        
        <div className={styles.shapeOptions}>
          {options.map((option, index) => (
            <button
              key={index}
              className={`${styles.shapeOption} ${selectedOption === index ? styles.selected : ''}`}
              onClick={() => handleSelectOption(index)}
              disabled={verifying || verified}
              aria-label={`Shape option ${index + 1}`}
            >
              <div 
                className={styles.shape} 
                style={{
                  backgroundColor: option.color
                }}
                data-shape={option.shape}
              />
            </button>
          ))}
        </div>
        
        <button
          className={styles.verifyButton}
          onClick={handleVerify}
          disabled={selectedOption === null || verifying || verified}
        >
          {verifying ? 'Verifying...' : verified ? 'Verified' : 'Verify'}
        </button>
      </div>
      
      {verified && (
        <div className={styles.successMessage}>
          <svg className={styles.checkIcon} viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
          <span>Verification successful</span>
        </div>
      )}
    </div>
  );
};

export default PuzzleCaptcha; 