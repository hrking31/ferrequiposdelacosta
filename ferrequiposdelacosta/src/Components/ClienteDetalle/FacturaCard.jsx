// La tarjeta de UNA factura dentro del detalle del cliente: el encabezado con
// su número y su estado, los equipos (los del alta y los agregados después,
// cada lote con su pago y sus cargos), los abonos y el estado de cuenta.
//
// Acá se arma la factura completa; cada pieza de adentro tiene su archivo:
// EquipoRow (la fila de un equipo), RecuadroPago y ListaAbonos (la plata que
// entró), CargosAdicionales (IVA, depósito y transporte) y
// EstadoCuentaFactura (el cierre con lo que falta cobrar).
//
// El plegado —el de la factura entera y el de cada sección— vive en la
// pantalla, no acá: así abrir una factura no se pierde al recargar la lista
// después de un abono o una edición.
import PropTypes from "prop-types";
import { alpha } from "@mui/material/styles";
import {
  Box,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AssignmentReturnIcon from "@mui/icons-material/AssignmentReturn";
import ConstructionIcon from "@mui/icons-material/Construction";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LibraryAddIcon from "@mui/icons-material/LibraryAdd";
import PaymentsIcon from "@mui/icons-material/Payments";
import SavingsIcon from "@mui/icons-material/Savings";
import {
  estaDevuelto,
  calcularCuentaFactura,
  calcularEstadoFactura,
  estadoEnSeguimiento,
  hayEquiposAlDia,
  movimientosFactura,
  GRUPO_INICIAL,
  datosFactura,
  gruposDe,
  grupoInicialDe,
  pagosDe,
  adicionalesDe,
  abonosDe,
  tipoPagoDe,
  ESTADO_FACTURA_INFO,
} from "./facturaUtils";
import EquipoRow from "./EquipoRow";
import RecuadroPago, { ListaAbonos } from "./RecuadroPago";
import CargosAdicionales from "./CargosAdicionales";
import EstadoCuentaFactura from "./EstadoCuentaFactura";
import { casillasDeCuenta, iconBtnSx, renderPizarraTotales } from "./recuadrosCuenta";
// Con alias: la fecha DD/MM/AAAA.
import { formatearFechaLegible as formatearFecha } from "../../Utils/formato";

// Los estados y sus nombres viven en facturaUtils (ver ESTADO_FACTURA_INFO).
// El color de cada uno sale de avatarBgPorEstado —color propio, no el prop
// `color` de MUI— para no repetir colores ya usados en otros botones.
export default function FacturaCard({
  factura,
  // El plegado de la factura entera y el de cada una de sus secciones se
  // guarda en la pantalla, no acá: así sobrevive a que la lista se recargue.
  facturaColapsada,
  toggleFacturaColapsada,
  seccionAbierta,
  toggleSeccion,
  // Lo que la tarjeta no resuelve sola: abre el diálogo que corresponda en la
  // pantalla, que es la dueña de esos diálogos.
  onAgregarEquipo,
  onRegistrarDevolucion,
  onEditar,
  onEliminar,
  onDevolverSaldo,
}) {
  const theme = useTheme();
  const esMovil = useMediaQuery(theme.breakpoints.down("sm"));
  // Hasta acá la pizarra completa no entra en el hueco del encabezado de la
  // factura y hay que mostrar la versión corta debajo.
  const isFullScreen = useMediaQuery("(max-width:915px)");
  const acento = theme.palette.custom.accent;
  // Cada bloque de la factura tiene su color: el pago, los equipos del
  // alta y los que se agregaron despues.
  const colorPago = theme.palette.custom.seccionPago;
  const colorEquipos = theme.palette.custom.seccionEquipos;
  const colorEquiposAgregados = theme.palette.custom.seccionEquiposAgregados;
  // Los abonos van con el mismo azul que la casilla "Abonos" del resumen de
  // cuenta del encabezado. Se usa el tono .main y no .light porque acá el
  // recuadro va sobre fondo de tarjeta, no sobre la pizarra oscura.
  const colorAbonos = theme.palette.info.main;
  const avatarBgPorEstado = theme.palette.custom.estadoFactura;

  // El estado sale de los datos de la factura, no de un campo
  // guardado: así no puede quedar viejo por el simple paso del
  // tiempo (ver calcularEstadoFactura en facturaUtils).
  const facturaEstado = calcularEstadoFactura(factura);
  // Una factura finalizada no tiene nada más que hacer con ella: no se le
  // agregan equipos, no se le registra devolución y no se edita. Sigue
  // viéndose completa, solo deja de tener acciones.
  const finalizada = facturaEstado === "finalizada";
  // Desde acá solo se registran las devoluciones que el cliente pide ANTES de
  // que se le venza el alquiler. En cuanto la factura vence pasa a
  // Seguimiento, y esa devolución sí es parte de la cobranza: se registra allá
  // para que quede en la bitácora (ver gestionesDeSeguimiento).
  //
  // Salvo que todavía le quede algún equipo al día. Una factura vencida por un
  // equipo puede tener otros agregados después, con fecha más adelante: esos
  // se siguen devolviendo desde acá, porque devolverlos no es cobranza. El
  // diálogo, en ese caso, solo ofrece los que no vencieron.
  const seGestionaEnSeguimiento = estadoEnSeguimiento(facturaEstado);
  const devolucionSoloEnSeguimiento =
    seGestionaEnSeguimiento && !hayEquiposAlDia(factura);
  // Si ya tiene un abono, un equipo agregado, una ampliación o una
  // devolución parcial, borrarla de un clic se llevaría esa historia con
  // ella. Sin nada encima, borrar y volver a cargarla es la salida más
  // simple para una factura mal cargada.
  const tieneMovimientos = movimientosFactura(factura).hayAlgo;
  const facturaEstadoInfo =
    ESTADO_FACTURA_INFO[facturaEstado] || { label: "Sin estado" };
  const facturaEstadoColor =
    avatarBgPorEstado[facturaEstado] ||
    theme.palette.custom.estadoNeutro;
  const datos = datosFactura(factura);
  // El despacho inicial: lo que salió con el alta de la factura. Su flete, su
  // depósito y su pago viven en él, no sueltos en la factura.
  const grupoInicial = grupoInicialDe(factura);
  const adicionalesInicial = adicionalesDe(grupoInicial);
  // El transporte es el tipo (ej. "Solo ida") y el monto vive aparte, en
  // valorTransporte.
  const transporteTipo = adicionalesInicial.transporte || null;
  // La cuenta de la factura (total, cobrado, abonado y saldo) sale toda de
  // facturaUtils: es la misma que suma el resumen del encabezado del cliente,
  // así los dos lugares dicen lo mismo. Se calcula una sola vez acá y baja
  // hecha al estado de cuenta, que es quien la muestra al detalle.
  //
  // El total y el saldo ya vienen con los días ampliados sumados: es lo que
  // hoy se le cobraría al cliente, no lo que decía la factura el día que se
  // emitió.
  const cuenta = calcularCuentaFactura(factura);
  const fecha = formatearFecha(datos.fechaCreacion);
  // Solo importa en móvil (en PC siempre se muestra todo).
  const mostrar = (seccion) =>
    !esMovil || seccionAbierta(factura.id, seccion);
  const renderToggle = (seccion) =>
    esMovil && (
      <IconButton
        size="small"
        onClick={() => toggleSeccion(factura.id, seccion)}
        sx={{ ...iconBtnSx, color: acento }}
      >
        {seccionAbierta(factura.id, seccion) ? (
          <ExpandLessIcon fontSize="small" />
        ) : (
          <ExpandMoreIcon fontSize="small" />
        )}
      </IconButton>
    );
  // Los equipos del alta y los que se agregaron después con el botón
  // "Agregar equipo". Ya no hay que separarlos con una marca en cada equipo:
  // son grupos distintos, y cada uno muestra su propio pago.
  const equiposOriginales = grupoInicial?.equipos ?? [];
  const gruposAgregados = gruposDe(factura).filter(
    (grupo) => grupo?.grupo !== GRUPO_INICIAL,
  );
  // Misma regla que los despachos agregados: con un solo equipo el bloque
  // ocupa media grilla, con dos o más se va a todo el ancho. El "|| 1"
  // evita un repeat(0, 1fr) inválido cuando la lista viene vacía.
  const columnasOriginales = Math.min(
    equiposOriginales.length || 1,
    2,
  );
  const pagosOriginales = pagosDe(grupoInicial);

  // Cuántos equipos se agregaron DE VERDAD. No es la cantidad de renglones:
  // una devolución parcial parte el renglón en dos —lo que volvió y lo que
  // sigue afuera— y el mismo equipo pasaba a contarse dos veces. Se cuenta por
  // despacho y nombre, que es lo que se ve como "un equipo".
  const cantidadEquiposAgregados = new Set(
    gruposAgregados.flatMap((grupo) =>
      (grupo.equipos ?? []).map((equipo) => `${grupo.grupo}|${equipo.nombre}`),
    ),
  ).size;

  const abonos = abonosDe(factura);

  // El estado no se toca a mano: sale de las fechas, de lo que se
  // devolvió y del saldo (ver calcularEstadoFactura). Para moverlo
  // hay que actuar sobre la factura —despachar, devolver, cobrar—,
  // no sobre la etiqueta.
  const chipEstado = (
    <Chip
      icon={facturaEstadoInfo.Icono ? <facturaEstadoInfo.Icono /> : undefined}
      label={facturaEstadoInfo.label}
      variant="estado"
      size="small"
      sx={{
        bgcolor: facturaEstadoColor,
        color: theme.palette.getContrastText(facturaEstadoColor),
        "& .MuiChip-icon": { color: "inherit" },
        // La variante "estado" trae un ancho fijo de 190px, pensado
        // para una lista donde los chips se alinean en columna (ver
        // ThemeProvider). Acá no hay esa columna, y 190px era lo que
        // mandaba el chip a la línea de abajo aunque el título le
        // dejara sitio de sobra. Sigue siendo el MISMO ancho para
        // los cinco estados —no varía según el texto—, solo que más
        // angosto: con los nombres nuevos, el más largo es
        // "Finalizada", y 130px lo cubre con el ícono adelante.
        width: 130,
      }}
    />
  );

  const iconosFactura = (
    <Stack
      direction="row"
      spacing={esMovil ? 1.5 : 0.75}
      alignItems="center"
    >
      <Tooltip
        title={finalizada ? "Esta factura ya está finalizada" : "Agregar equipo"}
      >
        <span>
          <IconButton
            size="small"
            disabled={finalizada}
            onClick={() => onAgregarEquipo(factura)}
            sx={{ ...iconBtnSx, color: acento }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      {/* Solo para el cliente que devuelve ANTES de que se le venza el
          alquiler: esa factura nunca entra a Seguimiento, así que sin este
          botón no habría dónde anotar la devolución. Se apaga cuando ya no
          queda ningún equipo al día: de ahí en adelante toda devolución es
          cobranza y se registra desde Seguimiento. */}
      <Tooltip
        title={
          finalizada
            ? "Esta factura ya está finalizada"
            : devolucionSoloEnSeguimiento
              ? "Esta factura está vencida: la devolución se registra desde Seguimiento"
              : seGestionaEnSeguimiento
                ? "Registrar la devolución de los equipos que no han vencido"
                : "Registrar devolución"
        }
      >
        <span>
          <IconButton
            size="small"
            disabled={finalizada || devolucionSoloEnSeguimiento}
            onClick={() => onRegistrarDevolucion(factura)}
            sx={{ ...iconBtnSx, color: acento }}
          >
            <AssignmentReturnIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={finalizada ? "Esta factura ya está finalizada" : "Editar factura"}>
        <span>
          <IconButton
            size="small"
            disabled={finalizada}
            onClick={() => onEditar(factura)}
            sx={{ ...iconBtnSx, color: acento }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip
        title={
          tieneMovimientos
            ? "Esta factura ya tiene abonos, equipos agregados o devoluciones: no se puede borrar de un clic"
            : "Eliminar factura"
        }
      >
        <span>
          <IconButton
            size="small"
            color="error"
            disabled={tieneMovimientos}
            onClick={() => onEliminar(factura)}
            sx={iconBtnSx}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        // El fondo de tarjeta sobre el fondo de la app ya alcanza
        // para que se despegue: en modo noche es el azul acero sobre
        // el azul noche.
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "custom.accent",
        // Sin esto, la pizarra de totales estira la tarjeta más allá
        // del ancho de la pantalla y aparece scroll horizontal.
        minWidth: 0,
        // Referencia para la flecha flotante de celular, más abajo.
        position: "relative",
      }}
    >
      {/* En celular, con el título largo ("Factura N / Creada el..."),
          el grupo chip+flecha no entra en la misma línea y se envolvía
          entero a la línea de abajo pegado a la izquierda —la flecha
          terminaba lejos de la esquina, donde nadie la busca. Sacarla
          del grupo que se envuelve y clavarla en la esquina de la
          tarjeta la deja siempre en el mismo lugar. En pantallas más
          anchas no hace falta: ahí el título sí entra junto al chip. */}
      {esMovil && (
        <Box sx={{ position: "absolute", top: 8, right: 8 }}>
          <Tooltip
            title={
              facturaColapsada(factura.id)
                ? "Mostrar factura"
                : "Ocultar factura"
            }
          >
            <IconButton
              size="small"
              onClick={() => toggleFacturaColapsada(factura.id)}
              sx={{ ...iconBtnSx, color: acento }}
            >
              {facturaColapsada(factura.id) ? (
                <ExpandMoreIcon fontSize="small" />
              ) : (
                <ExpandLessIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      )}

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        rowGap={1}
        gap={1.5}
        // En celular el hueco entre título y chip se achica a 8px:
        // con el de 12px de siempre, "Pendiente despacho" no
        // alcanzaba a compartir línea con el título por unos pocos
        // píxeles y el chip se iba abajo aunque hubiera casi lugar.
        columnGap={esMovil ? 1 : 1.5}
        // Deja libre la esquina para la flecha flotante de arriba.
        // El mínimo para no montarse con ella son 22px (medido en
        // pantalla); unos pocos más de aire para que no quede
        // pegado.
        sx={esMovil ? { pr: 5 } : undefined}
      >
        <Box>
          <Typography fontWeight="bold">
            Factura {datos.numeroFactura ?? "s/n"}
          </Typography>
          {/* Antes ocupaba una columna dentro del cuadro de pago. */}
          {fecha && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", lineHeight: 1.3 }}
            >
              Creada el {fecha}
            </Typography>
          )}
        </Box>
        {/* Con la factura plegada, en computador, el resumen de la
            cuenta ocupa el hueco que queda entre el titulo y los
            botones. Va sobre la pizarra del tema, que tiene fondo
            oscuro fijo en los dos modos. */}
        {!isFullScreen &&
          facturaColapsada(factura.id) &&
          renderPizarraTotales(casillasDeCuenta(cuenta), {
            // Entre 916 y 1200px el hueco que dejan el titulo, los
            // cinco botones y el chip de estado (190px fijos) no
            // pasa de unos 300px, y cuatro importes de siete cifras
            // ahi se montan entre si. Asi que en ese tramo la
            // tarjeta pasa a su propia fila, con todo el ancho; de
            // 1200px en adelante si entra en el hueco.
            flexGrow: 1,
            flexBasis: { md: "100%", lg: 0 },
            order: { md: 1, lg: 0 },
          })}

        <Stack direction="row" spacing={1} alignItems="center">
          {!esMovil && iconosFactura}
          {chipEstado}
          {/* En celular la flecha ya va flotando en la esquina,
              arriba; acá solo se repite para pantallas más anchas,
              donde comparte línea con el chip sin problema. */}
          {!esMovil && (
            <Tooltip
              title={
                facturaColapsada(factura.id)
                  ? "Mostrar factura"
                  : "Ocultar factura"
              }
            >
              <IconButton
                size="small"
                onClick={() => toggleFacturaColapsada(factura.id)}
                sx={{ ...iconBtnSx, color: acento }}
              >
                {facturaColapsada(factura.id) ? (
                  <ExpandMoreIcon fontSize="small" />
                ) : (
                  <ExpandLessIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      {/* Hasta 915px la pizarra completa no entra en el hueco del
          encabezado, así que la factura plegada muestra debajo la
          versión corta: al recorrer la lista lo que se busca es
          cuánto es y cuánto falta, no editarla.

          En celular los botones tienen su propio renglón —el mismo
          que ocupa la pizarra— y vuelven al desplegar la factura; de
          600px en adelante ya están arriba, en el encabezado. */}
      {isFullScreen &&
        (facturaColapsada(factura.id) ? (
          <Box sx={{ mt: 1 }}>
            {renderPizarraTotales(
              casillasDeCuenta(cuenta, { resumida: true }),
            )}
          </Box>
        ) : (
          esMovil && (
            <Stack direction="row" alignItems="center" sx={{ mt: 1 }}>
              {iconosFactura}
            </Stack>
          )
        ))}

      {/* Todo lo que va debajo del encabezado se pliega con la
          flecha de arriba, para poder recorrer varias facturas sin
          scrollear cada una entera. */}
      {!facturaColapsada(factura.id) && (
        <>
          {equiposOriginales.length > 0 && (
            <Box
              sx={{
                mt: 1.5,
                // El ancho se le pone al bloque ENTERO de la factura
                // —información de pago, equipos y cargos adicionales—
                // para que todo quede en la misma columna. Puesto más
                // adentro, los rótulos y sus flechas de plegado se
                // iban al extremo derecho de la pantalla mientras el
                // contenido quedaba a media grilla.
                width: {
                  sm:
                    columnasOriginales === 1
                      ? "calc(50% - 4px)"
                      : "100%",
                },
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography
                  variant="overline"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    lineHeight: 1.6,
                    color: colorPago,
                  }}
                >
                  <PaymentsIcon fontSize="small" />
                  Información de pago
                </Typography>
                {renderToggle("pagoGeneral")}
              </Stack>
              {mostrar("pagoGeneral") && (
                <RecuadroPago
                  pagos={pagosOriginales}
                  tipoPago={tipoPagoDe(grupoInicial)}
                  fecha={grupoInicial?.fechaSolicitud ?? datos.fechaCreacion}
                  color={colorPago}
                />
              )}

              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mt: 1 }}
              >
                <Typography
                  variant="overline"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    lineHeight: 1.6,
                    color: colorEquipos,
                  }}
                >
                  <ConstructionIcon fontSize="small" />
                  Equipos {equiposOriginales.length}
                </Typography>
                {renderToggle("equiposFactura")}
              </Stack>
              {mostrar("equiposFactura") && (
                <Box>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: `repeat(${columnasOriginales}, 1fr)`,
                      },
                      gap: 1,
                      mt: 1,
                    }}
                  >
                    {equiposOriginales.map((equipo, index) => (
                      <EquipoRow
                        key={`original-${index}`}
                        equipo={equipo}
                        color={colorEquipos}
                        fechaPedido={grupoInicial?.fechaSolicitud ?? datos.fechaCreacion}
                      />
                    ))}
                  </Box>

                  {/* Los cargos del lote original: los de la factura, sin
                      sumar los de los equipos agregados —cada lote muestra
                      los suyos. */}
                  <CargosAdicionales
                    equipos={equiposOriginales}
                    deposito={Number(adicionalesInicial.valorDeposito) || 0}
                    transporteTipo={transporteTipo}
                    transporteMonto={Number(adicionalesInicial.valorTransporte) || 0}
                    abierto={seccionAbierta(factura.id, "adicionales-factura")}
                    onToggle={() =>
                      toggleSeccion(factura.id, "adicionales-factura")
                    }
                  />
                </Box>
              )}
            </Box>
          )}

          {gruposAgregados.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography
                  variant="overline"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    lineHeight: 1.6,
                    color: colorEquiposAgregados,
                  }}
                >
                  <LibraryAddIcon fontSize="small" />
                  Equipos agregados {cantidadEquiposAgregados}
                </Typography>
                {renderToggle("equiposAgregados")}
              </Stack>
              {/* Cada lote —lo que se agregó de una sola vez— va
                  con sus equipos, después su pago y después sus
                  adicionales. */}
              {mostrar("equiposAgregados") &&
                gruposAgregados.map((lote, indiceLote) => {
                  // Cuántas columnas ocupa este lote: una sola si
                  // trae un equipo, dos si trae dos o más. El ancho
                  // se le pone al lote COMPLETO —no solo a la fila de
                  // equipos— para que su información de pago y sus
                  // cargos adicionales queden en la misma columna que
                  // el equipo. Sueltos se iban a todo lo ancho y el
                  // equipo quedaba a media pantalla con los datos
                  // desalineados debajo.
                  // Primero lo que sigue alquilado y despues lo devuelto:
                  // lo que hay que gestionar hoy va arriba y la parte
                  // cerrada queda al final. Sin esto el orden lo decidia el
                  // momento en que se partio el renglon, que no le dice nada
                  // a nadie. El sort de JS es estable, asi que dentro de cada
                  // grupo se respeta el orden en que se cargaron.
                  const equiposDelLote = [...(lote.equipos ?? [])].sort(
                    (a, b) => Number(estaDevuelto(a)) - Number(estaDevuelto(b)),
                  );
                  const adicionalesLote = adicionalesDe(lote);

                  const columnasLote = Math.min(
                    equiposDelLote.length,
                    2,
                  );

                  return (
                    <Box
                      key={`lote-${indiceLote}`}
                      sx={{
                        mt: 1,
                        // gap 1 = 8px, así que media pantalla es 50%
                        // menos la mitad de esa separación.
                        width: {
                          sm:
                            columnasLote === 1
                              ? "calc(50% - 4px)"
                              : "100%",
                        },
                        // Cada lote va en su propia tarjeta: sus
                        // equipos, su pago y sus cargos son un
                        // conjunto, y sueltos se confundían con los
                        // del lote de al lado. El fondo de la app la
                        // separa de los recuadros de adentro, que
                        // son de color de tarjeta.
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: "background.default",
                        border: "1px solid",
                        borderColor: alpha(colorEquiposAgregados, 0.4),
                      }}
                    >
                      {/* El pago va PRIMERO, igual que en el alta de la
                          factura: lo primero que se pregunta de un equipo
                          agregado es si ya se pago. Antes cada bloque
                          arrancaba distinto segun donde estuviera. */}
                      <Box>
                        <Typography
                          variant="overline"
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            lineHeight: 1.6,
                            color: colorPago,
                          }}
                        >
                          <PaymentsIcon fontSize="small" />
                          Información de pago
                        </Typography>
                        <RecuadroPago
                          pagos={pagosDe(lote)}
                          tipoPago={tipoPagoDe(lote)}
                          fecha={lote.fechaSolicitud}
                          color={colorPago}
                          // "Pago inicial" hay uno solo y es el del alta de
                          // la factura. Lo de un equipo agregado se paga
                          // cuando se agrega, no al principio.
                          rotuloTipoPago="Tipo de pago"
                        />
                      </Box>

                      <Box
                        sx={{
                          mt: 1,
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "1fr",
                            sm: `repeat(${columnasLote}, 1fr)`,
                          },
                          gap: 1,
                        }}
                      >
                        {equiposDelLote.map((equipo, index) => (
                          <EquipoRow
                            key={`agregado-${indiceLote}-${index}`}
                            equipo={equipo}
                            color={colorEquiposAgregados}
                            fechaPedido={lote.fechaSolicitud}
                          />
                        ))}
                      </Box>

                      <CargosAdicionales
                        equipos={lote.equipos ?? []}
                        deposito={Number(adicionalesLote.valorDeposito) || 0}
                        transporteTipo={adicionalesLote.transporte || null}
                        transporteMonto={
                          Number(adicionalesLote.valorTransporte) || 0
                        }
                        abierto={seccionAbierta(
                          factura.id,
                          `lote-adicionales-${indiceLote}`,
                        )}
                        onToggle={() =>
                          toggleSeccion(
                            factura.id,
                            `lote-adicionales-${indiceLote}`,
                          )
                        }
                      />
                    </Box>
                  );
                })}
            </Box>
          )}

          {/* Los abonos van al final de todo lo que se despachó:
              después de los equipos agregados si los hay, y si no,
              después de los equipos de la factura. */}
          {abonos.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography
                  variant="overline"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    lineHeight: 1.6,
                    color: colorAbonos,
                  }}
                >
                  <SavingsIcon fontSize="small" />
                  Abonos
                </Typography>
                {renderToggle("abonos")}
              </Stack>
              {mostrar("abonos") && (
                <Box sx={{ mt: 0.5 }}>
                  <ListaAbonos abonos={abonos} color={colorAbonos} />
                </Box>
              )}
            </Box>
          )}

          <EstadoCuentaFactura
            factura={factura}
            cuenta={cuenta}
            facturaEstado={facturaEstado}
            abierto={seccionAbierta(factura.id, "pagoTotal")}
            onToggle={() => toggleSeccion(factura.id, "pagoTotal")}
            onDevolverSaldo={onDevolverSaldo}
          />
        </>
      )}
    </Box>
  );
}

FacturaCard.propTypes = {
  factura: PropTypes.object.isRequired,
  facturaColapsada: PropTypes.func.isRequired,
  toggleFacturaColapsada: PropTypes.func.isRequired,
  seccionAbierta: PropTypes.func.isRequired,
  toggleSeccion: PropTypes.func.isRequired,
  onAgregarEquipo: PropTypes.func.isRequired,
  onRegistrarDevolucion: PropTypes.func.isRequired,
  onEditar: PropTypes.func.isRequired,
  onEliminar: PropTypes.func.isRequired,
  onDevolverSaldo: PropTypes.func.isRequired,
};
