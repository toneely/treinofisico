import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { htmlPrerender } from 'vite-plugin-html-prerender'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    htmlPrerender({
      staticDir: path.join(__dirname, 'dist'),
      routes: ['/', '/privacy', '/terms'],
      selector: '#main-content',
      minify: {
        collapseBooleanAttributes: true,
        collapseWhitespace: true,
        decodeEntities: true,
        keepClosingSlash: true,
        sortAttributes: true
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: '/',
})