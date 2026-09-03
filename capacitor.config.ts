import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vitaltrack.ai',
  appName: 'VitalTrack AI',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
