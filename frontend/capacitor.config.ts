import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.pathlegends.app',
  appName: 'PathLegends',

  // Vite build output — used as web assets in both web and Android builds
  webDir: 'dist',

  server: {
    // 'https' scheme makes the WebView origin https://localhost.
    // This is required for two reasons:
    //   1. Android CookieManager only stores Secure cookies under https
    //   2. Backend cookies are SameSite=None; Secure — need a secure context
    // The backend CORS must whitelist https://localhost (EXTRA_ORIGINS=https://localhost).
    androidScheme: 'https',
  },

  android: {
    // Log Capacitor output to Android Logcat (visible in Android Studio)
    loggingBehavior: 'debug',
  },
}

export default config
