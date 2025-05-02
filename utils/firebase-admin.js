// Mock firebase-admin implementation for development
// Replace with actual Firebase Admin SDK in production

// Create mock auth object
export const auth = {
  verifyIdToken: async (token) => {
    console.log('Development mode: Mock verifyIdToken called with token', token);
    
    // Return mock user data
    return {
      uid: 'dev-user-123',
      email: 'dev@example.com',
      email_verified: true
    };
  },
  
  getUserByEmail: async (email) => {
    console.log('Development mode: Mock getUserByEmail called with email', email);
    
    // Return mock user record
    return {
      uid: 'dev-user-123',
      email: email,
      emailVerified: true,
      displayName: 'Development User'
    };
  },
  
  setCustomUserClaims: async (uid, claims) => {
    console.log('Development mode: Mock setCustomUserClaims called with', { uid, claims });
    return Promise.resolve();
  }
};

// Create mock firestore object
export const firestore = {
  collection: (path) => {
    console.log('Development mode: Mock firestore.collection called with path', path);
    return {
      doc: (id) => ({
        get: async () => ({
          exists: true,
          data: () => ({ id, mockData: true })
        })
      })
    };
  }
};

// Create mock storage object
export const storage = {
  bucket: () => ({
    file: (path) => ({
      getSignedUrl: async () => ['https://example.com/mock-signed-url']
    })
  })
};

// Export mock admin instance
const firebaseAdmin = {
  auth: () => auth,
  firestore: () => firestore,
  storage: () => storage
};

export default firebaseAdmin; 