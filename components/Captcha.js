import { useState, useEffect, useRef } from 'react';

/**
 * CAPTCHA component for form validation
 * @param {Object} props - Component props
 * @param {Function} props.onChange - Called when CAPTCHA input changes
 * @param {boolean} props.required - Whether CAPTCHA is required
 */
const Captcha = ({ onChange, required = true }) => {
  const [captchaUrl, setCaptchaUrl] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const captchaRef = useRef(null);

  // Load the CAPTCHA image
  const loadCaptcha = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Append timestamp to prevent caching
      const timestamp = new Date().getTime();
      setCaptchaUrl(`/api/captcha?t=${timestamp}`);
      
      setInputValue('');
      if (onChange) onChange('');
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading CAPTCHA:', error);
      setError('Failed to load CAPTCHA');
      setIsLoading(false);
    }
  };

  // Initialize CAPTCHA on component mount
  useEffect(() => {
    loadCaptcha();
  }, []);

  // Handle input change
  const handleChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    if (onChange) onChange(value);
  };

  // Handle refresh button click
  const handleRefresh = () => {
    loadCaptcha();
  };

  return (
    <div className="w-full space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Verification Code {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="flex items-center space-x-4">
        {/* CAPTCHA Image */}
        <div className="relative rounded border border-gray-300 overflow-hidden bg-gray-50 h-16 w-48 flex items-center justify-center">
          {isLoading ? (
            <div className="animate-pulse">Loading...</div>
          ) : error ? (
            <div className="text-red-500 text-sm text-center">{error}</div>
          ) : (
            <img 
              src={captchaUrl} 
              alt="CAPTCHA" 
              className="h-full w-full object-contain" 
              ref={captchaRef}
            />
          )}
        </div>
        
        {/* Refresh button */}
        <button
          type="button"
          onClick={handleRefresh}
          className="p-2 bg-gray-200 hover:bg-gray-300 rounded"
          aria-label="Refresh CAPTCHA"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
        </button>
      </div>
      
      {/* Input field */}
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder="Enter the code shown above"
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        required={required}
        aria-label="CAPTCHA verification code"
      />
      
      <p className="text-xs text-gray-500">
        Enter the characters shown in the image above.
      </p>
    </div>
  );
};

export default Captcha; 