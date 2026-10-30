import sinTildes from "../../Utils/sinTildes";

// El catálogo como lo muestra la pantalla de Equipos: por orden alfabético y,
// si hay algo escrito en el buscador, solo los que lo contienen en el nombre,
// sin tildes ni mayúsculas ("mar" encuentra MARTILLO y MEZCLADORA no; "tablon",
// el TABLÓN). Sale de la memoria: buscar no consulta la base.
export const filtrarCatalogo = (equipos, busqueda) => {
  const termino = sinTildes(busqueda.trim());
  return equipos
    .filter((equipo) => !termino || sinTildes(equipo.name).includes(termino))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
};

// EL BUSCADOR DE LA TIENDA Y DEL KIOSCO (2026-10-29): como el de Usuarios,
// sin tildes ni mayúsculas y en cualquier parte del nombre ("convencional"
// encuentra ANDAMIOS CONVENCIONALES; "tablon", el TABLÓN). Deja el orden de
// la tienda: solo quita los que no coinciden.
export const buscarEnCatalogo = (equipos, busqueda) => {
  const termino = sinTildes(busqueda.trim());
  if (!termino) return equipos;
  return equipos.filter((equipo) => sinTildes(equipo.name).includes(termino));
};

// La versión chica de una foto, para listas y tarjetas (ver
// FormularioEquipo/fotosEquipo).
export const miniaturaDe = (foto) => foto?.miniatura?.url || "";

// La portada en chico: la primera foto, la misma que muestra la tienda.
export const portadaDe = (equipo) => miniaturaDe(equipo.images?.[0]);
