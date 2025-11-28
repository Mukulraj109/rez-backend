const config = {
  expo: {
    name: "Rez Merchant App",
    slug: "rez-merchant-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "rez-merchant",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#7C3AED"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.rez.merchant"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#7C3AED"
      },
      package: "com.rez.merchant"
    },
    web: {
      bundler: "metro",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-image-picker",
        {
          photosPermission: "The app accesses your photos to let you share them.",
          cameraPermission: "The app accesses your camera to let you take photos."
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5001/api',
      apiTimeout: process.env.EXPO_PUBLIC_API_TIMEOUT || '60000',
      socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:5001',
      socketTimeout: process.env.EXPO_PUBLIC_SOCKET_TIMEOUT || '5000'
    }
  }
};

export default config;