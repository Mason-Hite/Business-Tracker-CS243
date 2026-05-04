/**
 * This file is the Vite configuration file for the frontend part of the application.
 * Vite is a modern build tool designed to provide a fast and lean development experience
 * for web projects, particularly those using modern JavaScript frameworks like React.
 *
 * The purpose of this file is to configure various aspects of the Vite build process,
 * including plugin integration, development server settings, proxy configurations for API calls,
 * build output specifications, and path resolution aliases.
 *
 * Key functionalities configured here:
 * - Integration with React via the @vitejs/plugin-react plugin.
 * - Development server setup on port 3000 with proxy for '/api' routes to localhost:5000.
 * - Build output directed to the 'dist' directory.
 * - Alias '@' set to point to the './src' directory for cleaner import paths.
 *
 * This configuration ensures seamless development and building of the React frontend,
 * allowing for efficient hot module replacement, optimized bundling, and easy integration
 * with a backend API server.
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // Plugins array: Includes the React plugin to enable JSX transformation and React-specific features in Vite.
  plugins: [react()],
  // Server configuration: Defines settings for the development server.
  // Port 3000 is used for the frontend dev server.
  // Proxy configuration routes API requests starting with '/api' to the backend server at localhost:5000,
  // enabling cross-origin requests during development.
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  // Build configuration: Specifies the output directory for the production build.
  // The 'dist' directory will contain the bundled and optimized assets after running the build command.
  build: {
    outDir: 'dist',
  },
  // Resolve configuration: Sets up path aliases for easier module resolution.
  // The '@' alias points to the './src' directory, allowing imports like '@/components/Component'
  // instead of relative paths like '../../../components/Component'.
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})