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
      
      const response = await fetch(`/api/puzzle-captcha/generate?t=${Date.now()}`);
      
      if (!response.ok) {
        throw new Error('Failed to load puzzle captcha');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to generate puzzle');
      }
      
      setPuzzleData(data);
      // Reset piece position to starting position
      setPosition({ x: 0, y: 0 });
      setAttempts(0);
      
    } catch (err) {
      setError('Failed to load CAPTCHA puzzle');
      console.error(err);
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
    const containerRect = containerRef.current.getBoundingClientRect();
    const pieceRect = puzzlePieceRef.current.getBoundingClientRect();
    
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
      setError('Failed to verify puzzle solution');
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
          <div className={styles.error}>{error}</div>
        ) : (
          <>
            {/* Background puzzle image with hole */}
            <div className={styles.puzzleBackground}>
              {puzzleData && (
                <img 
                  src={puzzleData.backgroundImage} 
                  alt="Puzzle background" 
                  className={styles.puzzleImage} 
                />
              )}
            </div>
            
            {/* Draggable puzzle piece */}
            <div 
              ref={puzzlePieceRef}
              className={`${styles.puzzlePiece} ${isVerified ? styles.verified : ''} ${isDragging ? styles.dragging : ''}`}
              style={{ 
                transform: `translate(${position.x}px, ${position.y}px)`,
                backgroundImage: puzzleData ? `url(${puzzleData.pieceImage})` : 'none',
              }}
              onMouseDown={handleStart}
              onTouchStart={handleStart}
            />
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