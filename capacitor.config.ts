import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lumomind.app',
  appName: 'LumoMind',
  webDir: 'public',
  server: {
    url: 'https://lumomind.vercel.app',
    cleartext: true
  },
  ios: {
    contentInset: 'always'
  }
};

export default config;
