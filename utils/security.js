import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import { auth } from './firebase';
import { onAuthStateChanged } from "firebase/auth";
import Joi from 'joi';

/**
 * Generate a secure ID using UUID
 * @returns {string} - A 8-character unique ID
 */
export const generateID = () => uuidv4().substring(0, 8);

/**
 * Schema for validating ticket requests
 */
export const ticketSchema = Joi.object({
  ticketId: Joi.string().required().pattern(/^[a-zA-Z0-9-]{8,36}$/),
  eventId: Joi.string().optional().pattern(/^[a-zA-Z0-9-]{20,36}$/)
});

/**
 * Validates a Paynow payment signature
 * @param {Object} payload - The payload to validate
 * @param {string} signature - The signature to validate against
 * @param {string} integrationKey - The integration key to use for validation
 * @returns {boolean} - Whether the signature is valid
 */
export const validatePaynowSignature = (payload, signature, integrationKey) => {
  // Sort params alphabetically as Paynow does
  const paramString = Object.keys(payload)
    .filter(key => key !== 'hash')
    .sort()
    .map(key => `${key}=${payload[key]}`)
    .join('&');
  
  // Add the integration key
  const dataToHash = paramString + integrationKey;
  
  // Create hash using SHA-512
  const calculatedHash = crypto
    .createHash('sha512')
    .update(dataToHash)
    .digest('hex')
    .toLowerCase();
  
  // Compare with provided hash (case-insensitive)
  return calculatedHash === signature.toLowerCase();
};

/**
 * Encryption and decryption utilities
 */
export const encryption = (() => {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes key in .env.local
  const IV_LENGTH = 16; // AES block size

  return {
    encrypt: (text) => {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
      let encrypted = cipher.update(text);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      return iv.toString('hex') + ':' + encrypted.toString('hex');
    },
    
    decrypt: (text) => {
      const parts = text.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = Buffer.from(parts[1], 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    }
  };
})();

/**
 * CSRF protection utilities
 */
export const csrf = {
  generateToken: () => {
    return randomBytes(32).toString('hex');
  },
  
  setCookie: (res, token) => {
    res.setHeader('Set-Cookie', `csrfToken=${token}; Path=/; HttpOnly; SameSite=Strict; Secure`);
  },
  
  validate: (req) => {
    const cookieToken = req.cookies.csrfToken;
    const bodyToken = req.body.csrfToken;
    
    if (!cookieToken || !bodyToken || cookieToken !== bodyToken) {
      return false;
    }
    return true;
  }
};

/**
 * Session timeout management
 */
export const initSessionTimeout = () => {
  let inactivityTimer;
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  
  // Reset timer on user activity
  const resetTimer = () => {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(logoutDueToInactivity, SESSION_TIMEOUT);
  };
  
  // Logout function
  const logoutDueToInactivity = () => {
    auth.signOut()
      .then(() => {
        window.location.href = '/login?timeout=true';
      })
      .catch(error => {
        console.error("Error signing out:", error);
      });
  };
  
  // Set up event listeners for user activity
  const setupActivityListeners = () => {
    ['mousedown', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      window.addEventListener(event, resetTimer, false);
    });
  };
  
  // Initialize session monitoring
  onAuthStateChanged(auth, (user) => {
    if (user) {
      resetTimer();
      setupActivityListeners();
    } else {
      clearTimeout(inactivityTimer);
    }
  });
}; 