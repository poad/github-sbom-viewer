/// <reference types="vitest" />
/// <reference types="vite/client" />

import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import pages from 'vite-plugin-pages';

export default defineConfig({
  plugins: [pages({
    extensions: ['tsx', 'jsx'],
    importMode: 'async',
  }), solidPlugin()],
  server: {
    headers: {
      'Content-Security-Policy': [
        'default-src \'self\'',
        'frame-ancestors \'self\'',
        'img-src \'self\' data: https:',
        'script-src \'self\' \'unsafe-inline\' \'unsafe-eval\'',
        'style-src \'self\' \'unsafe-inline\'',
      ].join('; '),
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (_, req) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    testTransformMode: {
      web: ['*.[jt]sx?'],
    },
    setupFiles: './setupVitest.ts',
    // solid needs to be inline to work around
    // a resolution issue in vitest:
    deps: {
      inline: [/solid-js/],
    },
    // if you have few tests, try commenting one
    // or both out to improve performance:
    isolate: false,
  },
  build: {
    target: 'esnext',
  },
  resolve: {
    conditions: ['development', 'browser'],
  },
});
