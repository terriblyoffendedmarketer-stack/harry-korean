import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yerkoreanharry.app',
  appName: 'H해 Korean Potter',
  webDir: 'out',
  server: {
    url: 'https://yer-a-korean-harry.vercel.app',
    cleartext: false
  }
};

export default config;
