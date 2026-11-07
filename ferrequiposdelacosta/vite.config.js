/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// DOS APPS DEL MISMO CÓDIGO (2026-11-07). La tienda de los clientes y la app
// del personal comparten carpeta, piezas y datos, pero se arman y se publican
// por separado, cada una en su dirección:
//
//   tienda   → www.ferrequiposdelacosta.com       (tienda, carrito, kiosco)
//   personal → personal.ferrequiposdelacosta.com  (todo lo demás)
//
// Cuál se arma lo dice el "modo": `vite --mode personal` o
// `vite build --mode personal`. Sin modo (o con cualquier otro, como el de las
// pruebas) es la tienda. Al ser dos direcciones, el teléfono las instala como
// dos apps distintas, cada una con su nombre, su ícono y su página de arranque.
// Antes era una sola app con una puerta /acceso, y la app instalada desde ahí
// igual arrancaba en la tienda: el teléfono obedece la ficha de la app, no la
// página desde donde se instaló.
const APPS = {
  tienda: {
    entrada: "/src/mainTienda.jsx",
    titulo: "Ferrequipos de la Costa",
    puerto: 5173,
    manifest: {
      name: "Ferrequipos de la Costa",
      short_name: "Ferrequipos",
      description: "Alquiler de equipos para la Construcción.",
    },
  },
  personal: {
    entrada: "/src/mainPersonal.jsx",
    titulo: "Ferrequipos Personal",
    puerto: 5174,
    manifest: {
      name: "Ferrequipos Personal",
      short_name: "Personal",
      description: "Cotizaciones, cuentas de cobro, equipos y clientes de Ferrequipos.",
    },
  },
};

// index.html es uno solo para las dos: este paso cambia lo que va distinto
// (el programa que arranca, el título y los bloques marcados con
// `<!-- solo:tienda -->` … `<!-- /solo:tienda -->` o lo mismo con "personal").
// Corre ANTES de que Vite lea el HTML, así el programa elegido se arma como
// cualquier otro.
function elegirApp(nombre, app) {
  const otra = nombre === "tienda" ? "personal" : "tienda";
  return {
    name: "elegir-app",
    transformIndexHtml: {
      order: "pre",
      handler: (html) =>
        html
          .replace(new RegExp(`\\s*<!-- solo:${otra} -->[\\s\\S]*?<!-- /solo:${otra} -->`, "g"), "")
          .replace(/\s*<!-- \/?solo:\w+ -->/g, "")
          .replaceAll("__ENTRADA__", app.entrada)
          .replaceAll("__TITULO__", app.titulo),
    },
  };
}

export default defineConfig(({ mode }) => {
  const nombre = mode === "personal" ? "personal" : "tienda";
  const app = APPS[nombre];

  return {
    plugins: [
      elegirApp(nombre, app),
      react(),
      VitePWA({
        registerType: "prompt",
        injectRegister: null,
        devOptions: {
          enabled: true,
          // Cada app guarda su service worker de prueba en su carpeta: con
          // las dos abiertas a la vez, si no, se pisaban el archivo.
          resolveTempFolder: () => `dev-dist/${nombre}`,
        },
        workbox: {
          // El ayudante de los avisos (public/firebase-messaging-sw.js) queda
          // FUERA de la caché de la PWA. Son dos service workers distintos: si
          // este se guardara en caché, el navegador podría seguir usando una
          // versión vieja aunque se despliegue una nueva, y los avisos dejarían
          // de llegar sin que nada avise.
          // La carpeta "sin-guardar" (ver chunkFileNames, abajo) tampoco se
          // guarda en el aparato.
          globIgnores: ["**/firebase-messaging-sw.js", "**/sin-guardar/**"],
          // Las páginas de Firebase (/__/auth/action, donde se pone la clave
          // nueva o se confirma el correo) NO son de la app. Sin esto, el
          // service worker contestaba esas direcciones con la app y la página
          // salía vacía (2026-10-16, el primer cambio de clave).
          navigateFallbackDenylist: [/^\/__\//],
        },
        manifest: {
          id: "/",
          ...app.manifest,
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
    // Cada una en su puerto para poder tener las dos abiertas a la vez en el
    // PC: son direcciones distintas, igual que en internet.
    server: { port: app.puerto, strictPort: true },
    preview: { port: app.puerto, strictPort: true },
    build: {
      // Una carpeta por app: Firebase publica dist/tienda en www y
      // dist/personal en personal (ver firebase.json).
      outDir: `dist/${nombre}`,
      emptyOutDir: true,
      rollupOptions: {
        output: {
          // Los tres ayudantes que jsPDF trae para pasar una página web a PDF
          // (html2canvas, DOMPurify) y para meter dibujos SVG (canvg): unos
          // 390 KB que la app nunca usa, porque arma sus PDF con texto, tablas e
          // imágenes. jsPDF solo los pide si se usan esas funciones; van a su
          // propia carpeta para que el service worker no los guarde en cada
          // aparato (2026-11-05). Si algún día se usaran, se bajan en el momento.
          chunkFileNames(chunk) {
            const origen = chunk.facadeModuleId ?? "";
            if (/node_modules[\\/](html2canvas|dompurify|canvg)[\\/]/.test(origen)) {
              return "assets/sin-guardar/[name]-[hash].js";
            }
            return "assets/[name]-[hash].js";
          },
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
      // Como mucho 3 procesos de prueba a la vez (2026-10-22). De fábrica abre
      // uno por hilo del procesador menos uno: en este PC (16 hilos, 15 GB) eran
      // 15 navegadores simulados juntos, se acabó la memoria, se cerró VS Code y
      // después se reinició el equipo.
      maxWorkers: 3,
    },
  };
});
