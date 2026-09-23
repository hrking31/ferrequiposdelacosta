// La tarjeta de UNA factura dentro del detalle del cliente: el encabezado con
// su número y su estado, los equipos (los del alta y los agregados después,
// cada lote con su pago y sus cargos), los abonos y el estado de cuenta.
//
// Acá se arma la factura completa; cada pieza de adentro tiene su archivo:
// EquipoRow (la fila de un equipo), RecuadroPago y ListaAbonos (la plata que
// entró), CargosAdicionales (IVA y transporte), RecuadroDeposito (la
// garantía, aparte de la factura) y EstadoCuentaFactura (el cierre con lo que
// falta cobrar).
//
// El plegado —el de la factura entera y el de cada sección— vive en la
// pantalla, no acá: así abrir una factura no se pierde al recargar la lista
// después de un abono o una edición.
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
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
import RecuadroDeposito from "./RecuadroDeposito";
import EstadoCuentaFactura from "./EstadoCuentaFactura";
import { usePantallaCompacta } from "../../Utils/pantalla";
import IconoDeposito from "./IconoDeposito";
import {
  casillasDeCuenta,
  detenerToque,
  iconBtnSx,
  renderContenidoPlano,
  propsRenglonPlegable,
  renderFlechaPlegable,
  renderPizarraTotales,
  renderRecuadroBloque,
  renderRotuloEstadoEquipo,
  sxRenglonPlegable,
} from "./recuadrosCuenta";
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
  const isFullScreen = usePantallaCompacta();
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
  const colorDeposito = theme.palette.custom.seccionDeposito;
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

  // BORRAR UNA FACTURA ES SOLO DEL ADMINISTRADOR. No se deshace: se lleva los
  // abonos, los despachos y la historia de cada equipo, y descuadra los
  // números del mes y cualquier cuenta de cobro que la mencione. Mismo
  // criterio que el buzón de cotizaciones y las cuentas de cobro.
  //
  // Esconder el botón no alcanza —la regla de Firestore es la que de verdad
  // lo impide—, pero evita que quien no puede lo intente.
  const esAdministrador = useSelector((state) => state.user.role) === "administrador";

  // Con movimientos encima solo se borra la FINALIZADA: ahí ya no hay nada
  // abierto —los equipos volvieron y la plata está saldada— y lo que queda es
  // un registro que el administrador puede decidir que sobra. La que todavía
  // está viva se arregla, no se borra.
  const sePuedeEliminar = !tieneMovimientos || facturaEstado === "finalizada";
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
  // En celular el rótulo entero abre y cierra su bloque; la flecha queda de
  // señal. En computador no hay nada que plegar: se ve todo.
  const renderToggle = (seccion) =>
    esMovil && renderFlechaPlegable(seccionAbierta(factura.id, seccion), acento);
  const propsSeccion = (seccion, etiqueta) =>
    esMovil
      ? propsRenglonPlegable({
          abierto: seccionAbierta(factura.id, seccion),
          alternar: () => toggleSeccion(factura.id, seccion),
          etiqueta,
        })
      : {};
  const sxSeccion = esMovil ? sxRenglonPlegable : {};
  // El panel de totales de la factura plegada usa el mismo recuerdo que los
  // bloques de adentro, con su propia clave.
  const pizarraAbierta = seccionAbierta(factura.id, "pizarra");
  const alternarPizarra = () => toggleSeccion(factura.id, "pizarra");

  // ── Los bloques de la factura, en el celular ───────────────────────────
  //
  // Abierta, una factura con dos despachos son treinta renglones: no se
  // recorre. Así que en el celular cada parte —el despacho inicial, cada
  // despacho agregado, los abonos y el total— se presenta como UN recuadro
  // con su rótulo, del color de esa parte, y lo demás queda adentro. Todos
  // arrancan cerrados: lo único que se ve al abrir la factura es el panel
  // oscuro con la cuenta.
  //
  // En computador devuelve el contenido tal cual, sin envolver: allá entra
  // todo a la vez y el recuadro solo agregaría un clic.
  // Los bloques de adentro de un despacho —pago y equipos— dentro de su
  // propio recuadro del color que ya tiene su rótulo, para que se lean como
  // cajas y no como una lista corrida. Su rótulo ya abre y cierra; acá solo
  // se los enmarca. En computador no se envuelve nada.
  const enRecuadro = (color, clave, contenido) =>
    esMovil ? (
      <Box sx={{ mt: 0.75 }} key={clave}>
        {renderRecuadroBloque(color, contenido, clave)}
      </Box>
    ) : (
      contenido
    );

  const renderBloqueMovil = (
    clave,
    // `extra` va pegado al rótulo (la fecha de un despacho); `derecha` se va
    // al otro extremo del renglón, antes de la flecha (el estado de un
    // equipo, que se busca de un vistazo en la misma columna para todos).
    { rotulo, Icono, color, extra, derecha, sinRecuadro = false },
    contenido,
  ) => {
    if (!esMovil) return contenido;
    const abierto = seccionAbierta(factura.id, clave);

    const cuerpo = (
      <>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              {...propsRenglonPlegable({
                abierto,
                alternar: () => toggleSeccion(factura.id, clave),
                etiqueta: rotulo,
              })}
              sx={sxRenglonPlegable}
            >
              <Typography
                variant="overline"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  lineHeight: 1.6,
                  color,
                }}
              >
                <Icono fontSize="small" />
                {rotulo}
                {extra}
              </Typography>
              <Stack direction="row" alignItems="center" gap={0.75}>
                {derecha}
                {renderFlechaPlegable(abierto, acento)}
              </Stack>
            </Stack>
        {/* Lo de adentro frena el toque: si no, abrir un equipo cerraría
            el despacho entero que lo contiene. */}
        {abierto && (
          <Box onClick={detenerToque}>
            {sinRecuadro ? renderContenidoPlano(color, contenido) : contenido}
          </Box>
        )}
      </>
    );

    return (
      // El bloque sin recuadro lleva el mismo relleno lateral que tienen los
      // enmarcados: si no, su rótulo arrancaba 12px antes que el de sus
      // hermanos y la columna quedaba en zigzag.
      <Box
        key={clave}
        sx={(theme) => ({
          mt: 1,
          px: sinRecuadro ? 1.5 : 0,
          [theme.pantallaAngosta]: { px: sinRecuadro ? 0.75 : 0 },
        })}
      >
        {sinRecuadro ? cuerpo : renderRecuadroBloque(color, cuerpo, clave)}
      </Box>
    );
  };
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
        // El ancho lo pone la variante, desde el tema (anchoChip.estado):
        // es el mismo para los cinco estados y para las otras pantallas que
        // los muestran. Acá estaba escrito a mano y pisaba al de la variante.
      }}
    />
  );

  const iconosFactura = (
    // En celular, 24px entre uno y otro: son botones chicos que se tocan con
    // el dedo, y a 12px el de al lado quedaba dentro de lo que tapa el
    // pulgar. En computador se apuntan con el mouse y van juntos.
    <Stack
      direction="row"
      spacing={esMovil ? 3 : 0.75}
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
      {esAdministrador && (
        <Tooltip
          title={
            sePuedeEliminar
              ? "Eliminar factura"
              : "Esta factura ya tiene abonos, equipos agregados o devoluciones: solo se puede borrar cuando quede finalizada"
          }
        >
          <span>
            <IconButton
              size="small"
              color="error"
              disabled={!sePuedeEliminar}
              onClick={() => onEliminar(factura)}
              sx={iconBtnSx}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Stack>
  );

  return (
    <Box
      sx={(theme) => ({
        p: 2,
        // Celular angosto: la mitad de borde a los lados, para que el
        // contenido tenga el ancho que le falta.
        [theme.pantallaAngosta]: { px: 1 },
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
      })}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        // En celular el chip se alinea con el número, arriba, porque
        // debajo del número va la fecha y el bloque mide dos renglones.
        alignItems={esMovil ? "flex-start" : "center"}
        // En celular NADA se envuelve: el chip tiene que quedarse en la
        // esquina de arriba pase lo que pase. Medido en 360px, el renglón
        // deja 294px y el chip se lleva 120 fijos; el que cede es el
        // título, que sobra de ancho.
        flexWrap={esMovil ? "nowrap" : "wrap"}
        rowGap={1}
        gap={1.5}
        // En celular el hueco entre título y chip se achica a 8px:
        // con el de 12px de siempre, "Pendiente despacho" no
        // alcanzaba a compartir línea con el título por unos pocos
        // píxeles y el chip se iba abajo aunque hubiera casi lugar.
        columnGap={esMovil ? 1 : 1.5}
        // En celular el encabezado entero pliega y despliega la factura.
        // Antes esto era una flecha clavada en la esquina de la tarjeta, que
        // obligaba a reservarle 40px a la derecha —y esos 40px eran justo los
        // que le faltaban al chip para no caerse al renglón de abajo—.
        {...(esMovil
          ? propsRenglonPlegable({
              abierto: !facturaColapsada(factura.id),
              alternar: () => toggleFacturaColapsada(factura.id),
              etiqueta: facturaColapsada(factura.id)
                ? "Mostrar factura"
                : "Ocultar factura",
            })
          : {})}
        sx={sxSeccion}
      >
        {/* El número manda —es por donde se busca una factura— así que va
            más grande y con la flecha al lado, en el renglón de arriba. En
            computador la fecha lo acompaña en la misma línea; en celular baja
            al renglón de abajo para dejarle el ancho al chip. */}
        <Stack
          direction={esMovil ? "column" : "row"}
          alignItems={esMovil ? "flex-start" : "baseline"}
          sx={{ gap: esMovil ? 0 : 1, minWidth: 0 }}
        >
          <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
            Factura {datos.numeroFactura ?? "s/n"}
          </Typography>
          {fecha && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ whiteSpace: "nowrap" }}
            >
              {fecha}
            </Typography>
          )}
        </Stack>
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

        {/* El chip no se achica ni se parte: en celular es lo único que tiene
            el ancho fijo, y el título de al lado es el que cede. */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ flexShrink: 0 }}
        >
          {!esMovil && iconosFactura}
          {chipEstado}
          {/* Después del chip, en la misma esquina: las dos cosas que dicen
              en qué anda la factura y cómo abrirla se leen juntas, y el
              título se queda solo con su número y su fecha. */}
          {esMovil &&
            renderFlechaPlegable(!facturaColapsada(factura.id), acento)}
          {/* En celular la factura se pliega tocando el encabezado, así que
              acá la flecha-botón solo va en pantallas más anchas, donde
              comparte línea con el chip sin problema. */}
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
          // En celular el panel también se toca: cerrado dice cuánto es y
          // cuánto falta —que es lo que se busca al recorrer la lista—, y
          // abierto suma las otras dos, Pagado y Abonos, de a dos por
          // renglón. Las cuatro en una sola fila no entran: son importes de
          // siete cifras en 294px.
          <Box
            {...(esMovil
              ? propsRenglonPlegable({
                  abierto: pizarraAbierta,
                  alternar: alternarPizarra,
                  etiqueta: pizarraAbierta
                    ? "Ocultar el resto de la cuenta"
                    : "Ver la cuenta completa",
                })
              : {})}
            sx={{ mt: 1, ...sxSeccion }}
          >
            {renderPizarraTotales(
              casillasDeCuenta(cuenta, {
                resumida: !esMovil || !pizarraAbierta,
              }),
              undefined,
              {
                cuadricula: esMovil && pizarraAbierta,
                // La única flecha que NO va con el acento: el panel tiene
                // fondo casi negro fijo en los dos modos, y en modo claro el
                // acento es el azul del logo, que ahí adentro desaparece. Va
                // con el amarillo del panel, que es el acento del modo
                // oscuro y el color con el que ya se escriben sus cifras.
                flechaAlLado:
                  esMovil &&
                  renderFlechaPlegable(pizarraAbierta, "custom.totalText"),
              },
            )}
          </Box>
        ) : (
          esMovil && (
            // A la derecha, del lado en que cae el pulgar al sostener el
            // teléfono.
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="flex-end"
              sx={{ mt: 1 }}
            >
              {iconosFactura}
            </Stack>
          )
        ))}

      {/* Todo lo que va debajo del encabezado se pliega con la
          flecha de arriba, para poder recorrer varias facturas sin
          scrollear cada una entera. */}
      {!facturaColapsada(factura.id) && (
        <>
          {equiposOriginales.length > 0 &&
            // En celular, todo el despacho de alta detrás de un solo rótulo.
            // Se llama "Equipo inicial" —sin fecha ni cantidad— porque la
            // fecha ya está arriba, en el encabezado, y la cantidad la dice
            // el rótulo "Equipos N" que tiene adentro.
            renderBloqueMovil(
              "despachoInicial",
              {
                rotulo: "Equipo inicial",
                Icono: ConstructionIcon,
                // El cian del tema: el azul lo llevan los equipos que van
                // adentro, y con los dos iguales no se sabía dónde terminaba
                // el despacho y empezaba un equipo.
                color: theme.palette.custom.seccionDespacho,
              },
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
              {enRecuadro(colorPago, "pagoGeneral", <>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                {...propsSeccion("pagoGeneral", "Información de pago")}
                sx={sxSeccion}
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
                /* La misma separación con su rótulo que el resto: el recuadro
                   no traía ninguna y quedaba pegado al texto. */
                <Box sx={{ mt: 0.5 }}>
                  <RecuadroPago
                    pagos={pagosOriginales}
                    tipoPago={tipoPagoDe(grupoInicial)}
                    fecha={grupoInicial?.fechaSolicitud ?? datos.fechaCreacion}
                    color={colorPago}
                    plano={esMovil}
                  />
                </Box>
              )}
              </>)}

              {/* EN CELULAR, UN BLOQUE POR EQUIPO. La lista agrupada bajo
                  "Equipos 3" obligaba a dos toques para llegar a uno, y los
                  marcos se anidaban de a tres —el despacho, la lista y cada
                  tarjeta—. Ahora cada equipo tiene su propio rótulo
                  numerado, su línea y su información, al mismo nivel que el
                  pago y los cargos. */}
              {esMovil
                ? equiposOriginales.map((equipo, index) =>
                    renderBloqueMovil(
                      `equipo-inicial-${index}`,
                      {
                        rotulo: `Equipo ${index + 1}`,
                        Icono: ConstructionIcon,
                        color: colorEquipos,
                        derecha: renderRotuloEstadoEquipo(equipo, theme),
                      },
                      renderContenidoPlano(
                        colorEquipos,
                        <EquipoRow equipo={equipo} color={colorEquipos} plano />,
                      ),
                    ),
                  )
                : (<>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                {...propsSeccion(
                  "equiposFactura",
                  `Equipos ${equiposOriginales.length}`,
                )}
                sx={{ mt: esMovil ? 0 : 1, ...sxSeccion }}
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
                      mt: 0.5,
                      // Cada tarjeta mide lo suyo. Sin esto la cuadrícula las
                      // estira a la altura de la más alta, y al abrir la
                      // historia de un equipo la de al lado quedaba con un
                      // hueco vacío debajo.
                      alignItems: "start",
                    }}
                  >
                    {equiposOriginales.map((equipo, index) => (
                      <EquipoRow
                        key={`original-${index}`}
                        equipo={equipo}
                        color={colorEquipos}
                      />
                    ))}
                  </Box>
                </Box>
              )}
              </>)}

              {/* Los cargos del despacho de alta —los de la factura, sin
                  sumar los de los equipos agregados, que cada lote muestra
                  aparte—. Van FUERA del bloque de equipos: son un bloque
                  hermano, como el pago, y no una parte de la lista de
                  equipos. */}
              <CargosAdicionales
                equipos={equiposOriginales}
                transporteTipo={transporteTipo}
                transporteMonto={Number(adicionalesInicial.valorTransporte) || 0}
                abierto={seccionAbierta(factura.id, "adicionales-factura")}
                onToggle={() =>
                  toggleSeccion(factura.id, "adicionales-factura")
                }
                bloqueAbierto={seccionAbierta(factura.id, "bloque-adicionales")}
                onToggleBloque={() =>
                  toggleSeccion(factura.id, "bloque-adicionales")
                }
              />
            </Box>,
          )}

          {gruposAgregados.length > 0 && (
            <Box sx={{ mt: 1 }}>
              {/* Cada despacho —lo que se agregó de una sola vez— se dibuja
                  igual que el de al lado: su rótulo con la fecha en que entró
                  y, adentro, su pago, sus equipos y sus cargos.

                  No hay rótulo de bloque arriba: rotulaba al primer despacho
                  desde otro lugar que a los demás, así que el primero se leía
                  distinto y cualquier cambio había que hacerlo dos veces. */}
              {gruposAgregados.map((lote, indiceLote) => {
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

                  // En celular el despacho entero va detrás de su rótulo, con
                  // la fecha en que entró: es lo que lo distingue de los
                  // otros. Adentro ya no se repite.
                  return renderBloqueMovil(
                    `lote-${indiceLote}`,
                    {
                      rotulo: "Agregados",
                      Icono: LibraryAddIcon,
                      color: colorEquiposAgregados,
                      extra: lote.fechaSolicitud && (
                        <Box
                          component="span"
                          sx={{ color: "text.secondary", fontWeight: 400 }}
                        >
                          {formatearFecha(lote.fechaSolicitud)}
                        </Box>
                      ),
                    },
                    <Box
                      key={`lote-${indiceLote}`}
                      sx={{
                        // El primero lleva la separación de rótulo a
                        // contenido; los de abajo, la de bloque a bloque. Con
                        // la de bloque en el primero se sumaba a la del
                        // contenedor y quedaba al doble de distancia; sin
                        // ninguna, pegado al rótulo.
                        mt: indiceLote === 0 ? 0.5 : 1,
                        // gap 1 = 8px, así que media pantalla es 50%
                        // menos la mitad de esa separación.
                        width: {
                          sm:
                            columnasLote === 1
                              ? "calc(50% - 4px)"
                              : "100%",
                        },
                      }}
                    >
                      {!esMovil && lote.fechaSolicitud && (
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
                          Agregados
                          <Box
                            component="span"
                            sx={{ color: "text.secondary", fontWeight: 400 }}
                          >
                            {formatearFecha(lote.fechaSolicitud)}
                          </Box>
                        </Typography>
                      )}

                      {/* Cada lote va en su propia tarjeta: sus equipos, su
                          pago y sus cargos son un conjunto, y sueltos se
                          confundían con los del lote de al lado. El fondo de
                          la app la separa de los recuadros de adentro, que son
                          de color de tarjeta.

                          El rótulo queda FUERA, apoyado encima, como todos los
                          rótulos de la ficha. */}
                      <Box
                        sx={
                          esMovil
                            ? // En celular el despacho YA va dentro de su
                              // recuadro violeta, con su rótulo y su fecha:
                              // este de adentro era un segundo marco del
                              // mismo color a 12px del primero.
                              undefined
                            : {
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: "background.default",
                                border: "1px solid",
                                borderColor: alpha(colorEquiposAgregados, 0.4),
                              }
                        }
                      >
                      {/* El pago va PRIMERO, igual que en el alta de la
                          factura: lo primero que se pregunta de un equipo
                          agregado es si ya se pago. Antes cada bloque
                          arrancaba distinto segun donde estuviera. */}
                      {renderBloqueMovil(
                        `lote-pago-${indiceLote}`,
                        {
                          rotulo: "Información de pago",
                          Icono: PaymentsIcon,
                          color: colorPago,
                        },
                        <Box>
                        {!esMovil && (
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
                        )}
                        <Box sx={{ mt: 0.5 }}>
                          <RecuadroPago
                            pagos={pagosDe(lote)}
                            tipoPago={tipoPagoDe(lote)}
                            fecha={lote.fechaSolicitud}
                            color={colorPago}
                            // "Pago inicial" hay uno solo y es el del alta de
                            // la factura. Lo de un equipo agregado se paga
                            // cuando se agrega, no al principio.
                            rotuloTipoPago="Tipo de pago"
                            plano={esMovil}
                          />
                        </Box>
                      </Box>,
                      )}

                      {/* Los equipos de ESTE lote, con su propio rótulo:
                          el bloque tenía uno solo arriba con el total, y un
                          tercer o cuarto despacho aparecía sin decir dónde
                          empezaba. Cada grupo se guarda junto en la base y acá
                          se lee igual: su pago, sus equipos y sus cargos.

                          Con varios despachos, el rótulo de cada uno va
                          arriba del todo, con su fecha. */}
                      {esMovil
                        ? equiposDelLote.map((equipo, index) =>
                            renderBloqueMovil(
                              `equipo-lote-${indiceLote}-${index}`,
                              {
                                rotulo: `Equipo ${index + 1}`,
                                Icono: ConstructionIcon,
                                // El mismo azul que los del alta: un equipo
                                // es un equipo, venga de donde venga. De qué
                                // despacho es lo dice el recuadro que lo
                                // contiene, no su propio color.
                                color: colorEquipos,
                                derecha: renderRotuloEstadoEquipo(equipo, theme),
                              },
                              renderContenidoPlano(
                                colorEquipos,
                                <EquipoRow
                                  equipo={equipo}
                                  color={colorEquipos}
                                  plano
                                />,
                              ),
                            ),
                          )
                        : (<>
                      <Typography
                        variant="overline"
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          lineHeight: 1.6,
                          mt: esMovil ? 0 : 1,
                          color: colorEquiposAgregados,
                        }}
                      >
                        <ConstructionIcon fontSize="small" />
                        Equipos {equiposDelLote.length}
                      </Typography>

                      <Box
                        sx={{
                          mt: 0.5,
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "1fr",
                            sm: `repeat(${columnasLote}, 1fr)`,
                          },
                          gap: 1,
                          // Igual que los del alta: cada tarjeta mide lo suyo.
                          alignItems: "start",
                        }}
                      >
                        {equiposDelLote.map((equipo, index) => (
                          <EquipoRow
                            key={`agregado-${indiceLote}-${index}`}
                            equipo={equipo}
                            color={colorEquiposAgregados}
                          />
                        ))}
                      </Box>
                      </>)}

                      {/* Los cargos del lote, FUERA de su lista de equipos:
                          son un bloque hermano, igual que en el despacho de
                          alta. */}
                      <CargosAdicionales
                        equipos={lote.equipos ?? []}
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
                        bloqueAbierto={seccionAbierta(
                          factura.id,
                          `lote-bloque-adicionales-${indiceLote}`,
                        )}
                        onToggleBloque={() =>
                          toggleSeccion(
                            factura.id,
                            `lote-bloque-adicionales-${indiceLote}`,
                          )
                        }
                      />
                      </Box>
                    </Box>,
                  );
                })}
            </Box>
          )}

          {/* EL DEPÓSITO, después de todos los despachos y antes de los
              abonos: es uno solo para la factura —la suma del de cada
              despacho— y no es un cargo, así que no va dentro de ninguno. */}
          {cuenta.deposito.pactado > 0 &&
            (esMovil ? (
              renderBloqueMovil(
                "deposito",
                { rotulo: "Depósito", Icono: IconoDeposito, color: colorDeposito },
                <RecuadroDeposito factura={factura} cuenta={cuenta} plano />,
              )
            ) : (
              <Box sx={{ mt: 1 }}>
                <Typography
                  variant="overline"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    lineHeight: 1.6,
                    color: colorDeposito,
                  }}
                >
                  <IconoDeposito fontSize="small" />
                  Depósito
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <RecuadroDeposito factura={factura} cuenta={cuenta} />
                </Box>
              </Box>
            ))}

          {/* Los abonos van al final de todo lo que se despachó:
              después de los equipos agregados si los hay, y si no,
              después de los equipos de la factura. */}
          {abonos.length > 0 &&
            (esMovil ? (
              // En celular su rótulo ya es la cabecera del recuadro, así que
              // adentro va solo la lista.
              renderBloqueMovil(
                "abonos",
                { rotulo: "Abonos", Icono: SavingsIcon, color: colorAbonos },
                <Box sx={{ mt: 0.5 }}>
                  <ListaAbonos abonos={abonos} color={colorAbonos} plano={esMovil} />
                </Box>,
              )
            ) : (
            <Box sx={{ mt: 1 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                {...propsSeccion("abonos", "Abonos")}
                sx={sxSeccion}
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
                  <ListaAbonos abonos={abonos} color={colorAbonos} plano={esMovil} />
                </Box>
              )}
            </Box>
            ))}

          <EstadoCuentaFactura
            factura={factura}
            cuenta={cuenta}
            facturaEstado={facturaEstado}
            abierto={seccionAbierta(factura.id, "pagoTotal")}
            onToggle={() => toggleSeccion(factura.id, "pagoTotal")}
            estadoAbierto={seccionAbierta(factura.id, "estadoCuenta")}
            onToggleEstado={() => toggleSeccion(factura.id, "estadoCuenta")}
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
