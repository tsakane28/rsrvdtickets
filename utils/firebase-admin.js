import admin from 'firebase-admin';

// Check if we're already initialized to prevent multiple initializations
let firebaseAdmin;

if (!admin.apps.length) {
  // Get the service account credentials
  // If running in production, use environment variables
  // If running locally, use a service account file
  let credential;
  
  if (process.env.FIREBASE_ADMIN_CREDENTIALS) {
    // Parse the environment variable containing the service account JSON
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
      credential = admin.credential.cert(serviceAccount);
    } catch (error) {
      console.error('Error parsing FIREBASE_ADMIN_CREDENTIALS:', error);
      throw new Error('Invalid Firebase Admin credentials format');
    }
  } else {
    // Use the application default credentials
    credential = admin.credential.applicationDefault();
  }
  
  // Initialize the app with the service account
  firebaseAdmin = admin.initializeApp({
    credential,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
} else {
  // Reuse existing app if already initialized
  firebaseAdmin = admin.app();
}

// Export the admin SDK components
export const auth = firebaseAdmin.auth();
export const firestore = firebaseAdmin.firestore();
export const storage = firebaseAdmin.storage();

/**
 * Utility for verifying Firebase ID tokens
 * @param {string} token - The Firebase ID token to verify
 * @returns {Promise<Object>} - The decoded token
 */
export const verifyIdToken = async (token) => {
  try {
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    throw error;
  }
};

/**
 * Get a user from Firebase Auth by their email
 * @param {string} email - The user's email address
 * @returns {Promise<Object>} - The user record
 */
export const getUserByEmail = async (email) => {
  try {
    const userRecord = await auth.getUserByEmail(email);
    return userRecord;
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
};

/**
 * Update a user's custom claims
 * @param {string} uid - The user's UID
 * @param {Object} claims - The custom claims to set
 * @returns {Promise<void>}
 */
export const setCustomUserClaims = async (uid, claims) => {
  try {
    await auth.setCustomUserClaims(uid, claims);
  } catch (error) {
    console.error('Error setting custom user claims:', error);
    throw error;
  }
};

// Export the admin instance as a default export
export default firebaseAdmin; 