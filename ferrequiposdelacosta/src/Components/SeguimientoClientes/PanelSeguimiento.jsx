import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Box, Chip, Stack, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useDispatch, useSelector } from "react-redux";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import TimelineIcon from "@mui/icons-material/Timeline";
import KpiCard from "../KpiCard/KpiCard";
import PanelDocumentos from "../PanelLista/PanelDocumentos";
import ResumenLista, { TituloSeccion } from "../PanelLista/ResumenLista";
import { GRUPOS_VENCIMIENTO, clasificarVencimiento, colorDeSituacion } from "./situacionEquipo";
import HistorialEquipo from "../ClienteDetalle/HistorialEquipo";
import { EncabezadoHistoria } from "./HistorialEquipoDialog";
import { leerTotalesPanel } from "../../Views/AdminForms/totalesPanelDb";
import { setKpis } from "../../Store/Slices/kpisSlice";
import { formatearMoneda } from "../../Utils/formato";

// Los estados de factura que deben plata, del más urgente al menos. Los mismos
// del detalle del menú (ver DetallePagosPendientes).
const ESTADOS_PAGO = [
  { estado: "vencida", label: "Vencidas" },
  { estado: "cobro", label: "En cobro" },
  { estado: "activa", label: "Activas" },
  { estado: "pendiente", label: "Sin despachar" },
];

// LA COLUMNA DE LA DERECHA DE SEGUIMIENTO, solo en computador: arriba los dos
// números del menú —equipos afuera y plata por cobrar— y abajo un recuadro que
// muestra, según lo último que se tocó, la historia del equipo elegido en la
// lista, el detalle de los equipos afuera o el de la plata por estado.
//
// Los números salen de la misma pizarra que lee el menú (1 lectura) y quedan
// guardados en el mismo lugar, así que las dos pantallas no pueden mostrar
// cifras distintas.
export default function PanelSeguimiento({ elegido, hoy, onSoltar }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const kpisGuardados = useSelector((state) => state.kpis);
  const [totales, setTotales] = useState({
    equiposActivos: kpisGuardados.equiposActivos,
    equiposPorTipo: kpisGuardados.equiposPorTipo,
    pagosPendientes: kpisGuardados.pagosPendientes,
    pagosPorEstado: kpisGuardados.pagosPorEstado,
  });
  // LOS DOS DETALLES van en el mismo recuadro de la historia: se abren tocando
  // su número y se van solos en cuanto se elige otro equipo en la lista. Se
  // guarda cuál se abrió y qué elección había; si la elección cambió —otro
  // equipo, o el mismo tocado de nuevo— se vuelve a la historia. `undefined` =
  // ninguno abierto.
  //
  // Sin equipo elegido, el recuadro muestra los pagos: así lo pidió el dueño,
  // para que nunca esté vacío.
  const [detalleAbierto, setDetalleAbierto] = useState(undefined);
  const elegidoAhora = elegido ?? null;
  const vista =
    detalleAbierto !== undefined && detalleAbierto.con === elegidoAhora
      ? detalleAbierto.cual
      : elegido
        ? "historia"
        : "pagos";
  // Tocar el número del detalle que ya se ve lo cierra.
  const alternar = (cual) =>
    setDetalleAbierto(vista === cual ? undefined : { cual, con: elegidoAhora });
  // La X del recuadro: un detalle abierto se cierra (vuelve la historia o los
  // pagos); la historia suelta el equipo, que deja de estar marcado en la
  // lista, y vuelven los pagos (pedido del dueño, 2026-10-23).
  const cerrar = () => {
    if (vista === "historia") onSoltar();
    else setDetalleAbierto(undefined);
  };

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const frescos = await leerTotalesPanel();
        if (cancelado || !frescos) return;
        const numeros = {
          equiposActivos: frescos.equiposActivos,
          equiposPorTipo: frescos.equiposPorTipo,
          pagosPendientes: frescos.pagosPendientes,
          pagosPorEstado: frescos.pagosPorEstado,
        };
        setTotales(numeros);
        dispatch(setKpis(numeros));
      } catch (error) {
        console.error("Error al leer los totales del panel:", error);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [dispatch]);

  // EL RECUADRO, con el mismo estilo que el del buzón y el de cuentas de cobro
  // (PanelDocumentos y ResumenLista; pedido del dueño, 2026-10-23): título
  // grande con su ícono y la X para volver a los pagos, y cada detalle con su
  // color. Sin el total al pie: es el número de la tarjeta de arriba.
  const colorEquipos = theme.palette.warning.main;
  // La situación del equipo elegido, con la misma regla que su tarjeta.
  const situacion = elegido ? clasificarVencimiento(elegido.equipo, hoy) : null;
  const colorSituacion = colorDeSituacion(theme, situacion);
  const grupoSituacion = GRUPOS_VENCIMIENTO.find(({ clave }) => clave === situacion);
  const colorPagos = theme.palette.error.main;

  const filasEquipos = Object.entries(totales.equiposPorTipo || {})
    .sort(([nombreA, a], [nombreB, b]) => b - a || nombreA.localeCompare(nombreB))
    .map(([nombre, cantidad]) => ({ clave: nombre, izquierda: nombre, derecha: cantidad }));

  // Primero lo más urgente. Una factura finalizada no debe nada, así que nunca
  // tiene renglón.
  const filasPagos = ESTADOS_PAGO.filter(
    ({ estado }) => totales.pagosPorEstado?.[estado] > 0,
  ).map(({ estado, label }) => ({
    clave: estado,
    izquierda: label,
    derecha: formatearMoneda(totales.pagosPorEstado[estado]),
    color: theme.palette.custom.estadoFactura[estado],
  }));

  const RECUADRO = {
    equipos: {
      titulo: "Equipos activos",
      icono: <LocalShippingIcon />,
      contenido: (
        <ResumenLista
          justificado={false}
          secciones={[
            {
              titulo: "UNIDADES AFUERA POR EQUIPO",
              icono: <LocalShippingIcon />,
              color: colorEquipos,
              forma: "ranking",
              // null mientras la pizarra no tenga el detalle (entre que se
              // publica y corre el primer repaso).
              vacio: totales.equiposPorTipo
                ? "No hay equipos en alquiler."
                : "El detalle todavía no está listo.",
              filas: filasEquipos,
            },
          ]}
        />
      ),
    },
    pagos: {
      titulo: "Pagos pendientes",
      icono: <ErrorOutlineIcon />,
      contenido: (
        <ResumenLista
          justificado={false}
          secciones={[
            {
              titulo: "LO QUE SE DEBE POR ESTADO",
              icono: <ErrorOutlineIcon />,
              color: colorPagos,
              vacio: totales.pagosPorEstado
                ? "No hay pagos pendientes."
                : "El detalle todavía no está listo.",
              filas: filasPagos,
            },
          ]}
        />
      ),
    },
    historia: {
      titulo: "Historia del equipo",
      icono: <TimelineIcon />,
      // Como la vista previa del buzón: arriba una franja del color de la
      // situación del equipo —el mismo de su recuadro en la lista— con su
      // rótulo, y debajo la línea de tiempo con su título (pedido del dueño,
      // 2026-10-23).
      contenido: elegido && (
        <Stack spacing={5} sx={{ mt: 2, px: 1 }}>
          <Stack
            direction="row"
            alignItems="flex-start"
            spacing={1}
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(colorSituacion, 0.08),
              borderLeft: "4px solid",
              borderLeftColor: colorSituacion,
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <EncabezadoHistoria
                equipo={elegido.equipo}
                numeroFactura={elegido.numeroFactura}
                nombreCliente={elegido.nombreCliente}
              />
            </Box>
            {grupoSituacion && (
              <Chip
                size="small"
                label={grupoSituacion.titulo}
                sx={{
                  flexShrink: 0,
                  fontWeight: 600,
                  bgcolor: colorSituacion,
                  color: theme.palette.getContrastText(colorSituacion),
                }}
              />
            )}
          </Stack>
          <Box>
            <TituloSeccion
              titulo="LÍNEA DE TIEMPO"
              icono={<TimelineIcon />}
              color={theme.palette.custom.accent}
            />
            <HistorialEquipo equipo={elegido.equipo} hoy={hoy} sinLinea />
          </Box>
        </Stack>
      ),
    },
  };
  const { titulo, icono, contenido } = RECUADRO[vista];

  return (
    <Stack spacing={2} sx={{ height: "100%", minHeight: 0 }}>
      <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0 }}>
        <KpiCard
          compacto
          etiqueta="EQUIPOS ACTIVOS"
          icono={<LocalShippingIcon />}
          color={colorEquipos}
          valor={totales.equiposActivos ?? "…"}
          subtitulo="En alquiler"
          onClick={() => alternar("equipos")}
        />
        <KpiCard
          compacto
          etiqueta="PAGOS PENDIENTES"
          icono={<ErrorOutlineIcon />}
          color={colorPagos}
          valor={
            totales.pagosPendientes === null || totales.pagosPendientes === undefined
              ? "…"
              : formatearMoneda(totales.pagosPendientes)
          }
          subtitulo="Por cobrar"
          onClick={() => alternar("pagos")}
        />
      </Stack>

      {/* El recuadro se desplaza solo: con muchos hitos no empuja los números
          fuera de la pantalla. */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <PanelDocumentos
          titulo={titulo}
          icono={icono}
          // Los pagos son lo de siempre: con otra cosa abierta, la X vuelve a
          // ellos. Si había un equipo elegido, el detalle se cierra y vuelve
          // su historia; la X de la historia suelta el equipo.
          onCerrar={vista === "pagos" ? undefined : cerrar}
        >
          {contenido}
        </PanelDocumentos>
      </Box>
    </Stack>
  );
}

PanelSeguimiento.propTypes = {
  // El equipo elegido, ya buscado en la lista vigente: null si no hay ninguno.
  elegido: PropTypes.shape({
    equipo: PropTypes.object.isRequired,
    numeroFactura: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    nombreCliente: PropTypes.string,
  }),
  hoy: PropTypes.string,
  // Suelta el equipo elegido (la X de la historia).
  onSoltar: PropTypes.func.isRequired,
};
