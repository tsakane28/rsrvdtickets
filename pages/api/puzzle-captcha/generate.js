import { ticketRateLimiter } from '../../../middleware/rateLimit';
import crypto from 'crypto';

// Secret key for CAPTCHA token encryption
const CAPTCHA_SECRET = process.env.SESSION_SECRET || '8c14a5c7bc4dc7b624df94f93effa546';

// Available puzzles for challenge
const PUZZLES = [
  {
    // Puzzle 1
    backgroundImage: '/images/captcha/puzzle1_bg.svg',
    pieceImage: '/images/captcha/puzzle1_piece.svg',
    targetPosition: { x: 80, y: 60 },
    tolerance: 15,
  },
  {
    // Puzzle 2
    backgroundImage: '/images/captcha/puzzle2_bg.svg',
    pieceImage: '/images/captcha/puzzle2_piece.svg',
    targetPosition: { x: 120, y: 40 },
    tolerance: 15,
  },
  {
    // Puzzle 3
    backgroundImage: '/images/captcha/puzzle3_bg.svg',
    pieceImage: '/images/captcha/puzzle3_piece.svg',
    targetPosition: { x: 180, y: 90 },
    tolerance: 15,
  }
];

// Server-side puzzle generation
const handler = async (req, res) => {
  // Add CORS headers for API requests
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Special handling for OPTIONS requests (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Select a random puzzle
    const puzzleIndex = Math.floor(Math.random() * PUZZLES.length);
    const puzzle = PUZZLES[puzzleIndex];
    
    // Create a unique token for verification
    const token = generatePuzzleToken(puzzleIndex, puzzle.targetPosition);
    
    console.log('Generating puzzle CAPTCHA, index:', puzzleIndex);
    
    // Return the puzzle challenge data
    return res.status(200).json({
      success: true,
      backgroundImage: puzzle.backgroundImage,
      pieceImage: puzzle.pieceImage,
      targetArea: {
        x: puzzle.targetPosition.x,
        y: puzzle.targetPosition.y,
        tolerance: puzzle.tolerance
      },
      token: token
    });
  } catch (error) {
    console.error('Error generating puzzle CAPTCHA:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate CAPTCHA challenge'
    });
  }
};

/**
 * Generate a token containing the puzzle solution (encrypted)
 */
function generatePuzzleToken(puzzleIndex, targetPosition) {
  try {
    // Create payload with solution and expiry
    const payload = JSON.stringify({
      puzzleIndex: puzzleIndex,
      position: targetPosition,
      issued: Date.now(),
      expires: Date.now() + 10 * 60 * 1000, // 10 minutes expiry
    });

    // Create initialization vector and cipher
    const iv = crypto.randomBytes(16);
    const key = crypto.createHash('sha256').update(CAPTCHA_SECRET).digest('base64').substring(0, 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    // Encrypt the payload
    let encrypted = cipher.update(payload, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Return IV and encrypted data as token
    return `${iv.toString('base64')}:${encrypted}`;
  } catch (error) {
    console.error('Error generating puzzle token:', error);
    return null;
  }
}

// Apply rate limiting to the handler
export default ticketRateLimiter(handler); 