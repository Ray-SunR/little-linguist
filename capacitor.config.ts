import type { CapacitorConfig } from '@capacitor/cli';
import os from 'os';

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  // Prefer standard interface names
  const preferredNames = ['en', 'eth', 'wlan'];
  const sortedNames = Object.keys(interfaces).sort((a, b) => {
    const aPref = preferredNames.some(p => a.startsWith(p));
    const bPref = preferredNames.some(p => b.startsWith(p));
    if (aPref && !bPref) return -1;
    if (!aPref && bPref) return 1;
    return a.localeCompare(b);
  });

  for (const name of sortedNames) {
    // Exclude virtual/tunnel interfaces
    if (['utun', 'vbox', 'docker', 'bridge', 'vmnet', 'lo'].some(p => name.startsWith(p))) continue;

    for (const iface of interfaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254.')) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const isDev = process.env.NODE_ENV === 'development';
const localIP = getLocalIP();

// Prioritize: Environment Variable > Auto-detected Local IP > Production URL
const serverUrl = process.env.CAPACITOR_SERVER_URL || (isDev ? `http://${localIP}:3000` : 'https://lumomind.vercel.app');

const config: CapacitorConfig = {
  appId: 'com.lumomind.app',
  appName: 'LumoMind',
  webDir: 'public',
  server: {
    url: serverUrl,
    hostname: localIP,
    androidScheme: 'https',
    allowNavigation: [localIP, 'lumomind.vercel.app', 'tawhvgzctlfavucdxwbt.supabase.co'],
    // Only allow cleartext (HTTP) for local dev URLs on private networks
    get cleartext() {
      try {
        const url = new URL(serverUrl);
        if (url.protocol !== 'http:') return false;
        const host = url.hostname;
        return (
          host === 'localhost' ||
          host === '127.0.0.1' ||
          host.startsWith('192.168.') ||
          host.startsWith('10.') ||
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) // 172.16.x.x - 172.31.x.x
        );
      } catch (e) {
        return false;
      }
    }
  },
  ios: {
    contentInset: 'always',
    allowsBackForwardNavigationGestures: true
  } as any,
  plugins: {
    Keyboard: {
      resize: 'body' as any,
      style: 'DARK' as any
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: false,
      backgroundColor: "#e8f5ff",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#8b4bff"
    }
  }
};

export default config;
