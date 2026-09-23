// El cierre de la factura: a la izquierda los renglones que la componen
// (subtotal, IVA, transporte, daños) con el depósito aparte, y a la derecha el
// estado de cuenta —cuánto es, cuánto entró y cuánto falta—, con el botón
// para devolverle al cliente el depósito o lo que pagó de más.
//
// En celular todo esto se pliega tocando el rótulo "Total factura": al
// recorrer una lista larga lo que se busca primero es de qué factura se trata,
// no su cuenta al detalle.
import PropTypes from "prop-types";
import {
  Box,
  Button,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import PaidIcon from "@mui/icons-material/Paid";
import ScheduleIcon from "@mui/icons-material/Schedule";
import TollIcon from "@mui/icons-material/Toll";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ConstructionIcon from "@mui/icons-material/Construction";
import PercentIcon from "@mui/icons-material/Percent";
import HandymanIcon from "@mui/icons-material/Handyman";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { alpha } from "@mui/material/styles";
import {
  depositoPendiente,
  calcularTransporteTotal,
  datosFactura,
  entregasDe,
} from "./facturaUtils";
import IconoDeposito from "./IconoDeposito";
import {
  propsRenglonPlegable,
  renderContenidoPlano,
  renderRecuadroBloque,
  renderFlechaPlegable,
  sxRenglonPlegable,
} from "./recuadrosCuenta";
// Con alias: la moneda que deja el hueco vacío si no hay número.
import { formatearMonedaOVacio as formatearMoneda } from "../../Utils/formato";

export default function EstadoCuentaFactura({
  factura,
  // La cuenta ya calculada por la tarjeta: total, pagado, abonos y saldos.
  // Llega hecha y no se recalcula acá para que la factura y el encabezado del
  // cliente digan siempre lo mismo.
  cuenta,
  facturaEstado,
  abierto,
  onToggle,
  // El panel oscuro tiene su propio plegado, aparte del de los renglones.
  estadoAbierto,
  onToggleEstado,
  onDevolverSaldo,
}) {
  const theme = useTheme();
  const esMovil = useMediaQuery(theme.breakpoints.down("sm"));
  const acento = theme.palette.custom.accent;

  // Subtotal e IVA son los de HOY —con los días ampliados y los vencidos ya
  // sumados—, no los que decía la factura el día que se emitió. Tienen que
  // serlo porque el total de la derecha también lo es: con el subtotal de la
  // emisión, los renglones de la izquierda no cuadrarían con él.
  //
  // Ya no hay que armarlos a mano: la misma cuenta que da el total los trae.
  const subtotal = formatearMoneda(cuenta.subtotal);
  const iva = formatearMoneda(cuenta.iva > 0 ? cuenta.iva : undefined);
  // El mismo total que la pizarra de arriba: el depósito no está adentro, así
  // que no cambia al devolverse.
  const valorTotal = formatearMoneda(cuenta.total);

  // Depósito y transporte de TODA la factura: el de cada despacho, sumado.
  const depositoTotalFactura = cuenta.deposito.pactado;
  const transporteTotalFactura = calcularTransporteTotal(factura);

  // Lo cobrado al emitir la factura más lo de cada equipo agregado
  // después, y lo que el cliente fue abonando desde entonces. Si
  // pagó de más, el sobrante NO baja el saldo (que nunca es
  // negativo): sale aparte como saldo a favor.
  const totalAbonos = cuenta.abonos;
  const saldoPendienteNumero = cuenta.saldoPendiente;
  const saldoAFavorNumero = cuenta.saldoAFavor;

  // La cuenta cerró clavada: un solo pago por el total exacto, sin abonos y
  // sin nada a favor. Es el ÚNICO caso en que repetir "Pagado" debajo del
  // total no agrega nada, porque son el mismo número.
  //
  // En cualquier otro —falta plata, hubo abonos, o el cliente pagó de más—
  // ese renglón es justamente lo que explica cómo se llegó al saldo. Sin él,
  // una factura con saldo a favor mostraba "Total $714.000 / A favor
  // $286.000" y no había forma de saber que había entregado $1.000.000.
  // Con depósito tampoco: parte de lo pagado fue a la garantía, y el renglón
  // "Pagado" es lo que deja ver de dónde sale el renglón "Depósito".
  const cuentaCerroClavada =
    saldoPendienteNumero === 0 &&
    saldoAFavorNumero === 0 &&
    totalAbonos === 0 &&
    depositoTotalFactura === 0;

  // Se separan en dos grupos (izquierda: subtotal/iva, derecha:
  // transporte/daños) para poder acomodarlos en 2 columnas
  // prolijas en móvil, en vez de dejarlos ajustar solos.
  // Cada renglón con el ícono que ya lo representa en el resto de la ficha:
  // los equipos lo que se alquiló, el porcentaje el IVA, el camión el flete y
  // la herramienta rota los daños. Van del color del bloque, como su rótulo.
  // El depósito va al final y APARTE —un chip de su color, no un renglón—,
  // porque no se suma al total.
  const renglonTotal = (clave, Icono, rotulo, valor) => (
    <Stack key={clave} direction="row" alignItems="center" spacing={0.75}>
      <Icono fontSize="small" sx={{ color: acento, flexShrink: 0 }} />
      <Typography variant="body2">
        {rotulo} {valor}
      </Typography>
    </Stack>
  );

  const lineasTotalesIzq = [];
  const lineasTotalesDer = [];
  if (subtotal) {
    lineasTotalesIzq.push(
      renglonTotal("subtotal", ConstructionIcon, "Subtotal", subtotal),
    );
  }
  if (iva) {
    lineasTotalesIzq.push(renglonTotal("iva", PercentIcon, "IVA (19%)", iva));
  }
  if (transporteTotalFactura > 0) {
    lineasTotalesDer.push(
      renglonTotal(
        "transporte",
        LocalShippingIcon,
        "Transporte",
        formatearMoneda(transporteTotalFactura),
      ),
    );
  }
  if (cuenta.danos > 0) {
    lineasTotalesDer.push(
      renglonTotal("danos", HandymanIcon, "Daños", formatearMoneda(cuenta.danos)),
    );
  }
  if (depositoTotalFactura > 0) {
    const colorDeposito = theme.palette.custom.seccionDeposito;
    lineasTotalesDer.push(
      <Stack
        key="deposito"
        direction="row"
        alignItems="center"
        spacing={0.75}
        sx={{
          alignSelf: "flex-start",
          px: 1.25,
          py: 0.25,
          borderRadius: 999,
          border: `1px solid ${alpha(colorDeposito, 0.5)}`,
          color: colorDeposito,
        }}
      >
        <IconoDeposito fontSize="small" sx={{ flexShrink: 0 }} />
        <Typography variant="body2" sx={{ color: "inherit" }}>
          Depósito {formatearMoneda(depositoTotalFactura)}
        </Typography>
      </Stack>,
    );
  }
  const lineasTotales = [...lineasTotalesIzq, ...lineasTotalesDer];

  // Solo importa en móvil: en PC siempre se muestra todo.
  const mostrar = !esMovil || abierto;

  if (lineasTotales.length === 0 && !valorTotal) return null;

  // ── Los dos recuadros del estado de cuenta: la factura y el depósito ──
  //
  // Con la 8154: la factura dice Total $2.156.400 · Pago inicial $1.014.000
  // (de $1.514.000, $500.000 fueron el depósito) · Abonos $1.142.400 · Total
  // pagado $2.156.400 · Saldo $0. El depósito dice Recibido $500.000 · Monto a
  // devolver $500.000 · Pendiente de devolución, con el botón.
  const deposito = cuenta.deposito;
  const hayDeposito = deposito.pactado > 0;
  const depositoResuelto = Boolean(datosFactura(factura).depositoResuelto);
  // Lo que de cada renglón le llegó a la FACTURA: sin la parte que fue a la
  // garantía, y con lo que la garantía le pasó (daños y lo aplicado) aparte.
  const pagoALaFactura = cuenta.pagado - deposito.conLosDespachos;
  const abonosALaFactura = cuenta.abonos - deposito.aplicado - deposito.conAbonos;
  const pagadoConDeposito = deposito.retenido + deposito.aplicado;
  const entregadoDeMas = cuenta.entregas - deposito.devuelto;
  // El saldo de la factura sola: el depósito por cobrar va en su recuadro.
  const saldoFactura = Math.max(0, cuenta.saldoPendiente - deposito.porCobrar);

  const estadoDeposito = !depositoResuelto
    ? depositoPendiente(factura) && facturaEstado === "cobro"
      ? {
          // Volvieron todos los equipos pero nadie dijo todavía en qué
          // estado: se define al registrar la devolución, en Seguimiento.
          texto: "Falta definir: se resuelve al registrar la devolución",
          color: "warning.main",
          Icono: ErrorIcon,
        }
      : { texto: "En garantía: hay equipos afuera", color: "custom.depositoText", Icono: IconoDeposito }
    : deposito.guardado > 0
      ? { texto: "Pendiente de devolución", color: "warning.main", Icono: ErrorIcon }
      : { texto: "Resuelto", color: "success.light", Icono: CheckCircleIcon };

  // POR ENCIMA del recuadro que los contiene: el recuadro de bloque pinta un
  // degradado de su color sobre todo lo que tiene adentro, y acá adentro hay
  // paneles negros opacos que el degradado teñía.
  const sxPanel = { position: "relative", zIndex: 1, width: "100%" };

  // El ícono va dentro del texto y a su altura: en una caja aparte le sumaba
  // alto al renglón y la cifra quedaba más abajo que las demás.
  const conIcono = (Icono, texto) => (
    <>
      <Icono sx={{ fontSize: "1rem", verticalAlign: "-0.15em", mr: 0.75 }} />
      {texto}
    </>
  );

  // Plata de la empresa hacia el cliente: el depósito libre y lo que pagó de
  // más. Va con botón y no como un dato más: mientras no se entregue, la
  // factura no puede terminar, así que hay que poder resolverlo acá mismo.
  const botonDevolver =
    cuenta.aDevolver > 0 ? (
      <Button
        fullWidth
        variant="contained"
        color="warning"
        startIcon={<CurrencyExchangeIcon />}
        sx={{ mt: 1.5 }}
        onClick={() => onDevolverSaldo(factura)}
      >
        Devolver {formatearMoneda(cuenta.aDevolver)}
      </Button>
    ) : null;

  // El panel oscuro con la cuenta. En celular es un bloque aparte —queda
  // SIEMPRE a la vista, debajo de todo—; en computador va al lado de los
  // renglones que lo explican, dentro del mismo bloque.
  // Es la misma pizarra de totales que usa Seguimiento: el aspecto y los
  // colores salen del tema, así los dos lugares se ven igual. El rótulo y la
  // pizarra van juntos —sueltos, cada ancho de pantalla los acomodaba en un
  // lugar distinto—.
  const bloqueEstadoCuenta = (
    <Box
      sx={{
        width: { xs: "100%", sm: "auto" },
        // Pegado a la derecha aunque baje de línea: cuando
        // la factura tiene depósito y transporte, esa fila
        // se llena y el recuadro pasa al renglón de abajo,
        // donde quedaba solo y se iba a la izquierda.
        ml: { sm: "auto" },
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        {...(esMovil
          ? propsRenglonPlegable({
              abierto: estadoAbierto,
              alternar: onToggleEstado,
              etiqueta: "Estado de cuenta",
            })
          : {})}
        sx={esMovil ? sxRenglonPlegable : undefined}
      >
        <Typography
          variant="overline"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            lineHeight: 1.6,
            // El verde de la plata, no el acento: el acento ya lo lleva
            // "Total factura", que es el bloque de al lado, y dos bloques
            // seguidos del mismo color se leen como uno solo.
            color: "success.main",
          }}
        >
          <AccountBalanceWalletIcon fontSize="small" />
          Estado de cuenta
        </Typography>
        {esMovil && renderFlechaPlegable(estadoAbierto, acento)}
      </Stack>
      {(!esMovil || estadoAbierto) && (
      <Box
        sx={{
          // La misma separación con su rótulo que el resto de los bloques de
          // la tarjeta: sin ella quedaba pegado.
          mt: 0.5,
          width: { xs: "100%", sm: "auto" },
          minWidth: { sm: 300 },
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
      {/* ── LA FACTURA ─────────────────────────────────────────────
          Solo la plata que le llegó a ELLA, con su signo: lo que suma al
          total con +, lo que lo paga con -. Lo que del pago inicial fue al
          depósito no está acá: "Información de pago" lo aclara, con el
          Total que entregó el cliente y el Valor que le quedó a la factura. */}
      <Paper variant="totales" sx={sxPanel}>
        {valorTotal && (
          <>
            <Box className="fila total">
              <Typography variant="subtitle1" fontWeight="bold">
                {conIcono(ReceiptLongIcon, "Total factura")}
              </Typography>
              <Typography variant="subtitle1" fontWeight="bold">
                {valorTotal}
              </Typography>
            </Box>
            {/* Lo retenido es parte del total: va con + debajo de él. */}
            {cuenta.danos > 0 && (
              <Box className="fila" sx={{ color: "warning.light" }}>
                <Typography variant="body2">
                  {conIcono(HandymanIcon, "Retenido por daños")}
                </Typography>
                <Typography variant="body2">+ {formatearMoneda(cuenta.danos)}</Typography>
              </Box>
            )}
          </>
        )}

        {/* Se callan únicamente cuando la cuenta cerró clavada: un solo
            pago por el total exacto, que repetiría la cifra de arriba. */}
        {!cuentaCerroClavada && (
          <>
            <Box className="fila pagado">
              <Typography variant="body2">{conIcono(PaidIcon, "Pago inicial")}</Typography>
              <Typography variant="body2">- {formatearMoneda(pagoALaFactura)}</Typography>
            </Box>
          </>
        )}

        {/* Solo el total de lo abonado: el detalle de cada abono, con su
            fecha y su medio, va arriba en su propia información de pago. */}
        {abonosALaFactura > 0 && (
          <>
            <Box className="fila abono">
              <Typography variant="body2">{conIcono(AddCircleIcon, "Abonos")}</Typography>
              <Typography variant="body2">- {formatearMoneda(abonosALaFactura)}</Typography>
            </Box>
          </>
        )}

        {/* Lo que el depósito pagó de la factura: lo retenido por daños y lo
            que el cliente pidió aplicar. */}
        {pagadoConDeposito > 0 && (
          <Box className="fila deposito">
            <Typography variant="body2">
              {conIcono(IconoDeposito, "Pagado con el depósito")}
            </Typography>
            <Typography variant="body2">- {formatearMoneda(pagadoConDeposito)}</Typography>
          </Box>
        )}

        {/* Lo que se le devolvió aparte del depósito: un pago de más. */}
        {entregadoDeMas > 0 && (
          <Box className="fila">
            <Typography variant="body2">
              {conIcono(CurrencyExchangeIcon, "Entregado al cliente")}
            </Typography>
            <Typography variant="body2">+ {formatearMoneda(entregadoDeMas)}</Typography>
          </Box>
        )}

        {!cuentaCerroClavada && (
          <Box className="fila separada pagado">
            <Typography variant="body2" fontWeight="bold">
              {conIcono(CheckCircleIcon, "Total pagado")}
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {formatearMoneda(cuenta.recibido)}
            </Typography>
          </Box>
        )}

        {/* Si el cliente pagó de más, el sobrante queda a su favor en vez
            de mostrarse como saldo. */}
        {saldoAFavorNumero > 0 ? (
          <Box className="fila ok" sx={{ mb: 0 }}>
            <Typography variant="body2" fontWeight="bold">
              {conIcono(ScheduleIcon, "Saldo a favor")}
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {formatearMoneda(saldoAFavorNumero)}
            </Typography>
          </Box>
        ) : (
          <Box
            className={saldoFactura > 0 ? "fila alerta" : "fila ok"}
            sx={{ mb: 0 }}
          >
            <Typography variant="body2" fontWeight="bold">
              {conIcono(ScheduleIcon, "Saldo pendiente")}
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {formatearMoneda(saldoFactura)}
            </Typography>
          </Box>
        )}

        {/* A DÓNDE FUE ESA PLATA. Sin esta línea, una salida que NO se le
            entregó al cliente —la que se cruzó contra otra factura suya— se
            leería como plata que se le devolvió en mano. */}
        {entregasDe(factura)
          .filter((entrega) => entrega?.nota)
          .map((entrega, indice) => (
            <Typography
              key={`${entrega.fecha}-${indice}`}
              variant="caption"
              sx={{ display: "block", opacity: 0.85, mt: 0.5 }}
            >
              {entrega.nota}
            </Typography>
          ))}

        {/* Sin depósito, lo único que se le puede devolver es un pago de
            más, y el botón va acá. Con depósito va en su recuadro. */}
        {!hayDeposito && botonDevolver}
      </Paper>

      {/* ── EL DEPÓSITO ────────────────────────────────────────────
          Su propia cuenta: cuánto se recibió, qué salió de él y cuánto
          queda. Lo retenido y lo aplicado dicen que pasan a la factura,
          que es donde aparecen como "Pagado con el depósito". */}
      {hayDeposito && (
        <Paper variant="totales" sx={sxPanel}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={1}
            sx={{ mb: 1.5 }}
          >
            {/* El color va en la caja de afuera: la pizarra obliga a sus
                textos a heredarlo, y puesto en el texto se perdía. */}
            <Box
              sx={{
                color: "custom.depositoText",
                display: "flex",
                alignItems: "center",
                gap: 0.75,
              }}
            >
              <IconoDeposito fontSize="small" />
              <Typography
                variant="subtitle2"
                fontWeight="bold"
                sx={{ letterSpacing: "0.08em" }}
              >
                DEPÓSITO
              </Typography>
            </Box>
            {deposito.retenido > 0 && (
              <Box
                component="span"
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  fontSize: "0.72rem",
                  fontWeight: "bold",
                  bgcolor: "warning.main",
                  color: "#1a1a1a",
                }}
              >
                Con retención por daños
              </Box>
            )}
          </Stack>

          <Box className="fila">
            <Typography variant="body2">{conIcono(TollIcon, "Depósito recibido")}</Typography>
            <Typography variant="body2">{formatearMoneda(deposito.recibido)}</Typography>
          </Box>
          {deposito.porCobrar > 0 && (
            <Box className="fila alerta">
              <Typography variant="body2">{conIcono(TollIcon, "Por cobrar")}</Typography>
              <Typography variant="body2">{formatearMoneda(deposito.porCobrar)}</Typography>
            </Box>
          )}
          {deposito.retenido > 0 && (
            <Box className="fila" sx={{ color: "warning.light" }}>
              <Typography variant="body2">
                {conIcono(HandymanIcon, "Retenido por daños")}
              </Typography>
              <Typography variant="body2">- {formatearMoneda(deposito.retenido)}</Typography>
            </Box>
          )}
          {deposito.aplicado > 0 && (
            <Box className="fila deposito">
              <Typography variant="body2">
                {conIcono(ReceiptLongIcon, "Aplicado a la factura")}
              </Typography>
              <Typography variant="body2">- {formatearMoneda(deposito.aplicado)}</Typography>
            </Box>
          )}
          {deposito.devuelto > 0 && (
            <Box className="fila">
              <Typography variant="body2">
                {conIcono(CurrencyExchangeIcon, "Devuelto al cliente")}
              </Typography>
              <Typography variant="body2">- {formatearMoneda(deposito.devuelto)}</Typography>
            </Box>
          )}

          {/* Lo que queda en la mano de la empresa, dicho según el momento.
              La raya va aparte, encima del fondo resaltado y no adentro. */}
          <Box
            sx={{
              borderTop: "1px dashed",
              borderColor: (theme) => alpha(theme.palette.custom.panelText, 0.35),
              mt: 1.5,
              mb: 1,
            }}
          />
          <Box
            className="fila"
            sx={{
              fontWeight: "bold",
              bgcolor: (theme) => alpha(theme.palette.custom.panelText, 0.06),
              borderRadius: 1,
              px: 0.75,
              py: 0.5,
              mx: -0.75,
            }}
          >
            <Typography variant="body2" fontWeight="bold">
              {conIcono(
                AccountBalanceWalletIcon,
                depositoResuelto ? "Monto a devolver" : "En garantía",
              )}
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {formatearMoneda(deposito.guardado)}
            </Typography>
          </Box>

          <Box
            sx={{
              mt: 1,
              color: estadoDeposito.color,
              display: "flex",
              alignItems: "center",
              gap: 0.75,
            }}
          >
            <estadoDeposito.Icono sx={{ fontSize: "1rem" }} />
            <Typography variant="body2">{estadoDeposito.texto}</Typography>
          </Box>

          {botonDevolver}
        </Paper>
      )}
      </Box>
      )}
    </Box>
  );

  const cuerpo = (
    <>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        {...(esMovil
          ? propsRenglonPlegable({
              abierto,
              alternar: onToggle,
              etiqueta: "Total factura",
            })
          : {})}
        sx={esMovil ? sxRenglonPlegable : undefined}
      >
        <Typography
          variant="overline"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            lineHeight: 1.6,
            // Los dos cierres de la factura —el total y el
            // estado de cuenta— van con el acento del tema, no
            // con el color de un bloque: resumen todo lo de
            // arriba, no una sección en particular.
            color: "custom.accent",
          }}
        >
          <ReceiptLongIcon fontSize="small" />
          Total factura
        </Typography>
        {esMovil && renderFlechaPlegable(abierto, acento)}
      </Stack>
      {/* El panel oscuro con la cuenta NO se pliega: es lo único que queda a
          la vista cuando la factura se abre con todos sus bloques cerrados.
          Lo que el rótulo "Total factura" esconde son los renglones que lo
          explican —subtotal, IVA, depósito y transporte—. */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          flexWrap: { sm: "wrap" },
          justifyContent: "space-between",
          // Arriba, no al fondo: así el subtotal y el IVA
          // quedan justo debajo del rótulo "Total factura" en
          // vez de caer al pie del recuadro de estado de
          // cuenta, que es más alto y dejaba un hueco.
          alignItems: { xs: "stretch", sm: "flex-start" },
          gap: 2,
        }}
      >
        {mostrar &&
          (esMovil ? (
            // En columna y detrás de una línea, igual que la información de
            // pago: son cuatro renglones cortos —subtotal, IVA, depósito y
            // transporte— y en dos columnas quedaban en zigzag, con el ojo
            // saltando de un lado al otro para leer la cuenta.
            renderContenidoPlano(
              acento,
              <Stack spacing={0.5}>{lineasTotales}</Stack>,
            )
          ) : (
            <Stack
              direction="row"
              spacing={2}
              flexWrap="wrap"
              alignItems="flex-end"
            >
              {lineasTotales}
            </Stack>
          ))}

        {!esMovil && bloqueEstadoCuenta}
      </Box>
    </>
  );

  // En celular el bloque va dentro de un recuadro del color del acento, como
  // el resto de las partes de la factura, y su rótulo es el que lo abre. En
  // computador cierra la tarjeta con una línea, que es como estuvo siempre.
  return esMovil ? (
    <>
      <Box sx={{ mt: 1 }}>
        {renderRecuadroBloque(acento, cuerpo, "totalFactura")}
      </Box>
      {/* Su propio recuadro, como el resto de los bloques: el panel oscuro
          con la cuenta aparece al tocarlo. */}
      <Box sx={{ mt: 1 }}>
        {renderRecuadroBloque(
          theme.palette.success.main,
          bloqueEstadoCuenta,
          "estadoCuenta",
        )}
      </Box>
    </>
  ) : (
    <Box
      sx={{
        mt: 1.5,
        pt: 1.5,
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      {cuerpo}
    </Box>
  );
}

EstadoCuentaFactura.propTypes = {
  factura: PropTypes.object.isRequired,
  cuenta: PropTypes.object.isRequired,
  facturaEstado: PropTypes.string,
  abierto: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
  estadoAbierto: PropTypes.bool,
  onToggleEstado: PropTypes.func.isRequired,
  onDevolverSaldo: PropTypes.func.isRequired,
};
