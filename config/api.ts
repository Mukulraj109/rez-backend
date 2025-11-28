import Constants from 'expo-constants';

// Environment detection
const isDevelopment = process.env.EXPO_PUBLIC_ENVIRONMENT !== 'production';
const isProduction = process.env.EXPO_PUBLIC_ENVIRONMENT === 'production';

// API Configuration
export const API_CONFIG = {
  // Use the environment variable or fallback to the hardcoded URL
  // Replace old IP address with localhost for development
  BASE_URL: (() => {
    const url = Constants.expoConfig?.extra?.apiBaseUrl || 
                process.env.EXPO_PUBLIC_API_BASE_URL || 
                process.env.EXPO_PUBLIC_API_URL ||
                (isDevelopment ? 'http://localhost:5001/api' : 'https://api.rezmerchant.com/api');
    // Replace old IP with localhost if present
    return url.includes('172.20.10.4') ? url.replace('172.20.10.4', 'localhost') : url;
  })(),
  
  // Environment-specific URLs
  DEV_URL: process.env.EXPO_PUBLIC_DEV_API_URL || 'http://localhost:5001/api',
  PROD_URL: process.env.EXPO_PUBLIC_PROD_API_URL || 'https://api.rezmerchant.com/api',
  
  TIMEOUT: parseInt(
    Constants.expoConfig?.extra?.apiTimeout || 
    process.env.EXPO_PUBLIC_API_TIMEOUT || 
    '60000'
  ),
  
  // Socket configuration
  // Replace old IP address with localhost for development
  SOCKET_URL: (() => {
    const url = Constants.expoConfig?.extra?.socketUrl || 
                process.env.EXPO_PUBLIC_SOCKET_URL || 
                (isDevelopment ? 'http://localhost:5001' : 'https://api.rezmerchant.com');
    // Replace old IP with localhost if present
    return url.includes('172.20.10.4') ? url.replace('172.20.10.4', 'localhost') : url;
  })(),
  SOCKET_TIMEOUT: parseInt(
    Constants.expoConfig?.extra?.socketTimeout || 
    process.env.EXPO_PUBLIC_SOCKET_TIMEOUT || 
    '5000'
  ),
};

// Helper function to get the correct API URL based on environment
// If endpoint is provided, constructs the full URL; otherwise returns base URL
export const getApiUrl = (endpoint?: string): string => {
  const baseUrl = (() => {
    if (isProduction && API_CONFIG.PROD_URL) {
      return API_CONFIG.PROD_URL;
    }
    if (isDevelopment && API_CONFIG.DEV_URL) {
      return API_CONFIG.DEV_URL;
    }
    return API_CONFIG.BASE_URL;
  })();
  
  // If no endpoint provided, return base URL
  if (!endpoint) {
    return baseUrl;
  }
  
  // Otherwise, construct full URL with endpoint
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // Ensure base URL doesn't end with slash and endpoint doesn't start with slash
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  const fullUrl = `${cleanBaseUrl}/${cleanEndpoint}`;
  if (isDevelopment) {
    console.log(`🌐 [MERCHANT API] Constructed URL: ${fullUrl}`);
  }
  return fullUrl;
};

// Helper function to construct API URLs with endpoint
export const buildApiUrl = (endpoint: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // Ensure base URL doesn't end with slash and endpoint doesn't start with slash
  const baseUrl = API_CONFIG.BASE_URL.endsWith('/') 
    ? API_CONFIG.BASE_URL.slice(0, -1) 
    : API_CONFIG.BASE_URL;
  
  const fullUrl = `${baseUrl}/${cleanEndpoint}`;
  if (isDevelopment) {
    console.log(`🌐 [MERCHANT API] Constructed URL: ${fullUrl}`);
  }
  return fullUrl;
};

// Log the current configuration for debugging
if (isDevelopment) {
  console.log('🔧 [MERCHANT API] Configuration:', {
    environment: isProduction ? 'production' : 'development',
    baseUrl: API_CONFIG.BASE_URL,
    devUrl: API_CONFIG.DEV_URL,
    prodUrl: API_CONFIG.PROD_URL,
    timeout: API_CONFIG.TIMEOUT,
    socketUrl: API_CONFIG.SOCKET_URL,
    socketTimeout: API_CONFIG.SOCKET_TIMEOUT,
    resolvedUrl: getApiUrl(),
  });
}