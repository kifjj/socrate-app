import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,svg}']
      },
      manifest: {
        name: 'Socrate',
        short_name: 'Socrate',
        description: 'Desk writing PWA scaffold for Socrate',
        start_url: '/',
        display: 'standalone',
        background_color: '#0b1021',
        theme_color: '#0b1021'
      }
    })
  ]
});
