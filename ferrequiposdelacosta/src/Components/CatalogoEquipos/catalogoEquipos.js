// El catálogo como lo muestra la pantalla de Equipos: por orden alfabético y,
// si hay algo escrito en el buscador, solo los que lo contienen en el nombre
// ("mar" encuentra MARTILLO y MEZCLADORA no). Sale de la memoria: buscar no
// consulta la base.
export const filtrarCatalogo = (equipos, busqueda) => {
  const termino = busqueda.trim().toLowerCase();
  return equipos
    .filter((equipo) => !termino || (equipo.name || "").toLowerCase().includes(termino))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
};

// La versión chica de una foto, para listas y tarjetas (ver
// FormularioEquipo/fotosEquipo).
export const miniaturaDe = (foto) => foto?.miniatura?.url || "";

// La portada en chico: la primera foto, la misma que muestra la tienda.
export const portadaDe = (equipo) => miniaturaDe(equipo.images?.[0]);
