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
// FormularioEquipo/fotosEquipo). Todas las del catálogo la tienen desde el
// 2026-10-28, pero no todas las fotos que se muestran salen de ahí: el carrito
// que un cliente dejó guardado en su teléfono recuerda la foto como era
// entonces, sin miniatura. Sin ella, la grande.
export const miniaturaDe = (foto) => foto?.miniatura?.url || foto?.url || "";

// La portada en chico: la primera foto, la misma que muestra la tienda.
export const portadaDe = (equipo) => miniaturaDe(equipo.images?.[0]);
