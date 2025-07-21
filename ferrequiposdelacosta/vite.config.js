import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
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
});
