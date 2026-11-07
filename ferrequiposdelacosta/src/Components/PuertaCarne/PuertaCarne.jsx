import { useEffect, useId, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Box, useMediaQuery } from "@mui/material";
import { keyframes } from "@mui/system";
import LogoFerrequipos from "../../assets/LogoFerrequipos.svg";
import {
  ACOMODO,
  ANCHO,
  FIN,
  FIN_SALIDA,
  caidaEn,
  crearTramoSuelto,
  medidas,
  salidaEn,
  trazoTenso,
} from "./cinta";

// LA PUERTA DEL PERSONAL (2026-11-07): el inicio de sesión es un carné de
// empleado que cae colgado de su cinta. La cinta, blanca e impresa con el logo
// y FERREQUIPOS, cuelga de un gancho arriba, fuera de la pantalla: de un lado
// baja el carné, prendido con un mosquetón que entra por la ranura, y del otro
// cuelga el tramo suelto, detrás del carné. El carné baja hasta el fondo, la
// cinta lo devuelve, se mece y queda de pie; al final le pasa un brillo.
// Con "reducir movimiento" aparece quieto. El movimiento está en cinta.js.
//
// Con modo="salida" hace lo contrario (devolver el carné al terminar el
// turno): el carné aparece colgado y la cinta lo jala hacia arriba hasta
// sacarlo de la pantalla; al terminar avisa con `alTerminar`.
//
// El carné es blanco en los dos modos (es el objeto de la marca, como el
// ícono): lo que cambia de noche es el fondo. Adentro va lo que se le pase
// (el formulario de Login).

const ARRIBA = 170; // espacio sobre el carné para el mosquetón y un tramo de cinta
const CINTA_AZUL = "#283890";

const balanceo = keyframes`
  0% { transform: rotate(0); }
  18% { transform: rotate(-4deg); }
  38% { transform: rotate(2.5deg); }
  58% { transform: rotate(-1.2deg); }
  78% { transform: rotate(.5deg); }
  100% { transform: rotate(0); }
`;
const brillo = keyframes`
  0% { opacity: 0; transform: skewX(-18deg) translateX(0); }
  15% { opacity: 1; }
  85% { opacity: 1; }
  100% { opacity: 0; transform: skewX(-18deg) translateX(420%); }
`;

const NS = "http://www.w3.org/2000/svg";
const ANCHO_LOGO = 27;
const ALTO_LOGO = 32;

// El logo recortado al dibujo (el archivo trae margen alrededor).
function logoEnCinta() {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "44 0 218 259");
  svg.setAttribute("width", ANCHO_LOGO);
  svg.setAttribute("height", ALTO_LOGO);
  svg.setAttribute("overflow", "visible");
  const imagen = document.createElementNS(NS, "image");
  imagen.setAttribute("href", LogoFerrequipos);
  imagen.setAttribute("x", 0.4);
  imagen.setAttribute("y", 1);
  imagen.setAttribute("width", 316.5);
  imagen.setAttribute("height", 270);
  svg.append(imagen);
  const g = document.createElementNS(NS, "g");
  g.append(svg);
  return g;
}

// Lo impreso en la cinta: FERREQUIPOS · logo · FERREQUIPOS…, con el logo en
// el centro y el mismo espacio a cada lado (se mide la palabra ya dibujada).
// El texto sigue la curva solo; los logos se acomodan con la función que se
// devuelve, en cada cuadro.
function imprimir(camino, grupo, inicio, largo) {
  grupo.replaceChildren();
  const palabra = (s) => {
    const texto = document.createElementNS(NS, "text");
    const tp = document.createElementNS(NS, "textPath");
    texto.setAttribute("dy", 5.5);
    tp.setAttribute("href", `#${camino.id}`);
    tp.setAttribute("startOffset", s);
    tp.textContent = "FERREQUIPOS";
    texto.append(tp);
    grupo.append(texto);
    return texto;
  };
  const HUECO = 14;
  const largoPalabra = palabra(inicio).getComputedTextLength();
  const paso = largoPalabra + 2 * HUECO + ANCHO_LOGO;
  const logos = [];
  for (let s = inicio; s < largo; s += paso) {
    if (s > inicio) palabra(s);
    const logo = logoEnCinta();
    grupo.append(logo);
    logos.push([logo, s + largoPalabra + HUECO + ANCHO_LOGO / 2]);
  }
  return () => {
    const total = camino.getTotalLength();
    for (const [logo, s] of logos) {
      if (s + 1 > total) {
        logo.setAttribute("visibility", "hidden");
        continue;
      }
      const a = camino.getPointAtLength(s);
      const b = camino.getPointAtLength(s + 1);
      const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      // derecho como las letras: la C azul se lee antes de FERREQUIPOS
      logo.setAttribute(
        "transform",
        `translate(${a.x.toFixed(1)} ${a.y.toFixed(1)}) rotate(${ang.toFixed(1)}) translate(${-ANCHO_LOGO / 2} ${-ALTO_LOGO / 2})`,
      );
    }
  };
}

// Las dos telas de la cinta: borde gris y centro blanco.
const Tela = ({ href }) => (
  <>
    <use href={href} fill="none" stroke="#C3C9D5" strokeWidth={2 * ANCHO} />
    <use href={href} fill="none" stroke="#FFFFFF" strokeWidth={2 * ANCHO - 5} />
  </>
);

Tela.propTypes = { href: PropTypes.string.isRequired };

export default function PuertaCarne({ children, modo = "entrada", alTerminar }) {
  const quieto = useMediaQuery("(prefers-reduced-motion: reduce)", { noSsr: true });
  const entrada = modo === "entrada";
  const alTerminarRef = useRef(alTerminar);
  alTerminarRef.current = alTerminar;
  const [animando, setAnimando] = useState(false);
  const id = useId().replace(/:/g, "");
  const ids = { tenso: `tenso${id}`, suelto: `suelto${id}`, metal: `metal${id}`, metalAtras: `metalb${id}` };
  const escenaRef = useRef(null);
  const caidaRef = useRef(null);
  const carneRef = useRef(null);
  const tensoRef = useRef(null);
  const sueltoRef = useRef(null);
  const impresoTensoRef = useRef(null);
  const impresoSueltoRef = useRef(null);

  useEffect(() => {
    const caida = caidaRef.current;
    const tenso = tensoRef.current;
    // Sin dibujo de verdad (las pruebas) no hay cinta que mover.
    if (typeof tenso.getTotalLength !== "function") {
      caida.style.transform = "none";
      if (!entrada) alTerminarRef.current?.();
      return undefined;
    }
    const fin = entrada ? FIN : FIN_SALIDA;
    let vivo = true;
    let cuadro = 0;

    const armar = () => {
      const carne = carneRef.current;
      const suelto = sueltoRef.current;
      const alto = caida.offsetHeight;
      const m = medidas(carne.offsetWidth, carne.offsetHeight, escenaRef.current.clientWidth);
      tenso.setAttribute("d", trazoTenso(m.gx));
      imprimir(tenso, impresoTensoRef.current, 40, tenso.getTotalLength())();
      const donde = entrada ? (ms) => caidaEn(ms, alto) : (ms) => salidaEn(ms, alto);
      const forma = crearTramoSuelto(m, donde, entrada ? { acomodo: ACOMODO } : { arrastre: 0.85 });
      suelto.setAttribute("d", forma(0));
      const reimprimir = imprimir(suelto, impresoSueltoRef.current, 130, 1750);
      return (ms) => {
        caida.style.transform = `translate(${m.corrida.toFixed(1)}px, ${donde(ms).toFixed(1)}px)`;
        suelto.setAttribute("d", forma(ms));
        reimprimir();
      };
    };

    const arrancar = () => {
      if (!vivo) return;
      if (quieto && !entrada) {
        alTerminarRef.current?.();
        return;
      }
      const dibujar = armar();
      if (quieto) {
        dibujar(FIN);
        return;
      }
      if (entrada) setAnimando(true);
      const t0 = performance.now();
      const paso = (ahora) => {
        if (!vivo) return;
        const ms = ahora - t0;
        dibujar(ms);
        if (ms < fin) cuadro = requestAnimationFrame(paso);
        else if (!entrada) alTerminarRef.current?.();
      };
      dibujar(0);
      cuadro = requestAnimationFrame(paso);
    };

    // Al girar el teléfono o cambiar el ancho de la ventana, la cinta se
    // reacomoda quieta en su lugar.
    const alCambiarAncho = () => {
      if (!entrada) return;
      cancelAnimationFrame(cuadro);
      armar()(FIN);
    };

    // Se espera la letra Montserrat gruesa para medir bien la palabra de la
    // cinta (el navegador solo la baja cuando alguien la pide). Si no llega,
    // arranca igual con la que haya.
    const letra = document.fonts
      ? Promise.all([
          document.fonts.load('800 15px "Montserrat"'),
          document.fonts.load('700 17px "Montserrat"'),
        ]).catch(() => {})
      : Promise.resolve();
    letra.then(arrancar);
    window.addEventListener("resize", alCambiarAncho);
    return () => {
      vivo = false;
      cancelAnimationFrame(cuadro);
      window.removeEventListener("resize", alCambiarAncho);
    };
  }, [quieto, entrada]);

  return (
    <Box
      ref={escenaRef}
      sx={{
        minHeight: "100dvh",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 3,
        bgcolor: "background.default",
      }}
    >
      {/* Hasta que la cinta arranca, el carné espera arriba, fuera de la pantalla. */}
      <Box
        ref={caidaRef}
        style={{ transform: entrada && !quieto ? "translateY(-200vh)" : undefined }}
        sx={{ willChange: "transform" }}
      >
        <Box
          sx={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            pt: `${ARRIBA}px`,
            "& .cinta": {
              position: "absolute",
              top: ARRIBA - 870,
              left: "calc(50% - 700px)",
              width: 1400,
              height: 2300,
              overflow: "visible",
              pointerEvents: "none",
              filter: "drop-shadow(0 3px 2px rgb(0 0 0 / .28))",
            },
            "& .cinta text": {
              font: '800 15px "Montserrat", sans-serif',
              letterSpacing: ".1em",
              fill: CINTA_AZUL,
            },
          }}
        >
          {/* El tramo suelto va DETRÁS del carné: nunca lo tapa. */}
          <svg className="cinta" style={{ zIndex: 0 }} viewBox="-700 -900 1400 2300" aria-hidden="true">
            <defs>
              <path id={ids.suelto} ref={sueltoRef} d="" />
              <linearGradient id={ids.metalAtras} gradientUnits="userSpaceOnUse" x1="-14" y1="0" x2="14" y2="0">
                <stop offset="0" stopColor="#6B7280" />
                <stop offset=".45" stopColor="#C9CED8" />
                <stop offset="1" stopColor="#8A919E" />
              </linearGradient>
            </defs>
            <Tela href={`#${ids.suelto}`} />
            <g ref={impresoSueltoRef} />
            {/* La patilla de atrás del mosquetón: sale por la ranura hacia
                atrás, así el carné la tapa y solo se ve sobre su borde. */}
            <g transform="scale(1.15)" fill="none" stroke={`url(#${ids.metalAtras})`} strokeLinecap="round">
              <path d="M7 -1 C12 -16 12 -40 3 -56" strokeWidth="4.5" />
              <path d="M10.5 -33 L5 -49" stroke="#4B5260" strokeWidth="2.4" />
            </g>
          </svg>

          {/* El tramo del carné va delante y termina en el mosquetón. */}
          <svg className="cinta" style={{ zIndex: 2 }} viewBox="-700 -900 1400 2300" aria-hidden="true">
            <defs>
              <path id={ids.tenso} ref={tensoRef} d="" />
              <linearGradient id={ids.metal} gradientUnits="userSpaceOnUse" x1="-14" y1="0" x2="14" y2="0">
                <stop offset="0" stopColor="#7C8492" />
                <stop offset=".35" stopColor="#F3F5F8" />
                <stop offset=".6" stopColor="#A3AAB7" />
                <stop offset="1" stopColor="#DDE1E8" />
              </linearGradient>
            </defs>
            <Tela href={`#${ids.tenso}`} />
            <g ref={impresoTensoRef} />
            {/* Pieza negra que muerde la cinta, argolla, giratorio y la
                patilla de adelante, que entra por la ranura. */}
            <g transform="scale(1.15)" fill="none" stroke={`url(#${ids.metal})`} strokeLinecap="round">
              <path d="M-9 -93 L-9 -86 C-9 -73 9 -73 9 -86 L9 -93" strokeWidth="4.5" />
              <circle cx="0" cy="-73" r="5.5" strokeWidth="3.5" />
              <rect x="-4.5" y="-68" width="9" height="12" rx="3" fill={`url(#${ids.metal})`} stroke="none" />
              <path d="M-3 -56 C-15 -45 -14 -20 -6 -3" strokeWidth="5" />
              <path d="M-6 -3 C-4 5 5 5 7 -3" stroke="#59606C" strokeWidth="5" />
              <rect x="-24" y="-122" width="48" height="30" rx="6" fill="#1C2029" stroke="none" />
              <rect x="-20" y="-118" width="40" height="3" rx="1.5" fill="#3A404D" stroke="none" />
              <rect x="-12" y="-100" width="24" height="4" rx="2" fill="#0B0D12" stroke="none" />
            </g>
          </svg>

          <Box
            ref={carneRef}
            sx={{
              position: "relative",
              zIndex: 1,
              width: "min(330px, calc(100vw - 88px))",
              boxSizing: "border-box",
              overflow: "hidden",
              bgcolor: "#FFFFFF",
              color: "#0F172A",
              border: "3px solid #C9CEDC",
              borderRadius: "26px",
              boxShadow: "0 18px 30px rgb(15 23 42 / .22)",
              transformOrigin: "50% 30px",
              animation: animando ? `${balanceo} 1.9s 1.1s ease-out both` : "none",
              // El brillo holográfico: pasa una sola vez con el carné ya quieto.
              "&::after": {
                content: '""',
                position: "absolute",
                inset: "-20% auto -20% -60%",
                width: "45%",
                pointerEvents: "none",
                background:
                  "linear-gradient(100deg, transparent, rgb(255 255 255 / 0) 20%, rgb(180 220 255 / .55) 45%, rgb(255 200 240 / .45) 55%, transparent 80%)",
                opacity: 0,
                transform: "skewX(-18deg)",
                animation: animando ? `${brillo} 1.1s 3.4s ease-in-out both` : "none",
              },
            }}
          >
            {/* La franja roja de arriba, con la ranura del mosquetón. */}
            <Box
              sx={{
                bgcolor: "#B81D2B",
                backgroundImage:
                  "repeating-linear-gradient(135deg, rgb(255 255 255 / .06) 0 10px, transparent 10px 20px)",
                color: "#FFFFFF",
                p: "22px 16px 14px",
                display: "grid",
                justifyItems: "center",
                gap: "4px",
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 11,
                  borderRadius: "6px",
                  bgcolor: "background.default",
                  boxShadow: "inset 0 2px 3px rgb(0 0 0 / .35)",
                }}
              />
              <Box
                component="span"
                sx={{
                  font: '700 11px "Montserrat", sans-serif',
                  letterSpacing: ".22em",
                  textTransform: "uppercase",
                  mt: "4px",
                }}
              >
                Ferrequipos de la Costa
              </Box>
            </Box>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

PuertaCarne.propTypes = {
  children: PropTypes.node,
  // "entrada": el carné cae (la puerta). "salida": la cinta se lo lleva.
  modo: PropTypes.oneOf(["entrada", "salida"]),
  // Solo en la salida: se llama cuando el carné ya salió de la pantalla.
  alTerminar: PropTypes.func,
};
