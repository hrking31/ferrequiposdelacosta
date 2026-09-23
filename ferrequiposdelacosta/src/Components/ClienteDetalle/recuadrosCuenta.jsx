// Las piezas visuales que comparten la tarjeta del cliente y la de cada
// factura: los recuadros de color que envuelven cada bloque, la fila de datos
// que va adentro, el molde de los botones de acción y la pizarra oscura del
// estado de cuenta. Vivían dentro de ClienteDetalle.jsx; se sacaron acá para
// que FacturaCard.jsx pueda usarlas sin depender de su pantalla.
//
// Son funciones que devuelven JSX, no componentes: se llaman como
// renderPizarraTotales(...) desde el JSX del que las usa.
import { alpha } from "@mui/material/styles";
import {
  Box,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PaymentsIcon from "@mui/icons-material/Payments";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import SavingsIcon from "@mui/icons-material/Savings";
import IconoDeposito from "./IconoDeposito";
import nequiLogo from "../../assets/mediosPago/nequi.png";
import bancolombiaLogo from "../../assets/mediosPago/bancolombia.png";
import daviplataLogo from "../../assets/mediosPago/daviplata.png";
import {
  calcularEstadoEquipo,
  ESTADO_EQUIPO_INFO,
  ROTULO_ESTADO_MAS_LARGO,
} from "./facturaUtils";
import { formatearMonedaOVacio } from "../../Utils/formato";

// Cada medio de pago con su logo (ver MODOS_PAGO en facturaUtils.js). "Nequi"
// y "Nequi A" son dos cuentas de personas distintas —Yaz y Armando— con el
// mismo logo, por eso la primera lleva el nombre escrito al lado. Lo guardado
// en Firestore no cambia: acá solo se traduce lo que se ve.
const LOGOS_PAGO = {
  Nequi: nequiLogo,
  "Nequi A": nequiLogo,
  Bancolombia: bancolombiaLogo,
  Daviplata: daviplataLogo,
};

// Los cuatro logos miden lo mismo, así el renglón queda parejo.
const TAMANO_LOGO_PAGO = { xs: 20, sm: 26 };

export const renderMedioPago = (medio) => {
  const logo = LOGOS_PAGO[medio];

  return (
    // El `title` muestra de qué medio se trata al parar el mouse encima.
    <Box
      component="span"
      title={medio}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        verticalAlign: "middle",
      }}
    >
      {logo ? (
        <Box
          component="img"
          src={logo}
          alt={medio}
          // "contain" porque el de Nequi es más alto que ancho: así entra
          // entero en vez de recortarse o deformarse.
          sx={{
            height: TAMANO_LOGO_PAGO,
            width: TAMANO_LOGO_PAGO,
            objectFit: "contain",
            display: "block",
          }}
        />
      ) : (
        <PaymentsIcon
          sx={{ fontSize: TAMANO_LOGO_PAGO, color: "custom.pagoEfectivo" }}
        />
      )}

      {medio === "Nequi" && (
        <Typography
          component="span"
          variant="caption"
          fontWeight="bold"
          sx={{ color: "text.primary", lineHeight: 1 }}
        >
          Yaz
        </Typography>
      )}
    </Box>
  );
};

// El recuadro de color que envuelve cada bloque de una factura: la
// informacion de pago, los cargos adicionales y los abonos. Todo su aspecto
// —el borde, el resplandor y el degradado— sale del color que se le pase,
// que es el del bloque al que pertenece.
export const renderRecuadroBloque = (color, contenido, key) => (
  <Box
    key={key}
    sx={(theme) => ({
      p: 1.5,
      // En el celular angosto los bordes se aprietan a la mitad: el aire que
      // sobra a los lados le hace falta al contenido.
      [theme.pantallaAngosta]: { px: 0.75 },
      borderRadius: 1,
      bgcolor: "background.paper",
      border: "1px solid",
      // Todo el recuadro se tiñe del color del bloque: el borde, un
      // resplandor difuso alrededor y un degradado por encima.
      borderColor: color,
      // El resplandor va hacia ADENTRO: como sombra externa se derramaba
      // por fuera del borde y manchaba lo que tenía al lado.
      boxShadow: `inset 0 0 12px ${alpha(color, 0.2)}`,
      position: "relative",
      // Recorta el degradado al radio del borde: con inset 0 las esquinas
      // se le salían por encima.
      overflow: "hidden",
      "&::before": {
        content: '""',
        position: "absolute",
        inset: 0,
        borderRadius: "inherit",
        // El degradado cubre el recuadro completo: entra fuerte por la
        // esquina de arriba y se va aclarando en diagonal, pero sin llegar
        // nunca a transparente.
        background: `linear-gradient(135deg, ${alpha(color, 0.16)}, ${alpha(color, 0.04)})`,
        pointerEvents: "none",
      },
    })}
  >
    {contenido}
  </Box>
);

// Los datos de adentro de un recuadro: cada uno es una columna con el rotulo
// arriba y el valor abajo, separadas por una linea vertical. En celular no
// entran cuatro columnas, asi que se apilan y la linea desaparece.
//
// Un dato puede traer `contenido` en vez de `valor` cuando lo que va abajo no
// es texto sino algo dibujado, como el logo del medio de pago.
export const renderFilaDatos = (color, datos) => (
  <Stack
    direction={{ xs: "column", sm: "row" }}
    rowGap={1}
    sx={{ minWidth: 0 }}
    divider={
      <Divider
        orientation="vertical"
        flexItem
        sx={{ my: 0.5, display: { xs: "none", sm: "block" } }}
      />
    }
  >
    {datos.map(
      ({
        clave,
        rotulo,
        valor,
        contenido,
        Icono,
        colorIcono,
        // Una casilla puede ser la que abre algo —la del IVA abre su
        // desglose—: ahí recibe las props del renglón tocable y su estilo,
        // para que se toque ELLA y no el bloque entero.
        props: propsCasilla,
        sxCasilla,
        // Algo que acompaña al rótulo a su derecha, como la flecha que avisa
        // que esa casilla abre un detalle.
        rotuloExtra,
      }) => (
      <Box
        key={clave}
        {...(propsCasilla || {})}
        sx={{ flex: 1, minWidth: 0, px: { sm: 0.75 }, ...(sxCasilla || {}) }}
      >
        {/* El rótulo lleva el color del bloque; el valor va en el color
            normal del texto, que es donde se lee la cifra.

            El ícono, cuando el dato trae uno, dice de qué se trata sin leer:
            un camión es el flete, una alcancía el depósito. Va del mismo color
            que el rótulo, que es el del bloque. */}
        <Typography
          variant="rotuloDato"
          sx={{ color, display: "flex", alignItems: "center", gap: 0.5 }}
        >
          {/* El ícono va dentro de un círculo, como los hitos de la historia
              de un equipo: suelto se confundía con el texto del rótulo.
              
              Y cada uno lleva SU color, no el del bloque: azul lo que es
              tiempo o movimiento, verde la plata que entró, el acento los
              totales y el teal lo que está guardado en garantía. El del bloque
              queda de respaldo para un dato que no traiga el suyo. */}
          {Icono && (
            <Box
              component="span"
              sx={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                color: colorIcono ?? color,
                bgcolor: alpha(colorIcono ?? color, 0.18),
              }}
            >
              <Icono sx={{ fontSize: "0.75rem" }} />
            </Box>
          )}
          {rotulo}
          {rotuloExtra}
        </Typography>
        {contenido || <Typography variant="valorDato">{valor}</Typography>}
      </Box>
      ),
    )}
  </Stack>
);

// El molde de los botones de acción de esta pantalla: un cuadrito con borde,
// que los agrupa visualmente en vez de dejarlos sueltos. Lo usan los de cada
// factura y —en pantalla chica— los del encabezado del cliente.
export const iconBtnSx = {
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 1,
  p: 0.5,
};

// ── Plegar tocando el renglón (solo celular) ───────────────────────────
//
// La flecha mide 20px y el dedo tapa 40: en el celular había que apuntarle.
// Así que el renglón ENTERO abre y cierra, y la flecha se queda únicamente
// como señal —apunta abajo cuando hay algo escondido y gira al abrirse—.
//
// Tocable es solo el renglón del rótulo, nunca lo que está desplegado debajo:
// si no, arrastrar el dedo para bajar por la lista lo cerraría sin querer.
//
// No es un ButtonBase a propósito: estos renglones pueden llevar otros botones
// adentro, y un <button> dentro de otro es HTML inválido.
export const propsRenglonPlegable = ({ abierto, alternar, etiqueta }) => ({
  role: "button",
  tabIndex: 0,
  "aria-expanded": abierto,
  "aria-label": etiqueta,
  onClick: alternar,
  onKeyDown: (evento) => {
    if (evento.key === "Enter" || evento.key === " ") {
      // Sin esto, la barra espaciadora además scrollea la página.
      evento.preventDefault();
      alternar();
    }
  },
});

// El estilo que acompaña al renglón tocable. Va aparte de las props porque
// cada renglón trae su propio sx y hay que mezclarlos, no pisarlos.
export const sxRenglonPlegable = {
  cursor: "pointer",
  // Sin esto, el segundo toque seguido selecciona el texto del rótulo en vez
  // de volver a plegar.
  userSelect: "none",
  // Quita el destello gris que Chrome de Android pinta sobre lo que se toca.
  WebkitTapHighlightColor: "transparent",
};

// LA CUENTA EN RENGLONES, dentro del panel oscuro: el rótulo a la izquierda,
// la cifra a la derecha y cada concepto en su color —el total en ámbar, lo
// que entró en verde y azul, lo que falta en rojo—. Las clases ("fila",
// "fila total"…) las pinta el tema, en la variante "totales" del Paper.
//
// Es la forma en que la ficha del cliente muestra su estado de cuenta, y se
// sacó acá para que Seguimiento muestre la misma cuenta de la misma manera.
// La ficha agrega sobre esto sus propios renglones —lo entregado, lo retenido—
// y el botón de devolver.
// EL RENGLÓN DEL DEPÓSITO dentro de la cuenta: la parte de lo que el cliente
// entregó que quedó de garantía y no pagó la factura. Con la 8154: Pagado
// $1.514.000, Depósito $500.000, Abonos $1.142.400 → saldo $0 sobre un total
// de $2.156.400. Lo retenido por daños no va: esa parte sí pagó la factura
// —el cargo de los daños—.
export const depositoEnCuenta = (cuenta) =>
  Math.max(0, (cuenta.deposito?.recibido ?? 0) - (cuenta.deposito?.retenido ?? 0));

export const renderFilaDeposito = (cuenta) => {
  const monto = depositoEnCuenta(cuenta);
  if (monto <= 0) return null;
  return (
    <Box className="fila deposito">
      {/* El candado va DENTRO del texto y a su altura: en una caja aparte le
          sumaba alto al renglón y la cifra quedaba más abajo que las demás. */}
      <Typography variant="body2">
        <IconoDeposito
          sx={{ fontSize: "0.9rem", verticalAlign: "-0.15em", mr: 0.5 }}
        />
        Depósito
      </Typography>
      <Typography variant="body2">{formatearMonedaOVacio(monto)}</Typography>
    </Box>
  );
};

export const renderFilasDeCuenta = (cuenta) => (
  <>
    <Box className="fila total">
      <Typography variant="subtitle1" fontWeight="bold">
        Total factura
      </Typography>
      <Typography variant="subtitle1" fontWeight="bold">
        {formatearMonedaOVacio(cuenta.total)}
      </Typography>
    </Box>

    {cuenta.pagado > 0 && (
      <Box className="fila pagado">
        <Typography variant="body2">Pagado</Typography>
        <Typography variant="body2">
          {formatearMonedaOVacio(cuenta.pagado)}
        </Typography>
      </Box>
    )}

    {renderFilaDeposito(cuenta)}

    {cuenta.abonos > 0 && (
      <Box className="fila abono">
        <Typography variant="body2">Abonos</Typography>
        <Typography variant="body2">
          {formatearMonedaOVacio(cuenta.abonos)}
        </Typography>
      </Box>
    )}

    {cuenta.saldoAFavor > 0 ? (
      <Box className="fila ok" sx={{ mt: 1, mb: 0 }}>
        <Typography variant="body2" fontWeight="bold">
          Saldo a favor
        </Typography>
        <Typography variant="body2" fontWeight="bold">
          {formatearMonedaOVacio(cuenta.saldoAFavor)}
        </Typography>
      </Box>
    ) : (
      <Box
        className={cuenta.saldoPendiente > 0 ? "fila alerta" : "fila ok"}
        sx={{ mt: 1, mb: 0 }}
      >
        <Typography variant="body2" fontWeight="bold">
          Saldo pendiente
        </Typography>
        <Typography variant="body2" fontWeight="bold">
          {formatearMonedaOVacio(cuenta.saldoPendiente)}
        </Typography>
      </Box>
    )}
  </>
);

// EL MISMO CONTENIDO, SIN MARCO. Cuando el bloque ya va dentro de un recuadro
// —en el celular cada parte de la factura tiene el suyo—, el recuadro de
// adentro es un marco dentro de otro marco: dos bordes a 12px de distancia que
// no separan nada. Se cambia por una línea del color del bloque, que es lo
// único que hacía falta: cortar entre el rótulo y lo que cuenta.
//
// `sinLinea` para lo que ya trae su propio borde —el panel oscuro de los
// totales, que es una caja negra maciza—: ahí la línea queda pegada al canto
// del panel y se lee como un error de dibujo, no como una separación.
export const renderContenidoPlano = (color, contenido, { sinLinea } = {}) => (
  <Box
    sx={{
      mt: 0.75,
      ...(sinLinea
        ? null
        : {
            pt: 0.75,
            borderTop: "1px solid",
            borderColor: alpha(color, 0.4),
          }),
    }}
  >
    {contenido}
  </Box>
);

// EL RÓTULO DE ESTADO, para que lo pueda dibujar quien encabeza al equipo.
// En celular no va dentro de la tarjeta sino al lado del rótulo del bloque, y
// tiene que verse igual en los dos lugares: mismo molde del tema, mismo color
// por estado.
export const renderRotuloEstadoEquipo = (equipo, theme) => {
  const estado = calcularEstadoEquipo(equipo);
  const colorEstado =
    theme.palette.custom.estadoEquipo[estado] ??
    theme.palette.custom.estadoNeutro;

  return (
    <Box
      component="span"
      sx={{
        ...theme.rotuloEstado,
        borderColor: colorEstado,
        bgcolor: alpha(colorEstado, 0.12),
        color: colorEstado,
        // Todos los rótulos miden lo mismo —el ancho del más largo, escrito
        // en un pseudo-elemento sin alto—, que es la regla del tema para los
        // chips de estado: son listas, y con el ancho al gusto de cada texto
        // los bordes quedan en diagonal. Es CSS, no texto del documento, así
        // que no se lee ni aparece dos veces en una búsqueda.
        "&::after": {
          content: `"${ROTULO_ESTADO_MAS_LARGO}"`,
          display: "block",
          height: 0,
          overflow: "hidden",
          visibility: "hidden",
        },
      }}
    >
      {ESTADO_EQUIPO_INFO[estado]?.label ?? ""}
    </Box>
  );
};

// Para lo que queda DENTRO del renglón tocable pero ya desplegado: el toque
// muere ahí y no vuelve a plegar. Sin esto, tocar la historia de un equipo
// para leerla la cerraría.
export const detenerToque = (evento) => evento.stopPropagation();

// ── Un recuadro con su detalle plegado ─────────────────────────────────
//
// Lo que hace el recuadro del IVA, para cualquiera que tenga un resumen a la
// vista y un detalle detrás: el resumen siempre, el detalle debajo al abrirlo,
// y la flecha arriba a la derecha, DENTRO del recuadro.
//
// En computador la flecha es un botón. En celular es solo la señal: lo abre
// la casilla que lleva `propsCasillaQueAbre`, como la del IVA —tocar el
// bloque entero ya abre y cierra el bloque—.
export const renderFlechaDetalle = ({ abierto, alternar, color, esMovil, titulo }) =>
  esMovil ? (
    renderFlechaPlegable(abierto, color)
  ) : (
    <Tooltip title={abierto ? "Ocultar el detalle" : titulo}>
      <IconButton
        size="small"
        onClick={alternar}
        sx={{ ...iconBtnSx, color, flexShrink: 0 }}
      >
        {abierto ? (
          <ExpandLessIcon fontSize="small" />
        ) : (
          <ExpandMoreIcon fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  );

// Lo que se le agrega a la casilla que abre el detalle en el celular.
export const casillaQueAbre = ({ abierto, alternar, titulo }) => ({
  props: propsRenglonPlegable({
    abierto,
    alternar,
    etiqueta: abierto ? "Ocultar el detalle" : titulo,
  }),
  sxCasilla: sxRenglonPlegable,
});

export const renderConDetalle = (resumen, detalle, flecha) => (
  <Stack direction="row" alignItems="flex-start" sx={{ gap: 1 }}>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      {resumen}
      {detalle && (
        <Box
          onClick={detenerToque}
          sx={{
            mt: 0.75,
            // La línea separa lo que se ve siempre del detalle que abre la
            // flecha, igual que en el IVA.
            pt: 0.75,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          {detalle}
        </Box>
      )}
    </Box>
    {flecha}
  </Stack>
);

// La flecha como señal: ya no es un botón, así que no la lee el lector de
// pantalla —el renglón que la contiene ya dice que se abre y se cierra—.
export const renderFlechaPlegable = (abierto, color) => (
  <Box
    component="span"
    aria-hidden="true"
    sx={{ display: "inline-flex", color, flexShrink: 0 }}
  >
    {abierto ? (
      <ExpandLessIcon fontSize="small" />
    ) : (
      <ExpandMoreIcon fontSize="small" />
    )}
  </Box>
);

// ── La pizarra del estado de cuenta ────────────────────────────────────
//
// Las casillas de una cuenta, en el orden en que se leen: cuánto es, cuánto
// entró y cuánto falta. La usan la tarjeta del cliente —sumando todas sus
// facturas— y cada factura plegada.
//
// `resumida` deja solo las dos que importan de un vistazo: en celular las
// cuatro no entran y los importes de siete cifras se montan entre sí.
export const casillasDeCuenta = (
  cuenta,
  { resumida = false, sobrePanel = true } = {},
) => {
  const aFavor = cuenta.saldoAFavor > 0;
  // Los tonos `light` están pensados para el panel oscuro fijo. Sobre el fondo
  // de una tarjeta —que cambia con el modo— pierden contraste, así que ahí
  // van los del tema.
  const tono = (claro, normal) => (sobrePanel ? claro : normal);

  const casillaTotal = {
    clave: "total",
    Icono: ReceiptLongIcon,
    rotulo: "Total",
    valor: formatearMonedaOVacio(cuenta.total),
    color: tono("custom.totalText", "text.primary"),
  };

  // Un solo renglón para las dos caras de lo mismo: lo que falta cobrar, o lo
  // que el cliente tiene a su favor si entregó de más.
  const casillaSaldo = {
    clave: "saldo",
    Icono: PendingActionsIcon,
    rotulo: aFavor ? "A favor" : "Saldo",
    valor: formatearMonedaOVacio(
      aFavor ? cuenta.saldoAFavor : cuenta.saldoPendiente,
    ),
    // Rojo solo si de verdad debe: un saldo en cero es una cuenta al día, y en
    // rojo se leía como deuda (la 8154, pagada y con su depósito por devolver).
    color:
      cuenta.saldoPendiente > 0
        ? tono("error.light", "error.main")
        : tono("success.light", "success.main"),
  };

  if (resumida) return [casillaTotal, casillaSaldo];

  // EL DEPÓSITO, solo mientras la empresa lo tiene en la mano: con equipos
  // afuera es la garantía, y resuelta la devolución es lo que falta
  // devolverle. Devuelto o usado para pagar, la casilla desaparece. Llega de
  // una factura (`deposito.guardado`) o sumado de todas (`depositoGuardado`).
  const depositoGuardado = cuenta.depositoGuardado ?? cuenta.deposito?.guardado ?? 0;
  const casillaDeposito =
    depositoGuardado > 0
      ? [
          {
            clave: "deposito",
            Icono: IconoDeposito,
            rotulo: "Depósito",
            valor: formatearMonedaOVacio(depositoGuardado),
            color: tono("custom.depositoText", "custom.seccionDeposito"),
          },
        ]
      : [];

  return [
    casillaTotal,
    {
      clave: "pagado",
      Icono: PaymentsIcon,
      rotulo: "Pagado",
      valor: formatearMonedaOVacio(cuenta.pagado),
      color: tono("success.light", "success.main"),
    },
    {
      clave: "abonos",
      Icono: SavingsIcon,
      rotulo: "Abonos",
      valor: formatearMonedaOVacio(cuenta.abonos),
      color: tono("info.light", "info.main"),
    },
    casillaSaldo,
    ...casillaDeposito,
  ];
};

// LA FILA DE CASILLAS: todas del mismo ancho, separadas por una línea
// vertical. Es el dibujo, sin fondo: lo usan la pizarra oscura de la cuenta y
// las condiciones de cada equipo en cartera, que van sobre el recuadro de su
// color.
//
// `colorDivisor` y el color de cada casilla los pone quien llama, porque no es
// lo mismo escribir sobre el panel oscuro que sobre el fondo de la tarjeta.
export const renderFilaDeCasillas = (
  casillas,
  { colorDivisor, columna = false } = {},
) => (
  <Stack
    direction={columna ? "column" : "row"}
    sx={{ minWidth: 0 }}
    // El divisor lleva margen arriba y abajo para no llegar a los bordes.
    // En columna el divisor se acuesta: la misma línea, pero separando
    // renglón de renglón en vez de columna de columna.
    divider={
      <Divider
        orientation={columna ? "horizontal" : "vertical"}
        flexItem
        sx={
          columna
            ? { mx: 0.5, borderColor: colorDivisor, opacity: 0.25 }
            : { my: 0.5, borderColor: colorDivisor, opacity: 0.25 }
        }
      />
    }
  >
    {casillas.map(({ clave, Icono, rotulo, valor, color, envolver, extra }) => (
      <Box
        key={clave}
        // En fila todas miden lo mismo; en columna cada una ocupa su
        // renglón y no hay nada que repartir.
        sx={{ flex: columna ? "none" : 1, minWidth: 0, color, px: 0.75, py: columna ? 0.5 : 0 }}
      >
        {/* El icono queda a la izquierda, alineado con el rotulo; como es
            mas alto que las dos lineas, ocupa el espacio que sobra abajo. El
            rotulo y el valor arrancan en el mismo punto. */}
        <Stack
          direction="row"
          alignItems="flex-start"
          gap={0.75}
          sx={{ minWidth: 0 }}
        >
          {/* Las dos son opcionales: una casilla puede llevar solo su
              contenido, sin ícono ni rótulo que lo anuncien. */}
          {Icono && <Icono fontSize="small" sx={{ flexShrink: 0 }} />}
          <Box sx={{ minWidth: 0 }}>
            {rotulo && (
              <Typography variant="rotuloDato">{rotulo}</Typography>
            )}
            {/* Un valor de siete cifras no entra en un cuarto del hueco y se
                montaba sobre el de al lado: achica en pantallas medianas. */}
            {/* Las cifras van en un solo renglón; un nombre de equipo, no:
                "TABLÓN DE MADERA PARA ANDAMIO" no entra en un cuarto del
                hueco y cortado no se reconoce. */}
            <Typography
              variant="valorDato"
              sx={{
                whiteSpace: envolver ? "normal" : "nowrap",
                fontSize: { lg: "1rem" },
              }}
            >
              {valor}
            </Typography>
            {/* Un dato que acompaña al valor sin competir con él: va debajo,
                chico y apagado. */}
            {extra && (
              <Typography variant="rotuloDato" sx={{ opacity: 0.85 }}>
                {extra}
              </Typography>
            )}
          </Box>
        </Stack>
      </Box>
    ))}
  </Stack>
);

// La pizarra de la cuenta: la misma fila, sobre el fondo oscuro fijo del tema
// (se lee igual de día que de noche). El `sx` que se le pase se suma al de
// acá, para acomodarla en el hueco de cada pantalla.
// LAS MISMAS CASILLAS EN DOS COLUMNAS. En el celular las cuatro de una cuenta
// no entran en un renglón —cada importe es de siete cifras y se montan entre
// sí—, así que van de a dos: Total y Pagado arriba, Abonos y Saldo abajo.
//
// Se arma con la misma fila de siempre, apilada: así las dos filas reparten el
// ancho igual y los importes de abajo caen justo bajo los de arriba.
export const renderCasillasEnCuadricula = (casillas, { colorDivisor } = {}) => {
  const filas = casillas.reduce((acumulado, casilla, indice) => {
    if (indice % 2 === 0) acumulado.push([casilla]);
    else acumulado[acumulado.length - 1].push(casilla);
    return acumulado;
  }, []);

  return (
    <Stack
      direction="column"
      sx={{ minWidth: 0 }}
      divider={
        <Divider
          orientation="horizontal"
          flexItem
          sx={{ mx: 0.5, borderColor: colorDivisor, opacity: 0.25 }}
        />
      }
    >
      {filas.map((fila) => (
        <Box
          key={fila.map((casilla) => casilla.clave).join("-")}
          sx={{ py: 0.5 }}
        >
          {renderFilaDeCasillas(fila, { colorDivisor })}
        </Box>
      ))}
    </Stack>
  );
};

// Las casillas del panel: en un renglón, o repartidas en dos columnas cuando
// son cuatro y la pantalla es angosta.
const renderCasillasDelPanel = (casillas, opciones) =>
  opciones.cuadricula
    ? renderCasillasEnCuadricula(casillas, {
        colorDivisor: "custom.panelText",
      })
    : renderFilaDeCasillas(casillas, {
        colorDivisor: "custom.panelText",
        ...opciones,
      });

export const renderPizarraTotales = (casillas, sx, opciones = {}) => (
  <Paper
    variant="totales"
    sx={{
      minWidth: 0,
      py: 1.25,
      px: 1.5,
      mt: 0,
      // POR ENCIMA del recuadro que lo contenga. Los recuadros de bloque
      // pintan un degradado de su color sobre todo lo que llevan adentro, y
      // este panel es negro opaco: el degradado se le montaba encima y le
      // cambiaba el negro por un tinte del color del bloque.
      position: "relative",
      zIndex: 1,
      // Reemplaza la sombra difusa de la variante por el relieve: luz arriba,
      // sombra abajo.
      boxShadow: (theme) => theme.palette.custom.panelRelieve,
      ...sx,
    }}
  >
    {/* Un rótulo adentro del panel, cuando la pantalla lo necesita. */}
    {opciones.encabezado}
    {/* La señal de que el panel se toca va A UN LADO, no debajo: puesta
        abajo le sumaba un renglón de alto al panel, y la tarjeta plegada
        está justamente para ocupar poco. */}
    {opciones.flechaAlLado ? (
      <Stack
        direction="row"
        // Con una sola fila la flecha va a media altura; con las dos filas
        // abiertas, arriba: a media altura del bloque caería en el medio de
        // la línea que separa las filas.
        alignItems={opciones.cuadricula ? "flex-start" : "center"}
        sx={{ minWidth: 0, gap: 0.5 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {renderCasillasDelPanel(casillas, opciones)}
        </Box>
        {opciones.flechaAlLado}
      </Stack>
    ) : (
      renderCasillasDelPanel(casillas, opciones)
    )}
  </Paper>
);
