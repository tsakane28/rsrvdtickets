import crypto from 'crypto';

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