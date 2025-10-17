import {defineConfig} from "vite";
import react from "@vitejs/plugin-react-swc";
import checker from "vite-plugin-checker";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    checker({
      typescript: true,
      eslint: {
        useFlatConfig: true,
        lintCommand: "eslint .",
      },
    }),
  ],
  server: {
    port: 8080,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'https://plex-catalog-backend-plex-catalog.apps.okd4.csh.rit.edu',
        changeOrigin: true,
      }
    }
  }
});