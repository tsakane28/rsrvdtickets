import React, { useState, useEffect, useRef } from 'react';
import styles from '../styles/PuzzleCaptcha.module.css';

const PuzzleCaptcha = ({ onVerify }) => {
  const [loading, setLoading] = useState(true);
  const [puzzleData, setPuzzleData] = useState(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  
  const puzzlePieceRef = useRef(null);
  const containerRef = useRef(null);
  
  // Load puzzle on component mount
  useEffect(() => {
    loadPuzzle();
  }, []);
  
  // Load a new puzzle challenge
  const loadPuzzle = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsVerified(false);
      
      const timestamp = Date.now();
      const response = await fetch(`/api/puzzle-captcha/generate?t=${timestamp}`);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Puzzle loading error:', response.status, errorData);
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to generate puzzle');
      }
      
      console.log('Puzzle loaded successfully');
      setPuzzleData(data);
      // Reset piece position to starting position
      setPosition({ x: 0, y: 0 });
      setAttempts(0);
      
    } catch (err) {
      console.error('Failed to load CAPTCHA puzzle:', err);
      setError(`Failed to load CAPTCHA: ${err.message}. Retry ${retryCount+1}/3`);
      
      // Retry loading up to 3 times with increasing delays
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount(retryCount + 1);
          loadPuzzle();
        }, 1000 * (retryCount + 1)); // Progressive backoff
      } else {
        setError('Unable to load CAPTCHA. Please reload the page or try again later.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Handle mouse/touch down to start dragging
  const handleStart = (e) => {
    if (isVerified) return;
    
    // Prevent default behavior
    e.preventDefault();
    
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    
    setIsDragging(true);
    setStartPos({
      x: clientX - position.x,
      y: clientY - position.y
    });
  };
  
  // Handle mouse/touch move while dragging
  const handleMove = (e) => {
    if (!isDragging || isVerified) return;
    
    // Get position from mouse or touch
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    
    // Calculate new position
    const newX = clientX - startPos.x;
    const newY = clientY - startPos.y;
    
    // Get container bounds
    const containerRect = containerRef.current?.getBoundingClientRect() || { width: 300, height: 160 };
    const pieceRect = puzzlePieceRef.current?.getBoundingClientRect() || { width: 48, height: 48 };
    
    // Ensure the piece stays within the container
    const maxX = containerRect.width - pieceRect.width;
    const maxY = containerRect.height - pieceRect.height;
    
    // Update position with constraints
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };
  
  // Handle mouse/touch up to end dragging
  const handleEnd = () => {
    if (!isDragging || isVerified) return;
    
    setIsDragging(false);
    
    // Verify if the piece is in the correct position
    if (puzzleData && puzzleData.targetArea) {
      const { x, y } = position;
      const { x: targetX, y: targetY, tolerance } = puzzleData.targetArea;
      
      const isCorrect = 
        Math.abs(x - targetX) <= tolerance && 
        Math.abs(y - targetY) <= tolerance;
      
      if (isCorrect) {
        verifyPuzzle();
      } else {
        // Increment attempts counter
        setAttempts(attempts + 1);
        
        // After 3 failed attempts, reset the puzzle
        if (attempts >= 2) {
          loadPuzzle();
        }
      }
    }
  };
  
  // Send verification to the server
  const verifyPuzzle = async () => {
    try {
      if (!puzzleData || !puzzleData.token) {
        throw new Error('Invalid puzzle data');
      }
      
      setLoading(true);
      
      const response = await fetch('/api/puzzle-captcha/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: puzzleData.token,
          position: position
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Verification error:', response.status, errorText);
        throw new Error(`Server verification error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setIsVerified(true);
        onVerify(true);
      } else {
        setError(data.message || 'Verification failed');
        loadPuzzle(); // Load a new puzzle if verification fails
      }
      
    } catch (err) {
      console.error('Verification error:', err);
      setError('Failed to verify puzzle solution. Please try again.');
      // Reload the puzzle after a brief delay
      setTimeout(loadPuzzle, 1500);
    } finally {
      setLoading(false);
    }
  };
  
  // Add global mouse/touch event listeners when dragging
  useEffect(() => {
    if (isDragging) {
      // Use document for mouse events to capture movement outside the component
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleMove);
      document.addEventListener('touchend', handleEnd);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, position, startPos]);
  
  return (
    <div className={styles.puzzleCaptchaContainer}>
      <div className={styles.puzzleHeader}>
        <h3 className={styles.puzzleTitle}>Verify you're human</h3>
        <button 
          type="button" 
          className={styles.refreshButton}
          onClick={loadPuzzle}
          disabled={loading}
        >
          ↻
        </button>
      </div>
      
      <div 
        ref={containerRef}
        className={styles.puzzleContainer}
      >
        {loading ? (
          <div className={styles.loading}>Loading puzzle...</div>
        ) : error ? (
          <div className={styles.error}>
            {error}
            <button 
              className={styles.retryButton} 
              onClick={() => {
                setRetryCount(0);
                loadPuzzle();
              }}
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {/* Background puzzle image with hole */}
            <div className={styles.puzzleBackground}>
              {puzzleData && puzzleData.backgroundImage && (
                <img 
                  src={puzzleData.backgroundImage} 
                  alt="Puzzle background" 
                  className={styles.puzzleImage}
                  onError={(e) => {
                    console.error('Background image failed to load:', e);
                    setError('Failed to load puzzle images');
                  }}
                />
              )}
            </div>
            
            {/* Draggable puzzle piece */}
            {puzzleData && puzzleData.pieceImage && (
              <div 
                ref={puzzlePieceRef}
                className={`${styles.puzzlePiece} ${isVerified ? styles.verified : ''} ${isDragging ? styles.dragging : ''}`}
                style={{ 
                  transform: `translate(${position.x}px, ${position.y}px)`,
                  backgroundImage: `url(${puzzleData.pieceImage})`,
                }}
                onMouseDown={handleStart}
                onTouchStart={handleStart}
              />
            )}
          </>
        )}
      </div>
      
      <div className={styles.puzzleFooter}>
        {isVerified ? (
          <div className={styles.verifiedMessage}>✓ Verified</div>
        ) : (
          <div className={styles.instructions}>
            Drag the puzzle piece to fit in the image
          </div>
        )}
      </div>
    </div>
  );
};

export default PuzzleCaptcha; 