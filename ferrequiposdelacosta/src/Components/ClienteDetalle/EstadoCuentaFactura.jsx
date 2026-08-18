// El cierre de la factura: a la izquierda los renglones que la componen
// (subtotal, IVA, depósito, transporte) y a la derecha el estado de cuenta —
// cuánto es, cuánto entró y cuánto falta—, con el botón para devolverle al
// cliente lo que pagó de más.
//
// En celular todo esto se pliega con la flecha: al recorrer una lista larga lo
// que se busca primero es de qué factura se trata, no su cuenta al detalle.
import PropTypes from "prop-types";
import {
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import {
  calcularAmpliacionFactura,
  calcularDepositoTotal,
  depositoPendiente,
} from "./facturaUtils";
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
  onDevolverSaldo,
}) {
  const theme = useTheme();
  const esMovil = useMediaQuery(theme.breakpoints.down("sm"));
  const acento = theme.palette.custom.accent;

  // Mismo cálculo compartido que usa Seguimiento de Clientes.
  const ampliacionFactura = calcularAmpliacionFactura(factura);
  // Subtotal e IVA se muestran ya con los días ampliados sumados
  // (menos el descuento): es lo que hoy se le cobraría al cliente,
  // no lo que decía la factura el día que se emitió. Si la factura
  // no traía el dato, se deja vacío como antes en vez de un cero.
  //
  // Tienen que ir con la ampliación sumada porque el total de la derecha
  // también la lleva: con el subtotal viejo, los renglones de la izquierda no
  // cuadrarían con él.
  const subtotal = formatearMoneda(
    typeof factura.subtotal === "number"
      ? ampliacionFactura.nuevoSubtotal
      : factura.subtotal,
  );
  const iva = formatearMoneda(
    typeof factura.iva === "number"
      ? ampliacionFactura.nuevoIva
      : factura.iva,
  );
  const valorTotal = formatearMoneda(cuenta.total);
  const equiposAgregados = (
    Array.isArray(factura.equipos) ? factura.equipos : []
  ).filter((equipo) => equipo.agregadoPosteriormente);

  // Depósito/transporte de TODA la factura = lo del lote original
  // (fijo, no crece) + lo que haya traído cada equipo agregado.
  const depositoAgregadosTotal = equiposAgregados.reduce(
    (total, equipo) => total + (Number(equipo.deposito) || 0),
    0,
  );
  const transporteAgregadosTotal = equiposAgregados.reduce(
    (total, equipo) => total + (Number(equipo.valorTransporte) || 0),
    0,
  );
  const depositoTotalFactura =
    (Number(factura.deposito) || 0) + depositoAgregadosTotal;
  const transporteTotalFactura =
    (Number(factura.valorTransporte) || 0) + transporteAgregadosTotal;

  // Lo cobrado al emitir la factura más lo de cada equipo agregado
  // después, y lo que el cliente fue abonando desde entonces. Si
  // pagó de más, el sobrante NO baja el saldo (que nunca es
  // negativo): sale aparte como saldo a favor.
  const totalPagadoFactura = cuenta.pagado;
  const totalAbonos = cuenta.abonos;
  const saldoPendienteNumero = cuenta.saldoPendiente;
  const saldoAFavorNumero = cuenta.saldoAFavor;
  const saldoPendiente = formatearMoneda(saldoPendienteNumero);
  const hayColorAlerta = saldoPendienteNumero > 0;

  // Se separan en dos grupos (izquierda: subtotal/iva, derecha:
  // depósito/transporte) para poder acomodarlos en 2 columnas
  // prolijas en móvil, en vez de dejarlos ajustar solos.
  const lineasTotalesIzq = [];
  const lineasTotalesDer = [];
  if (subtotal) {
    lineasTotalesIzq.push(
      <Typography key="subtotal" variant="body2">
        Subtotal {subtotal}
      </Typography>,
    );
  }
  if (iva) {
    lineasTotalesIzq.push(
      <Typography key="iva" variant="body2">
        IVA (19%) {iva}
      </Typography>,
    );
  }
  if (depositoTotalFactura > 0) {
    lineasTotalesDer.push(
      <Typography key="deposito" variant="body2">
        Depósito {formatearMoneda(depositoTotalFactura)}
      </Typography>,
    );
  }
  if (transporteTotalFactura > 0) {
    lineasTotalesDer.push(
      <Typography key="transporte" variant="body2">
        Transporte {formatearMoneda(transporteTotalFactura)}
      </Typography>,
    );
  }
  const lineasTotales = [...lineasTotalesIzq, ...lineasTotalesDer];

  // Solo importa en móvil: en PC siempre se muestra todo.
  const mostrar = !esMovil || abierto;

  if (lineasTotales.length === 0 && !valorTotal) return null;

  return (
    <Box
      sx={{
        mt: 1.5,
        pt: 1.5,
        borderTop: "1px solid",
        borderColor: "divider",
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
        {esMovil && (
          <IconButton size="small" onClick={onToggle} sx={{ color: acento }}>
            {abierto ? (
              <ExpandLessIcon fontSize="small" />
            ) : (
              <ExpandMoreIcon fontSize="small" />
            )}
          </IconButton>
        )}
      </Stack>
      {mostrar && (
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
          {esMovil ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                columnGap: 2,
                rowGap: 0.5,
              }}
            >
              <Stack spacing={0.5}>{lineasTotalesIzq}</Stack>
              <Stack spacing={0.5}>{lineasTotalesDer}</Stack>
            </Box>
          ) : (
            <Stack
              direction="row"
              spacing={2}
              flexWrap="wrap"
              alignItems="flex-end"
            >
              {lineasTotales}
            </Stack>
          )}

          {/* La misma pizarra de totales que usa Seguimiento:
              el aspecto y los colores salen del tema, así los
              dos lugares se ven igual.

              El rótulo y la pizarra van dentro de un mismo
              bloque: sueltos eran dos elementos del contenedor
              flex y cada ancho de pantalla los acomodaba en un
              lugar distinto. */}
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
            <Typography
              variant="overline"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                lineHeight: 1.6,
                color: "custom.accent",
              }}
            >
              <AccountBalanceWalletIcon fontSize="small" />
              Estado de cuenta
            </Typography>
            <Paper
              variant="totales"
              sx={{
                width: { xs: "100%", sm: "auto" },
                minWidth: { sm: 240 },
              }}
            >
              {valorTotal && (
                <Box className="fila total">
                  <Typography
                    variant="subtitle1"
                    fontWeight="bold"
                  >
                    Total factura
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    fontWeight="bold"
                  >
                    {valorTotal}
                  </Typography>
                </Box>
              )}
              {/* Lo ya cobrado. Solo aparece cuando queda saldo
                o cuando hubo abonos: con la factura saldada de
                una sola vez sería repetir el total. */}
              {(hayColorAlerta || totalAbonos > 0) && (
                <Box className="fila pagado">
                  <Typography variant="body2">Pagado</Typography>
                  <Typography variant="body2">
                    {formatearMoneda(totalPagadoFactura)}
                  </Typography>
                </Box>
              )}

              {/* Solo el total de lo abonado: el detalle de cada
                abono, con su fecha y su medio, va arriba en su
                propia información de pago. */}
              {totalAbonos > 0 && (
                <Box className="fila abono">
                  <Typography variant="body2">Abonos</Typography>
                  <Typography variant="body2">
                    {formatearMoneda(totalAbonos)}
                  </Typography>
                </Box>
              )}

              {/* El depósito devuelto ya salió del total de
                arriba. Se muestra igual, porque si no el total
                cambiaría sin explicación. */}
              {cuenta.depositoDevuelto > 0 && (
                <Box className="fila abono">
                  <Typography variant="body2">
                    Depósito devuelto
                  </Typography>
                  <Typography variant="body2">
                    {formatearMoneda(cuenta.depositoDevuelto)}
                  </Typography>
                </Box>
              )}

              {cuenta.entregas > 0 && (
                <Box className="fila">
                  <Typography variant="body2">
                    Entregado al cliente
                  </Typography>
                  <Typography variant="body2">
                    {formatearMoneda(cuenta.entregas)}
                  </Typography>
                </Box>
              )}

              {/* Retener plata sin decir por qué no se puede,
                así que el motivo siempre está a la vista. */}
              {Number(factura.depositoResuelto?.retenido) > 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    mt: 0.5,
                    color: "text.secondary",
                  }}
                >
                  Se retuvieron{" "}
                  {formatearMoneda(
                    factura.depositoResuelto.retenido,
                  )}{" "}
                  del depósito: {factura.depositoResuelto.motivo}
                </Typography>
              )}

              {/* Si el cliente pagó de más, el sobrante queda a
                su favor en vez de mostrarse como saldo. */}
              {saldoAFavorNumero > 0 ? (
                <Box className="fila ok" sx={{ mt: 1, mb: 0 }}>
                  <Typography variant="body2" fontWeight="bold">
                    Saldo a favor
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {formatearMoneda(saldoAFavorNumero)}
                  </Typography>
                </Box>
              ) : (
                <Box
                  className={
                    hayColorAlerta ? "fila alerta" : "fila ok"
                  }
                  sx={{ mt: 1, mb: 0 }}
                >
                  <Typography variant="body2" fontWeight="bold">
                    Saldo pendiente
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {saldoPendiente}
                  </Typography>
                </Box>
              )}

              {/* Plata de la empresa hacia el cliente. Va con
                  botón y no como un dato más: mientras no se
                  entregue, la factura no puede terminar, así
                  que hay que verlo y poder resolverlo acá
                  mismo. */}
              {saldoAFavorNumero > 0 && (
                <Button
                  fullWidth
                  variant="contained"
                  color="warning"
                  startIcon={<CurrencyExchangeIcon />}
                  sx={{ mt: 1.5 }}
                  onClick={() => onDevolverSaldo(factura)}
                >
                  Devolver {formatearMoneda(saldoAFavorNumero)}
                </Button>
              )}

              {/* Volvieron todos los equipos pero nadie dijo
                  todavía en qué estado, así que el depósito
                  sigue retenido. Se define al registrar la
                  devolución, en Seguimiento. */}
              {depositoPendiente(factura) &&
                facturaEstado === "cobro" && (
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mt: 1.5,
                      fontWeight: "bold",
                      color: "warning.main",
                    }}
                  >
                    Falta definir el depósito de{" "}
                    {formatearMoneda(
                      calcularDepositoTotal(factura),
                    )}
                    : se resuelve al registrar la devolución en
                    Seguimiento.
                  </Typography>
                )}
            </Paper>
          </Box>
        </Box>
      )}
    </Box>
  );
}

EstadoCuentaFactura.propTypes = {
  factura: PropTypes.object.isRequired,
  cuenta: PropTypes.object.isRequired,
  facturaEstado: PropTypes.string,
  abierto: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
  onDevolverSaldo: PropTypes.func.isRequired,
};
