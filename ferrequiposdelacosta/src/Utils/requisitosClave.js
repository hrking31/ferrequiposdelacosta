// Lo que se le exige a una contraseña (2026-10-16). Es la misma política que se
// activa en la consola de Firebase (Authentication → Configuración → Política
// de contraseñas): si se cambia allá, cambiarla acá, y al revés.
//
// Las letras son solo de la A a la Z —sin tildes ni ñ— y los signos son
// EXACTAMENTE los que Firebase cuenta como tales. Si acá se aceptara algo que
// Firebase no cuenta, se crearía una cuenta que después no podría entrar.
//
// Viaja al servidor como copia generada (ver scripts/sincronizar-calculos.js):
// createUser revisa lo mismo, por si alguien se salta el formulario.
export const LARGO_MINIMO_CLAVE = 12;

const SIGNOS = "^$*.[]{}()?\"!@#%&/\\,><':;|_~";

export const REQUISITOS_CLAVE = [
  {
    texto: `${LARGO_MINIMO_CLAVE} caracteres o más`,
    cumple: (clave) => clave.length >= LARGO_MINIMO_CLAVE,
  },
  { texto: "una mayúscula", cumple: (clave) => /[A-Z]/.test(clave) },
  { texto: "una minúscula", cumple: (clave) => /[a-z]/.test(clave) },
  { texto: "un número", cumple: (clave) => /[0-9]/.test(clave) },
  {
    texto: "un signo, como ! @ # % & * ?",
    cumple: (clave) => [...clave].some((letra) => SIGNOS.includes(letra)),
  },
];

// Lo que le falta a una contraseña, en palabras. Vacío = cumple todo.
export const faltanEnLaClave = (clave = "") =>
  REQUISITOS_CLAVE.filter(({ cumple }) => !cumple(String(clave))).map(
    ({ texto }) => texto,
  );
