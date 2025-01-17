import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'Attendify_Project',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Permissions: {
      camera: true
    }
  }
};

export default config;