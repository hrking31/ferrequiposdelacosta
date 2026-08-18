// La tarjeta del cliente que encabeza su detalle: quién es (avatar con el
// conteo de facturas, nombre y estado), cuánto debe (la pizarra oscura con su
// cuenta) y qué se puede hacer con él (la fila de botones), más el contacto —
// teléfono, NIT, dirección y obra— que en celular se pliega.
//
// Queda fija arriba, fuera del scroll: lo único que se desplaza es la lista de
// facturas que va debajo.
import { useState } from "react";
import PropTypes from "prop-types";
import {
  Avatar,
  Badge,
  Box,
  Chip,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import BadgeIcon from "@mui/icons-material/Badge";
import BusinessIcon from "@mui/icons-material/Business";
import ConstructionIcon from "@mui/icons-material/Construction";
import EditIcon from "@mui/icons-material/Edit";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FolderSharedIcon from "@mui/icons-material/FolderShared";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PlaceIcon from "@mui/icons-material/Place";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import { calcularCuentaCliente, ESTADO_CLIENTE_INFO } from "./facturaUtils";
import {
  casillasDeCuenta,
  iconBtnSx,
  renderPizarraTotales,
} from "./recuadrosCuenta";
import { formatearNit } from "../../Utils/formato";

const CODIGOS_SIN_TELEFONO = ["SN", "NT", "N/A", ""];

const obtenerNombreCompleto = (cliente) => {
  if (!cliente) return "";
  if (cliente.tipo === "empresa")
    return cliente.razonSocial || cliente.nombreOriginal;
  return (
    [cliente.nombres, cliente.apellido].filter(Boolean).join(" ") ||
    cliente.nombreOriginal
  );
};

const tieneTelefonoValido = (telefono) =>
  telefono &&
  !CODIGOS_SIN_TELEFONO.includes(String(telefono).trim().toUpperCase());

export default function ClienteEncabezado({
  cliente,
  // Las facturas ABIERTAS: son las que suman la cuenta de la pizarra. Las
  // finalizadas no cambian ninguna de sus casillas (ver calcularCuentaCliente).
  facturas,
  // Cuántas se están mostrando abajo, historial incluido: es lo que dice la
  // insignia sobre el avatar.
  cantidadFacturas,
  // Si hay algo que reportar o que pasar a cuenta de cobro; con la lista vacía
  // los dos botones quedan apagados.
  hayFacturasParaReporte,
  onVolver,
  onCrearFactura,
  onAbonar,
  onDescargarReporte,
  onPasarACuentaCobro,
  onEditarCliente,
}) {
  const theme = useTheme();
  const esMovil = useMediaQuery(theme.breakpoints.down("sm"));
  // El contacto (teléfono, NIT, dirección) pasa de dos columnas a una, y
  // aparece el botón de volver al listado.
  const isFullScreen = useMediaQuery("(max-width:915px)");
  // Desde acá entran en un solo renglón el nombre, el recuadro de cuenta y los
  // botones. Por debajo, el recuadro baja a su propia fila (ver el armado del
  // encabezado). No se persigue el ancho exacto en que dejan de entrar —depende
  // del largo del nombre del cliente— sino que se corta con margen de sobra.
  const esAncho = useMediaQuery(theme.breakpoints.up("lg"));
  const acento = theme.palette.custom.accent;
  const avatarBgPorEstado = theme.palette.custom.estadoFactura;
  // En celular el encabezado deja a la vista solo el nombre y el resumen de
  // cuenta: el teléfono y la dirección se despliegan con la flecha, así lo que
  // se busca de un vistazo (cuánto es y cuánto falta) no queda debajo de todo.
  // En computador sobra el ancho y van siempre visibles.
  const [contactoAbierto, setContactoAbierto] = useState(false);

  const nombreCompleto = obtenerNombreCompleto(cliente);
  const estadoInfo =
    ESTADO_CLIENTE_INFO[cliente.estado] || ESTADO_CLIENTE_INFO.inactivo;
  const estadoColor =
    avatarBgPorEstado[cliente.estado] || avatarBgPorEstado.inactivo;
  const telefonoValido = tieneTelefonoValido(cliente.telefono);
  // La cuenta del cliente: la suma de sus facturas ABIERTAS, o sea lo que
  // tiene abierto hoy, no lo que compró en toda su vida. A diferencia de una
  // factura suelta, acá el saldo es neto (lo que sobró en una descuenta lo que
  // se debe en otra).
  //
  // Las cerradas quedan fuera y no le hacen falta: por definición devolvieron
  // todo, no deben nada y no les sobró, así que aportan cero a las cuatro
  // casillas. Y por eso mismo el número no cambia si alguien pide ver el
  // historial.
  const cuentaCliente = calcularCuentaCliente(facturas);
  // Solo se pliega en celular; en computador el contacto está siempre a la
  // vista, así que la flecha no tiene nada que hacer.
  const contactoVisible = !esMovil || contactoAbierto;
  // Los botones del encabezado van enmarcados, iguales a los de cada factura:
  // toda la pantalla usa el mismo molde.
  const botonEncabezadoSx = { ...iconBtnSx, color: acento };

  // Las acciones del encabezado, en este orden: volver al listado, crear
  // factura y editar el cliente, y por último plegar el contacto. La carpeta
  // reemplaza al botón "Volver a Clientes" que ocupaba un renglón entero
  // arriba de la tarjeta; "Crear Factura" reemplaza al botón con letra que
  // vivía junto al título "Facturas N" (ese título se fue entero: el conteo
  // ahora es la insignia sobre el avatar del cliente).
  //
  // Hasta 915px son varios y flotan en la esquina de arriba. En computador
  // queda el lápiz solo y va dentro de la fila del nombre, después de la
  // pizarra de valores, así queda centrado con ella.
  const botonesEncabezado = (
    // Más separación en pantalla angosta: ahí se tocan con el dedo, y dos
    // íconos pegados a 8px de distancia se aprietan mal.
    <Stack direction="row" spacing={isFullScreen ? 1.5 : 1} sx={{ flexShrink: 0 }}>
      {isFullScreen && (
        <Tooltip title="Volver a Clientes">
          <IconButton
            size="small"
            onClick={onVolver}
            sx={botonEncabezadoSx}
          >
            <FolderSharedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      <Tooltip title="Crear factura">
        <IconButton
          size="small"
          onClick={onCrearFactura}
          sx={botonEncabezadoSx}
        >
          <ReceiptLongIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {/* Un solo botón para todo el cliente: el abono se reparte solo entre
          las facturas que tengan saldo (ver AbonoDialog). El span es porque
          un botón deshabilitado no emite eventos de mouse y sin él el globo
          de ayuda no aparece. */}
      <Tooltip
        title={
          cuentaCliente.saldoPendiente > 0
            ? "Registrar abono"
            : "El cliente no tiene saldo pendiente"
        }
      >
        <span>
          <IconButton
            size="small"
            disabled={cuentaCliente.saldoPendiente === 0}
            onClick={onAbonar}
            sx={{
              ...botonEncabezadoSx,
              "&.Mui-disabled": { color: "action.disabled" },
            }}
          >
            <AttachMoneyIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      {/* El span es necesario para que el tooltip funcione con el botón
          deshabilitado: un botón así no emite eventos de mouse. */}
      <Tooltip title="Descargar reporte de facturas">
        <span>
          <IconButton
            size="small"
            onClick={onDescargarReporte}
            disabled={!hayFacturasParaReporte}
            sx={botonEncabezadoSx}
          >
            <PictureAsPdfIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      {/* Misma lista de facturas que el reporte, pero en vez de un PDF arma la
          cuenta de cobro y lleva a su pantalla. */}
      <Tooltip title="Pasar facturas a cuenta de cobro">
        <span>
          <IconButton
            size="small"
            onClick={onPasarACuentaCobro}
            disabled={!hayFacturasParaReporte}
            sx={botonEncabezadoSx}
          >
            <RequestQuoteIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Editar cliente">
        <IconButton
          size="small"
          onClick={onEditarCliente}
          sx={botonEncabezadoSx}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>

    </Stack>
  );

  // La flecha que oculta y muestra los datos del cliente va aparte de las
  // demás: se queda fija en su esquina mientras las otras se centran. Si
  // entrara en el mismo grupo, el centrado la correría de lugar cada vez que
  // aparece o desaparece un botón.
  const botonPlegarContacto = esMovil && (
    <Tooltip
      title={contactoAbierto ? "Ocultar datos del cliente" : "Ver datos del cliente"}
    >
      <IconButton
        size="small"
        onClick={() => setContactoAbierto((abierto) => !abierto)}
        sx={botonEncabezadoSx}
      >
        {contactoAbierto ? (
          <ExpandLessIcon fontSize="small" />
        ) : (
          <ExpandMoreIcon fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  );

  // Quién es el cliente: avatar con el conteo de facturas, nombre y estado.
  // Va separado de la pizarra de cuenta porque los dos se reacomodan distinto
  // según el ancho (ver el armado del encabezado, más abajo).
  const bloqueNombre = (
    <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{
          minWidth: 0,
          // Sin facturas no hay pizarra que empuje el bloque al borde
          // derecho, así que el hueco lo ocupa el nombre.
          flexGrow: cantidadFacturas > 0 ? 0 : 1,
          // En celular, el Stack de arriba pasa a columna y este renglón
          // (y la pizarra, su hermano) deberían estirarse solos por el
          // alignItems:"stretch" del padre — pero con flexWrap:"wrap" en
          // un contenedor en columna, ese estirado no se aplica y cada
          // hijo vuelve a su ancho de contenido, más ancho que la
          // tarjeta. Forzarlo así es lo que evita que se salga.
          width: { xs: "100%", sm: "auto" },
          // Le deja la esquina libre a la flecha de plegar, que está anclada
          // ahí arriba: un nombre largo le pasaría por debajo.
          pr: esMovil ? 5 : 0,
        }}
      >
        {/* El conteo de facturas va como insignia sobre el avatar: antes
            era el título "Facturas N" que encabezaba la lista, antes de
            que ese renglón se repartiera entre esta insignia y el botón
            de crear factura, arriba. */}
        <Badge
          badgeContent={cantidadFacturas}
          color="primary"
          overlap="circular"
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          sx={{ flexShrink: 0 }}
        >
          <Avatar
            sx={{
              // Más chico en celular: libera ancho para el nombre.
              width: { xs: 44, sm: 56 },
              height: { xs: 44, sm: 56 },
              bgcolor:
                avatarBgPorEstado[cliente.estado] || avatarBgPorEstado.inactivo,
            }}
          >
            {cliente.tipo === "empresa" ? (
              <BusinessIcon sx={{ fontSize: { xs: 22, sm: 28 } }} />
            ) : (
              <PersonIcon sx={{ fontSize: { xs: 22, sm: 28 } }} />
            )}
          </Avatar>
        </Badge>
        <Box sx={{ minWidth: 0, width: "100%" }}>
          {/* Antes acá había que reservarle hueco a los botones flotantes:
              ahora que son parte del mismo flujo, ese hueco ya no hace
              falta. Dejar que el nombre se parta en dos líneas sigue
              siendo aceptable si no entra entero. */}
          <Typography variant="h6">{nombreCompleto}</Typography>
          <Chip
            icon={estadoInfo.Icono ? <estadoInfo.Icono /> : undefined}
            label={estadoInfo.label}
            variant="estado"
            size="small"
            sx={{
              mt: 0.5,
              bgcolor: estadoColor,
              color: theme.palette.getContrastText(estadoColor),
              "& .MuiChip-icon": { color: "inherit" },
            }}
          />
        </Box>
      </Stack>
  );

  // Cuánto debe: el recuadro oscuro con la cuenta del cliente.
  //
  // Sin facturas no hay cuenta que mostrar: una pizarra en cero sugeriría que
  // el cliente debe algo.
  const bloquePizarra =
    facturas.length > 0 &&
    renderPizarraTotales(
      // En celular solo el total y el saldo: las cuatro casillas, con importes
      // de siete cifras, no entran sin montarse entre sí. De 600px para arriba
      // el recuadro tiene una fila entera para él, así que las cuatro caben.
      casillasDeCuenta(cuentaCliente, { resumida: esMovil }),
      // Sin el ancho forzado, en pantalla angosta la pizarra vuelve a su ancho
      // de contenido y se sale de la tarjeta por la derecha.
      { flexGrow: 1, width: { xs: "100%", sm: "auto" } },
    );

  return (
    <Box
      sx={{
        // Los mismos márgenes y esquinas que la tarjeta de una factura: son
        // dos tarjetas de la misma lista, una arriba de la otra.
        p: 2,
        borderRadius: 2,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: 1,
        mb: 3,
        position: "relative",
        // Sin esto, una pizarra de cuatro importes largos estira la tarjeta
        // más allá del ancho de la pantalla y aparece scroll horizontal.
        minWidth: 0,
        // Es fija, no parte del área con scroll: que no se achique si el
        // alto de la pantalla es chico.
        flexShrink: 0,
      }}
    >
      {/* En computador el resumen de cuenta va al lado del nombre; en celular
          no entra en la misma línea y pasa debajo, a todo el ancho. Los
          botones son el mismo bloque en los dos casos (botonesEncabezado);
          lo que cambia es dónde se ubican. */}
      {/* La flecha que oculta y muestra los datos del cliente va anclada a
          la esquina de la tarjeta, a la altura del nombre: es el control de
          la tarjeta entera, no una acción más del cliente. Por eso no está
          en la fila de botones de abajo — ahí se leería como si hiciera algo
          con el cliente, y lo que hace es plegar lo que estás mirando. */}
      {botonPlegarContacto && (
        <Box sx={{ position: "absolute", top: 12, right: 12, zIndex: 1 }}>
          {botonPlegarContacto}
        </Box>
      )}

      {/* ── Cómo se acomoda el encabezado ──────────────────────────────
          La tarjeta tiene tres piezas: QUIÉN es el cliente, CUÁNTO debe y
          QUÉ se puede hacer con él. Lo que cambia con el ancho es cuál cede.

          En pantalla ancha entran las tres en un renglón. Cuando dejan de
          entrar, el que baja es el RECUADRO DE CUENTA —a su propia fila y a
          todo el ancho, que es donde mejor se lee—, y los botones se quedan
          arriba con el nombre. Antes bajaban los botones, y quedaban sueltos
          abajo a la izquierda como si se hubieran caído.

          Recién en celular, donde el nombre y seis botones ya no conviven en
          un renglón, los botones pasan abajo y van centrados. */}
      {esAncho ? (
        <Stack direction="row" alignItems="center" sx={{ gap: 2 }}>
          {bloqueNombre}
          {bloquePizarra}
          {botonesEncabezado}
        </Stack>
      ) : (
        <Stack sx={{ rowGap: 2 }}>
          {esMovil ? (
            <>
              {bloqueNombre}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  // Las acciones son otra cosa que los datos de arriba, no la
                  // continuación del nombre.
                  pt: 0.5,
                }}
              >
                {botonesEncabezado}
              </Box>
            </>
          ) : (
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ gap: 2 }}
            >
              {bloqueNombre}
              {botonesEncabezado}
            </Stack>
          )}
          {bloquePizarra}
        </Stack>
      )}

      {contactoVisible && (
        <>
          {/* El divisor horizontal no llega a los bordes de la tarjeta:
              queda centrado al 95% del ancho. */}
          <Divider sx={{ my: 2, width: "95%", mx: "auto" }} />

          {/* Dos columnas en computador (>915px): a la izquierda el contacto
              (teléfono y NIT/cédula), a la derecha la ubicación (dirección y
              obra). Hasta 915px se apilan en una sola columna. */}
          <Stack
            direction={isFullScreen ? "column" : "row"}
            spacing={isFullScreen ? 1 : 4}
            // Línea divisoria vertical entre las dos columnas, solo en
            // computador. `flexItem` la estira a la altura del contenido y el
            // margen vertical evita que llegue a los bordes.
            divider={
              !isFullScreen ? (
                <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
              ) : undefined
            }
            sx={{ minWidth: 0 }}
          >
            {/* En computador, teléfono arriba y NIT/cédula debajo (columna).
                En móvil van uno al lado del otro (fila): son cortos y entran
                bien, así ahorran una línea. */}
            <Stack
              direction={isFullScreen ? "row" : "column"}
              spacing={isFullScreen ? 2 : 1}
              alignItems="center"
              justifyContent="center"
              // En móvil, teléfono y NIT/cédula van en fila con una línea
              // divisoria vertical entre ellos (como las columnas en PC), y
              // cada uno centrado en su mitad. En PC quedan apilados, sin
              // divisor.
              divider={
                isFullScreen ? (
                  <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
                ) : undefined
              }
              sx={{ flex: 1, minWidth: 0 }}
            >
              {telefonoValido ? (
                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                  justifyContent="center"
                  sx={{ flex: isFullScreen ? 1 : "none" }}
                >
                  <PhoneIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  <Typography variant="body2">
                    {!isFullScreen && "Teléfono: "}
                    {cliente.telefono}
                  </Typography>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Sin teléfono registrado
                </Typography>
              )}

              {cliente.nit && (
                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                  justifyContent="center"
                  sx={{ flex: isFullScreen ? 1 : "none" }}
                >
                  <BadgeIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  <Typography variant="body2">
                    {!isFullScreen &&
                      `${cliente.tipo === "empresa" ? "NIT" : "Cédula"}: `}
                    {formatearNit(cliente.nit)}
                  </Typography>
                </Stack>
              )}
            </Stack>

            <Stack
              spacing={1}
              alignItems="center"
              justifyContent="center"
              sx={{ flex: 1, minWidth: 0 }}
            >
              {cliente.direccion && (
                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                  justifyContent="center"
                >
                  <PlaceIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  <Typography variant="body2">
                    {!isFullScreen && "Dirección: "}
                    {cliente.direccion}
                  </Typography>
                </Stack>
              )}

              {cliente.obra && (
                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                  justifyContent="center"
                >
                  <ConstructionIcon
                    sx={{ fontSize: 18, color: "text.secondary" }}
                  />
                  <Typography variant="body2">
                    {!isFullScreen && "Obra: "}
                    {cliente.obra}
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Stack>
        </>
      )}
    </Box>
  );
}

ClienteEncabezado.propTypes = {
  cliente: PropTypes.object.isRequired,
  facturas: PropTypes.array.isRequired,
  cantidadFacturas: PropTypes.number.isRequired,
  hayFacturasParaReporte: PropTypes.bool,
  onVolver: PropTypes.func.isRequired,
  onCrearFactura: PropTypes.func.isRequired,
  onAbonar: PropTypes.func.isRequired,
  onDescargarReporte: PropTypes.func.isRequired,
  onPasarACuentaCobro: PropTypes.func.isRequired,
  onEditarCliente: PropTypes.func.isRequired,
};
