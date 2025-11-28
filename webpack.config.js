const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');
const webpack = require('webpack');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // Add fallbacks for React Native modules that don't work on web
  config.resolve.fallback = {
    ...config.resolve.fallback,
    'react-native-reanimated': false,
    'react-native-gesture-handler': false,
    'react-native-animatable': false,
    'expo-haptics': false,
    'expo-camera': false,
    'expo-image-picker': false,
    'expo-notifications': false,
    '@react-native-community/datetimepicker': false,
    'process': require.resolve('process/browser'),
    'buffer': require.resolve('buffer'),
    'stream': require.resolve('stream-browserify'),
    'crypto': require.resolve('crypto-browserify'),
    'util': require.resolve('util'),
    'module': false,
  };

  // Configure aliases for platform-specific modules and path aliases
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native-draggable-flatlist': require.resolve('./utils/webFallbacks.js'),
    'react-native-gesture-handler': 'react-native-gesture-handler/lib/commonjs/web',
    // Add path alias support for @/* imports
    '@': path.resolve(__dirname, '.'),
  };

  // Add webpack plugins to provide global variables
  config.plugins.push(
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    })
  );

  // Set global to globalThis
  config.plugins.push(
    new webpack.DefinePlugin({
      global: 'globalThis',
    })
  );

  return config;
};