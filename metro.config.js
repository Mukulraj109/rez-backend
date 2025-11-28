const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add web-specific configurations
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Add alias for web fallbacks
config.resolver.alias = {
  ...config.resolver.alias,
  'react-native-draggable-flatlist': require.resolve('./utils/webFallbacks.js'),
};

// Configure transformer for web compatibility
config.transformer = {
  ...config.transformer,
  assetPlugins: ['expo-asset/tools/hashAssetFiles'],
};

// Add resolver fields for web compatibility
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;