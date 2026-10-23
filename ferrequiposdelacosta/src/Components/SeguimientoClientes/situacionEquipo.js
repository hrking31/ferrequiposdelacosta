// LA SITUACIÓN DE UN EQUIPO EN SEGUIMIENTO —vencido, vence hoy, entrega
// indefinida, por recoger— y su color. La usan la tarjeta de cada cliente
// (ClienteSeguimientoCard) y el panel de la derecha (PanelSeguimiento), que
// pinta la historia del equipo elegido del mismo color que su recuadro: el
// mismo equipo no puede ser rojo en un lado y teal en el otro.
import {
  COLOR_ENTREGA_INDEFINIDA,
  cubiertoHasta,
  estaPorRecoger,
  sinFechaDeEntrega,
} from "../ClienteDetalle/facturaUtils";

// Una factura entra a Seguimiento cuando vence, pero adentro puede tener
// equipos en distinta situación: unos ya vencidos, otros que vencen hoy y
// otros que todavía no. Se agrupan en ese orden, con lo urgente arriba.
//
// El grupo "Vence" —los que aún están en fecha— queda vacío a propósito: esta
// pantalla solo muestra lo vencido. Se deja igual porque los grupos sin
// equipos no se dibujan, y así un equipo mal clasificado se vería en vez de
// desaparecer sin dejar rastro.
export const GRUPOS_VENCIMIENTO = [
  { clave: "hoy", titulo: "Vence hoy" },
  { clave: "vencido", titulo: "Vencido" },
  { clave: "vence", titulo: "Vence" },
  { clave: "indefinido", titulo: "Entrega indefinida" },
  // Al final: es lo menos urgente de la tarjeta. Ya no corre ni un día, solo
  // falta que el equipo llegue a la bodega.
  { clave: "porRecoger", titulo: "Por recoger" },
];

export const clasificarVencimiento = (equipo, hoy) => {
  // La entrega pactada manda sobre la fecha: ese equipo ya no vence.
  if (estaPorRecoger(equipo)) return "porRecoger";
  // Hasta cuándo está cubierto no se guarda: se encadena (ver
  // cubiertoHasta en las cuentas).
  const cubierto = cubiertoHasta(equipo);
  if (sinFechaDeEntrega(equipo) || !cubierto) return "indefinido";
  if (!hoy) return "vence";
  if (cubierto === hoy) return "hoy";
  if (cubierto < hoy) return "vencido";
  return "vence";
};

// El color de la URGENCIA: rojo lo vencido, ámbar lo que vence hoy, gris lo
// que todavía tiene plazo, teal lo de entrega indefinida. En Seguimiento eso
// importa más que de dónde vino el equipo.
export const colorDeSituacion = (theme, situacion) =>
  situacion === "vencido"
    ? theme.palette.error.main
    : situacion === "hoy"
      ? theme.palette.warning.main
      : situacion === "indefinido"
        ? COLOR_ENTREGA_INDEFINIDA
        : situacion === "porRecoger"
          ? theme.palette.custom.estadoEquipo.porRecoger
          : theme.palette.text.secondary;
