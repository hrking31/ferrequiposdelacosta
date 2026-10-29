import RolesPermisos from "../RolesPermisos/RolesPermisos";

// LO QUE COMPARTEN LAS PIEZAS DE LA PANTALLA DE USUARIOS (2026-10-28).

// Los cuatro roles, en el orden en que se ofrecen, con lo que hacen en
// palabras. Los permisos de cada uno salen de RolesPermisos.
export const ROLES = [
  {
    clave: "administrador",
    nombre: "Administrador",
    descripcion: "Acceso total, incluida la gestión de usuarios.",
  },
  {
    clave: "gestorFacturacion",
    nombre: "Gestor Facturación",
    descripcion: "Cotizaciones, cuentas de cobro y cartera.",
  },
  {
    clave: "gestorEditor",
    nombre: "Gestor Editor",
    descripcion: "Crea, edita y elimina equipos del catálogo.",
  },
  {
    clave: "gestorIntegral",
    nombre: "Gestor Integral",
    descripcion: "Gestor Editor y Gestor Facturación.",
  },
];

export const rolDe = (clave) => ROLES.find((rol) => rol.clave === clave) || null;

export const nombreDelRol = (clave) => rolDe(clave)?.nombre || "Sin rol";

export const permisosDelRol = (clave) => RolesPermisos[clave] || [];

// "Laura Martínez" → "LM". Sin nombre, la primera letra del correo.
export const iniciales = (nombre = "", correo = "") => {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return (correo.charAt(0) || "?").toUpperCase();
  return (partes[0][0] + (partes[1]?.[0] || "")).toUpperCase();
};

// Cuánto hace que se desconectó, corto, para la lista: "hace 3 h".
const haceCuanto = (momento, ahora = Date.now()) => {
  const minutos = Math.floor((ahora - momento) / 60000);
  if (minutos < 1) return "hace un momento";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "ayer" : `hace ${dias} días`;
};

// En línea o desde cuándo no, a partir de la presencia (usuariosConectados).
// `corto` va en la lista; `largo`, en la ficha.
export const estadoConexion = (presencia, genero) => {
  if (presencia?.online) return { enLinea: true, corto: "En línea", largo: "En línea ahora" };
  if (!presencia?.timestamp) return { enLinea: false, corto: "", largo: "Sin conexión reciente" };
  const hace = haceCuanto(presencia.timestamp);
  const desconectado = genero === "femenino" ? "Desconectada" : "Desconectado";
  return { enLinea: false, corto: hace, largo: `${desconectado} · ${hace}` };
};

// Sin tildes ni mayúsculas, para que "martinez" encuentre a Martínez.
const sinTildes = (texto = "") =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// La lista como la muestra la pantalla: por orden alfabético y, si hay algo
// escrito en el buscador, solo quien lo tenga en el nombre, el correo o el rol.
export const filtrarUsuarios = (usuarios, busqueda) => {
  const termino = sinTildes(busqueda.trim());
  return usuarios
    .filter(
      (usuario) =>
        !termino ||
        [usuario.name, usuario.email, nombreDelRol(usuario.role)].some((campo) =>
          sinTildes(campo).includes(termino),
        ),
    )
    .sort((a, b) => (a.name || a.email || "").localeCompare(b.name || b.email || ""));
};

// UNA CONTRASEÑA GENERADA que cumple los requisitos (ver requisitosClave):
// una palabra del negocio, un signo, un color y tres números, como
// "Andamio#Verde482". Larga y fácil de dictar. Solo signos que Firebase
// cuenta como tales (por eso no lleva guion).
const PALABRAS = [
  "Taladro", "Andamio", "Pulidora", "Mezcladora", "Compresor",
  "Martillo", "Formaleta", "Vibrador", "Cortadora", "Planta",
];
const COLORES = ["Rojo", "Azul", "Verde", "Negro", "Gris", "Dorado"];
const SIGNOS = "#!@%&*?";

const alAzar = (cuantos) => {
  const numeros = new Uint32Array(1);
  globalThis.crypto.getRandomValues(numeros);
  return numeros[0] % cuantos;
};

export const generarClave = () =>
  PALABRAS[alAzar(PALABRAS.length)] +
  SIGNOS[alAzar(SIGNOS.length)] +
  COLORES[alAzar(COLORES.length)] +
  String(alAzar(900) + 100);
