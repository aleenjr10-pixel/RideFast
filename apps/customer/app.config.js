module.exports = {
  expo: {
    name: 'RideFast Customer',
    slug: 'ridefast-customer',
    version: '1.0.0',
    orientation: 'portrait',
    platforms: ['ios', 'android', 'web'],
    assetBundlePatterns: ['**/*'],
    android: {
      adaptiveIcon: { backgroundColor: '#ff66ff' },
      config: {
        googleMaps: { apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY },
      },
    },
    ios: {
      supportsTablet: false,
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY,
      },
    },
  },
};
