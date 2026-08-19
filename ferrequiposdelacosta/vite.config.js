/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: null,
      devOptions: {
        enabled: true,
      },
      manifest: {
        id: "/",
        name: "Ferrequipos de la Costa",
        short_name: "Ferrequipos",
        description: "Alquiler de equipos para la Construcción.",
        start_url: "/",
        display: "standalone",
        background_color: "#5C6B73",
        theme_color: "#5C6B73",
        icons: [
          {
            src: "/web-app-manifest-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/web-app-manifest-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules") && id.includes("firebase")) {
            return "firebase";
          }
          if (id.includes("node_modules") && id.includes("jspdf")) {
            return "jspdf";
          }
        },
      },
    },
  },
  // Configuración de Vitest (motor de pruebas).
  test: {
    // jsdom simula un navegador en Node para poder renderizar componentes.
    environment: "jsdom",
    // Deja usar describe/it/expect sin importarlos en cada archivo de test.
    globals: true,
    // Se ejecuta antes de cada archivo de test (carga los matchers de jest-dom).
    setupFiles: "./src/test/setup.js",
    // No procesar CSS en los tests: no aporta y los hace más lentos.
    css: false,
    // Las pruebas de pantalla dibujan formularios grandes y escriben campo por
    // campo. Con los 5 segundos que trae de fábrica, algunas fallaban por
    // tiempo al correr todas juntas —no por un error, solo por lentitud—.
    testTimeout: 20000,
  },
});
