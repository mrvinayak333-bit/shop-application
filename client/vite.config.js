import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';

const useHttps = process.env.VITE_HTTPS === 'true' || process.env.USE_HTTPS === 'true';
const serverHttps = useHttps
  ? process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH && fs.existsSync(process.env.SSL_KEY_PATH) && fs.existsSync(process.env.SSL_CERT_PATH)
    ? { key: fs.readFileSync(process.env.SSL_KEY_PATH), cert: fs.readFileSync(process.env.SSL_CERT_PATH) }
    : true
  : false;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'SHREE RAAM MOBILE',
        short_name: 'SRM',
        description: 'Mobile Repair Tracking System',
        theme_color: '#166534',
        background_color: '#f9fafb',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }, { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }]
      },
      workbox: { runtimeCaching: [{ urlPattern: /^https:\/\/fonts\.googleapis\.com\//, handler: 'StaleWhileRevalidate', options: { cacheName: 'google-fonts-stylesheets' } }] }
    })
  ],
  server: {
    host: '0.0.0.0',
    https: serverHttps,
    watch: {
      // Ignore Android native build output to avoid EBUSY file-lock errors
      ignored: ['android/**', '**/android/**/build/**']
    }
  }
});
