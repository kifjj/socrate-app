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
        background_color: '#F7F6F3',
        theme_color: '#2D333B'
      }
    })
  ]
});
