// La tarjeta de UNA factura dentro del detalle del cliente: el encabezado con
// su número y su estado, los equipos (los del alta y los agregados después,
// cada lote con su pago y sus cargos), los abonos y el estado de cuenta.
//
// Vivía dentro de ClienteDetalle.jsx, en un bloque de más de mil líneas que
// hacía imposible leer la pantalla. Acá está igual que estaba: lo único que
// cambió es que ya no toca el estado de la pantalla —avisa hacia afuera con
// las funciones que recibe— y que el plegado sigue viviendo en el padre, para
// que abrir una factura no se pierda al recargar la lista.
import { Fragment } from "react";
import PropTypes from "prop-types";
import { alpha } from "@mui/material/styles";
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AddCardIcon from "@mui/icons-material/AddCard";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AssignmentReturnIcon from "@mui/icons-material/AssignmentReturn";
import ConstructionIcon from "@mui/icons-material/Construction";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LibraryAddIcon from "@mui/icons-material/LibraryAdd";
import PaymentsIcon from "@mui/icons-material/Payments";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SavingsIcon from "@mui/icons-material/Savings";
import {
  agruparLotesAgregados,
  normalizarPagos,
  calcularAmpliacionEquipo,
  calcularAmpliacionFactura,
  calcularCuentaFactura,
  calcularDepositoTotal,
  calcularEstadoFactura,
  depositoPendiente,
  ESTADO_FACTURA_INFO,
} from "./facturaUtils";
import ChipsFechasEquipo from "./ChipsFechasEquipo";
import generarFacturaPdf from "../VistaPdf/VistaFacturaPdf";
import { formatearMonedaOVacio } from "../../Utils/formato";
import {
  casillasDeCuenta,
  iconBtnSx,
  renderFilaDatos,
  renderMedioPago,
  renderPizarraTotales,
  renderRecuadroBloque,
} from "./recuadrosCuenta";

// Los estados y sus nombres viven en facturaUtils (ver ESTADO_FACTURA_INFO).
// El color de cada uno sale de avatarBgPorEstado —color propio, no el prop
// `color` de MUI— para no repetir colores ya usados en otros botones.

const TIPO_PAGO_LABELS = {
  total: "Total",
  parcial: "Parcial",
  // "Pago con abono" es solo la forma de cargarlo: el cliente entregó de más y
  // el sobrante quedó como abono, así que lo facturado se cubrió completo. Acá
  // se lee como lo que es, un pago total.
  conAbono: "Total",
  sinPago: "Sin pago",
};

// Ojo: esta es la variante que devuelve NADA si el valor no es un número, no la
// que muestra "$ 0". Ver Utils/formato.js.
const formatearMoneda = formatearMonedaOVacio;

const formatearFecha = (isoDate) => {
  if (!isoDate) return null;
  const [anio, mes, dia] = isoDate.split("-");
  return `${dia}/${mes}/${anio}`;
};

export default function FacturaCard({
  factura,
  cliente,
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
  const colorAdicionales = theme.palette.custom.seccionAdicionales;
  const avatarBgPorEstado = theme.palette.custom.estadoFactura;

  // Tarjeta de un equipo dentro de una factura: cantidad/nombre/subtotal
  // arriba, días/precio/fechas como pills abajo. La misma tarjeta sirve para
  // un equipo original o uno agregado después.
  const renderEquipoRow = (equipo, key, color) => {
    const porDia = (Number(equipo.cantidad) || 0) * (Number(equipo.valor) || 0);
    const subtotalEquipo = porDia * (Number(equipo.dias) || 0);

    // Si al equipo se le amplió el plazo, cuánto pasa a valer con esos días
    // extra ya descontados. Se muestra debajo del valor original.
    const ampliacionEquipo = calcularAmpliacionEquipo(equipo);
    const valorConAmpliacion =
      ampliacionEquipo.neto > 0 && subtotalEquipo > 0
        ? subtotalEquipo + ampliacionEquipo.neto
        : 0;

    return (
      <Box
        key={key}
        sx={{
          p: 1,
          borderRadius: 1,
          bgcolor: "background.paper",
          border: "1px solid",
          // Mismo tratamiento que el recuadro de pago, con el color del grupo
          // al que pertenece el equipo.
          borderColor: color,
          boxShadow: `inset 0 0 12px ${alpha(color, 0.2)}`,
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            background: `linear-gradient(135deg, ${alpha(color, 0.12)}, ${alpha(color, 0.03)})`,
            pointerEvents: "none",
          },
        }}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <Chip
            variant="meta"
            label={equipo.cantidad}
            size="small"
            sx={{
              fontWeight: "bold",
              flexShrink: 0,
              // Antes era amarillo fijo, que en modo claro quedaba casi
              // invisible sobre el chip. Es letra chica, así que va el acento
              // en su versión oscura.
              color: theme.palette.custom.accent,
            }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography component="span" variant="body2" fontWeight="bold">
              {equipo.nombre}
            </Typography>
            {/* Cuándo se pidió este equipo, que no es lo mismo que cuándo
                salió despachado. Solo lo traen los que se sumaron después de
                crear la factura. */}
            {equipo.fechaAgregado && (
              <Typography
                component="span"
                variant="caption"
                color="text.secondary"
                sx={{ ml: 0.75, whiteSpace: "nowrap" }}
              >
                agregado {formatearFecha(equipo.fechaAgregado)}
              </Typography>
            )}
          </Box>
          {subtotalEquipo > 0 && (
            <Stack sx={{ flexShrink: 0, textAlign: "right" }}>
              <Typography variant="body2" fontWeight="bold">
                {formatearMoneda(subtotalEquipo)}
              </Typography>
              {valorConAmpliacion > 0 && (
                <Typography
                  variant="caption"
                  fontWeight="bold"
                  sx={{ color: "custom.accent", lineHeight: 1.2 }}
                >
                  {formatearMoneda(valorConAmpliacion)}
                </Typography>
              )}
            </Stack>
          )}
        </Stack>
        {/* La historia de fechas del equipo, igual que en Seguimiento: mismo
            componente, mismos tramos, mismos colores.

            Acá había un grid de dos columnas para móvil —días y precio de un
            lado, fechas del otro—. Se fue con los tramos: ahora el precio por
            día viaja junto a la fecha de salida, que es de lo que es condición,
            y partirlos en dos columnas volvería a separar lo que se acaba de
            juntar. En móvil los tramos envuelven solos. */}
        <ChipsFechasEquipo equipo={equipo} />
      </Box>
    );
  };

  // Lo que se cobra aparte del alquiler: depósito y transporte. Antes iban
  // dentro del cuadro de pago, mezclados con el medio y el monto; ahora van
  // en su propio recuadro, debajo de los equipos.
  const renderAdicionales = ({
    deposito,
    transporteTipo,
    transporteMonto,
    iva,
    key,
    color,
  }) => {
    const hayTransporte = transporteTipo && transporteTipo !== "Sin transporte";
    const hayIva = Number(iva) > 0;
    if (deposito <= 0 && !hayTransporte && !hayIva) return null;

    const total =
      (hayIva ? Number(iva) : 0) +
      deposito +
      (hayTransporte ? transporteMonto : 0);

    const datos = [];
    if (hayIva) {
      datos.push({
        clave: "iva",
        rotulo: "IVA (19%)",
        valor: formatearMoneda(Number(iva)),
      });
    }
    if (deposito > 0) {
      datos.push({
        clave: "deposito",
        rotulo: "Depósito",
        valor: formatearMoneda(deposito),
      });
    }
    // El tipo de transporte y su valor van juntos: son un solo dato, no dos
    // ("Ida y vuelta · $60.000").
    if (hayTransporte) {
      datos.push({
        clave: "transporte",
        rotulo: "Transporte",
        valor:
          transporteMonto > 0
            ? `${transporteTipo} · ${formatearMoneda(transporteMonto)}`
            : transporteTipo,
      });
    }
    // La suma de todo lo que se cobra aparte del alquiler. Se llama "Total
    // adicionales" y no "Total" a secas porque más abajo, en el mismo
    // recuadro, está el "Total factura": dos números distintos con el mismo
    // nombre y a pocos centímetros se leían como si tuvieran que coincidir.
    datos.push({
      clave: "total",
      rotulo: "Total adicionales",
      valor: formatearMoneda(total),
    });

    return renderRecuadroBloque(color, renderFilaDatos(color, datos), key);
  };

  // Cuadro de pago de un lote de equipos (el original de la factura, o cada
  // equipo agregado después): tipo de pago, medio(s) de pago, depósito y
  // transporte de ESE lote puntual — no de toda la factura.
  const renderInfoPago = ({ pagos, tipoPago, fecha, key, colorEstado }) => {
    const tipoPagoLabel = TIPO_PAGO_LABELS[tipoPago] || null;
    if (pagos.length === 0 && !tipoPagoLabel) return null;

    const mediosPago = pagos.filter((pago) => pago.medio);
    const totalPagos = pagos.reduce(
      (total, pago) => total + (Number(pago.monto) || 0),
      0,
    );

    // Cada dato es una columna con el rotulo arriba y el valor abajo, igual
    // que el resumen de cuenta del encabezado.
    const datos = [];
    // Cuando se recibio esta plata: la fecha de creacion en la factura, y la
    // de solicitud en cada lote de equipos agregados.
    if (fecha) {
      datos.push({
        clave: "fecha",
        rotulo: "Fecha",
        valor: formatearFecha(fecha),
      });
    }
    if (tipoPagoLabel) {
      // "Pago inicial" y no "Pago" a secas: acá va lo que el cliente entregó
      // al emitirse la factura, y el tipo dice cómo cubría ESE momento. Con el
      // rótulo viejo, un "Pago: Total" de $864.000 sobre una factura que hoy
      // vale $3.006.000 se leía como que estaba saldada.
      datos.push({ clave: "pago", rotulo: "Pago inicial", valor: tipoPagoLabel });
    }
    // El medio va con el logo de la marca en vez del nombre escrito. Cuando el
    // pago se repartio entre varios, siguen separados por "+".
    if (mediosPago.length > 0) {
      datos.push({
        clave: "medio",
        rotulo: "Medio",
        contenido: (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 0.5,
            }}
          >
            {mediosPago.map((pago, indice) => (
              <Fragment key={`${pago.medio}-${indice}`}>
                {indice > 0 && "+"}
                {renderMedioPago(pago.medio)}
              </Fragment>
            ))}
          </Box>
        ),
      });
    }
    if (pagos.length > 0) {
      datos.push({
        clave: "valor",
        rotulo: "Valor",
        valor: pagos
          .map((pago) => formatearMoneda(Number(pago.monto)))
          .filter(Boolean)
          .join(" + "),
      });
    }
    // Con el pago repartido en varios medios, el renglon de arriba queda como
    // una suma sin resolver: aca va el resultado.
    if (pagos.length > 1) {
      datos.push({
        clave: "total",
        rotulo: "Total",
        valor: formatearMoneda(totalPagos),
      });
    }

    return renderRecuadroBloque(
      colorEstado,
      renderFilaDatos(colorEstado, datos),
      key,
    );
  };

  // Los abonos que se registraron después de emitida la factura. Van en el
  // mismo recuadro que la información de pago, porque son lo mismo: plata que
  // entró, con su fecha y su medio.
  const renderAbonos = (abonos, colorEstado) => {
    if (!abonos || abonos.length === 0) return null;

    const renglones = (
      <Stack spacing={1} divider={<Divider />}>
        {abonos.map((abono, indice) => {
          const datos = [
            {
              clave: "fecha",
              rotulo: "Abono",
              valor: formatearFecha(abono.fecha),
            },
            {
              clave: "medio",
              rotulo: "Medio",
              contenido: renderMedioPago(abono.medio),
            },
            {
              clave: "valor",
              rotulo: "Valor",
              valor: formatearMoneda(Number(abono.monto) || 0),
            },
          ];
          return (
            <Box key={`abono-${indice}`}>
              {renderFilaDatos(colorEstado, datos)}
              {/* Cuando el abono no lo hizo el cliente directamente sobre
                  esta factura, sino que llegó como sobrante de otra (ver
                  AgregarEquipoDialog), queda esta nota para no confundirlo. */}
              {abono.nota && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.5, fontStyle: "italic" }}
                >
                  {abono.nota}
                </Typography>
              )}
            </Box>
          );
        })}
      </Stack>
    );

    return renderRecuadroBloque(colorEstado, renglones);
  };

  // El estado sale de los datos de la factura, no de un campo
  // guardado: así no puede quedar viejo por el simple paso del
  // tiempo (ver calcularEstadoFactura en facturaUtils).
  const facturaEstado = calcularEstadoFactura(factura);
  const facturaEstadoInfo =
    ESTADO_FACTURA_INFO[facturaEstado] || { label: "Sin estado" };
  const facturaEstadoColor =
    avatarBgPorEstado[facturaEstado] ||
    theme.palette.custom.estadoNeutro;
  // Formato viejo (migrado del Excel): transporte es un número.
  // Formato nuevo (creado en la app): transporte es el tipo
  // (ej. "Solo ida") y el monto vive aparte en valorTransporte.
  const equiposSonObjetos =
    factura.equipos?.length > 0 &&
    typeof factura.equipos[0] === "object";
  const transporteMonto = formatearMoneda(
    typeof factura.transporte === "number"
      ? factura.transporte
      : factura.valorTransporte,
  );
  const transporteTipo =
    typeof factura.transporte === "string"
      ? factura.transporte
      : null;
  // Mismo cálculo compartido que usa Seguimiento de Clientes.
  const ampliacionFactura = calcularAmpliacionFactura(factura);
  // Subtotal e IVA se muestran ya con los días ampliados sumados
  // (menos el descuento): es lo que hoy se le cobraría al cliente,
  // no lo que decía la factura el día que se emitió. Si la factura
  // no traía el dato, se deja vacío como antes en vez de un cero.
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
  const deposito = formatearMoneda(factura.deposito);
  // La cuenta de la factura (total, cobrado, abonado y saldo) sale
  // toda de facturaUtils: es la misma que suma el resumen del
  // encabezado del cliente, así los dos lugares dicen lo mismo.
  //
  // El total y el saldo se muestran con los días ampliados ya
  // sumados, igual que el subtotal y el IVA de más arriba. Si no,
  // los renglones de la izquierda no cuadrarían con este total: el
  // guardado en la factura es de antes de la ampliación.
  const cuenta = calcularCuentaFactura(factura);
  const valorTotal = formatearMoneda(cuenta.total);
  const fecha = formatearFecha(factura.fecha);
  // Solo importa en móvil (en PC siempre se muestra todo).
  const mostrar = (seccion) =>
    !esMovil || seccionAbierta(factura.id, seccion);
  const renderToggle = (seccion) =>
    esMovil && (
      <IconButton
        size="small"
        onClick={() => toggleSeccion(factura.id, seccion)}
        sx={{ color: acento }}
      >
        {seccionAbierta(factura.id, seccion) ? (
          <ExpandLessIcon fontSize="small" />
        ) : (
          <ExpandMoreIcon fontSize="small" />
        )}
      </IconButton>
    );
  const fechaVencimiento = equiposSonObjetos
    ? null
    : formatearFecha(factura.fechaVencimiento) ||
      factura.fechaVencimientoRaw;

  // Equipos originales (creados con la factura) vs. agregados
  // después con el botón "Agregar equipo" — cada lote muestra su
  // propio pago.
  const equiposOriginales = equiposSonObjetos
    ? factura.equipos.filter(
        (equipo) => !equipo.agregadoPosteriormente,
      )
    : [];
  const equiposAgregados = equiposSonObjetos
    ? factura.equipos.filter(
        (equipo) => equipo.agregadoPosteriormente,
      )
    : [];
  // Misma regla que los lotes agregados: con un solo equipo el bloque
  // ocupa media grilla, con dos o más se va a todo el ancho. El "|| 1"
  // evita un repeat(0, 1fr) inválido cuando la lista viene vacía.
  const columnasOriginales = Math.min(
    equiposOriginales.length || 1,
    2,
  );
  const pagosOriginales = normalizarPagos(
    factura.pagos,
    factura.modoPago,
    factura.montoPagado,
  );

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

  // Adicionales del lote original: los de la factura, sin sumar
  // los de los equipos agregados (cada lote muestra los suyos).
  // El IVA de un grupo de equipos: cada uno respeta su propia
  // marca y suma también los días que se le ampliaron. Así el
  // recuadro de la factura muestra solo el IVA de sus equipos y
  // cada lote agregado el suyo, sin contarlo dos veces.
  const ivaDeEquipos = (lista) =>
    lista.reduce((total, equipo) => {
      const llevaIva = equipo.aplicaIva ?? Boolean(factura.aplicaIva);
      if (!llevaIva) return total;
      const base =
        (Number(equipo.cantidad) || 0) *
          (Number(equipo.dias) || 0) *
          (Number(equipo.valor) || 0) +
        calcularAmpliacionEquipo(equipo).neto;
      return total + base * 0.19;
    }, 0);

  // El IVA de UN equipo: la misma cuenta que ivaDeEquipos, para una
  // sola línea. Sirve para abrir el total y ver de dónde sale.
  const ivaDeUnEquipo = (equipo) => ivaDeEquipos([equipo]);

  // El bloque completo de cargos adicionales: su rótulo con la
  // flecha, el recuadro con los totales, y —al desplegar— el IVA
  // discriminado equipo por equipo.
  //
  // El IVA del recuadro es la suma del de todos los equipos del
  // grupo, y sumado no se entiende de dónde salió: una factura que
  // arrancó con $20.000 de IVA y a la que después se le sumó un
  // equipo de $30.000 muestra $50.000, sin forma de reconstruir el
  // reparto. Cerrado se ve exactamente lo de antes; la flecha es lo
  // único que se agrega.
  //
  // El depósito y el transporte no se desglosan porque no son por
  // equipo: se cobran una vez por despacho, no importa cuántos
  // equipos hayan salido en él.
  const renderBloqueAdicionales = ({
    clave,
    equipos,
    deposito,
    transporteTipo: tipoTransporte,
    transporteMonto: montoTransporte,
  }) => {
    const recuadro = renderAdicionales({
      key: `${clave}-recuadro`,
      iva: ivaDeEquipos(equipos),
      color: colorAdicionales,
      deposito,
      transporteTipo: tipoTransporte,
      transporteMonto: montoTransporte,
    });
    if (!recuadro) return null;

    // Solo hay algo que desglosar si más de un equipo aporta IVA.
    // Con uno solo, el detalle repetiría el total que ya está
    // arriba, y una flecha que no abre nada es peor que no tenerla.
    const aportantes = equipos.filter(
      (equipo) => ivaDeUnEquipo(equipo) > 0,
    );
    const hayDesglose = aportantes.length > 1;
    const abierto = seccionAbierta(factura.id, clave);

    return (
      <Box sx={{ mt: 1 }}>
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
              color: colorAdicionales,
            }}
          >
            <AddCardIcon fontSize="small" />
            Cargos adicionales
          </Typography>
          {hayDesglose && (
            <Tooltip
              title={abierto ? "Ocultar el detalle" : "Ver de dónde sale el IVA"}
            >
              <IconButton
                size="small"
                onClick={() => toggleSeccion(factura.id, clave)}
                sx={{ color: colorAdicionales }}
              >
                {abierto ? (
                  <ExpandLessIcon fontSize="small" />
                ) : (
                  <ExpandMoreIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        <Box sx={{ mt: 0.5 }}>{recuadro}</Box>

        {hayDesglose && abierto && (
          <Stack
            sx={{
              mt: 0.75,
              pl: 1.5,
              // Una línea al costado en vez de otro recuadro: el
              // detalle pertenece al recuadro de arriba, no es un
              // bloque nuevo que compita con él.
              borderLeft: "2px solid",
              borderColor: alpha(colorAdicionales, 0.5),
              rowGap: 0.25,
            }}
          >
            <Typography variant="rotuloDato" sx={{ color: colorAdicionales }}>
              IVA POR EQUIPO
            </Typography>
            {aportantes.map((equipo, indice) => (
              <Stack
                key={`${clave}-iva-${equipo.nombre}-${indice}`}
                direction="row"
                justifyContent="space-between"
                sx={{ gap: 2 }}
              >
                <Typography variant="body2" sx={{ minWidth: 0 }}>
                  {equipo.cantidad} {equipo.nombre}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
                  {formatearMoneda(ivaDeUnEquipo(equipo))}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </Box>
    );
  };

  const adicionalesFactura = equiposSonObjetos
    ? renderBloqueAdicionales({
        clave: "adicionales-factura",
        equipos: equiposOriginales,
        deposito: Number(factura.deposito) || 0,
        transporteTipo,
        transporteMonto: Number(factura.valorTransporte) || 0,
      })
    : null;

  const lotesAgregados = agruparLotesAgregados(equiposAgregados);

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
  if (equiposSonObjetos) {
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
  } else {
    if (deposito) {
      lineasTotalesDer.push(
        <Typography key="deposito" variant="body2">
          Depósito {deposito}
        </Typography>,
      );
    }
    if (transporteTipo || transporteMonto) {
      lineasTotalesDer.push(
        <Typography key="transporte" variant="body2">
          {transporteTipo === "Sin transporte"
            ? "Sin transporte"
            : ["Transporte", transporteTipo, transporteMonto]
                .filter(Boolean)
                .join(" ")}
        </Typography>,
      );
    }
  }
  const lineasTotales = [...lineasTotalesIzq, ...lineasTotalesDer];

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
      {equiposSonObjetos && (
        <Tooltip title="Agregar equipo">
          <IconButton
            size="small"
            onClick={() => onAgregarEquipo(factura)}
            sx={{ ...iconBtnSx, color: acento }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {/* Para el cliente que devuelve antes de que se le venza el
          alquiler: esa factura nunca entra a Seguimiento, así que
          sin este botón no habría dónde anotar la devolución. */}
      {equiposSonObjetos && (
        <Tooltip title="Registrar devolución">
          <IconButton
            size="small"
            onClick={() => onRegistrarDevolucion(factura)}
            sx={{ ...iconBtnSx, color: acento }}
          >
            <AssignmentReturnIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title="Descargar PDF">
        <IconButton
          size="small"
          onClick={() => generarFacturaPdf({ factura, cliente })}
          sx={{ ...iconBtnSx, color: acento }}
        >
          <PictureAsPdfIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Editar factura">
        <IconButton
          size="small"
          onClick={() => onEditar(factura)}
          sx={{ ...iconBtnSx, color: acento }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Eliminar factura">
        <IconButton
          size="small"
          color="error"
          onClick={() => onEliminar(factura)}
          sx={iconBtnSx}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
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
            Factura {factura.numeroFactura ?? "s/n"}
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
      {fechaVencimiento && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1 }}
        >
          Vencimiento: {fechaVencimiento}
        </Typography>
      )}

      {equiposSonObjetos ? (
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
              {mostrar("pagoGeneral") &&
                renderInfoPago({
                  key: "pago-original",
                  pagos: pagosOriginales,
                  tipoPago: factura.tipoPago,
                  fecha: factura.fecha,
                  colorEstado: colorPago,
                })}

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
                    {equiposOriginales.map((equipo, index) =>
                      renderEquipoRow(equipo, `original-${index}`, colorEquipos),
                    )}
                  </Box>

                  {adicionalesFactura}
                </Box>
              )}
            </Box>
          )}

          {equiposAgregados.length > 0 && (
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
                  Equipos agregados {equiposAgregados.length}
                </Typography>
                {renderToggle("equiposAgregados")}
              </Stack>
              {/* Cada lote —lo que se agregó de una sola vez— va
                  con sus equipos, después su pago y después sus
                  adicionales. */}
              {mostrar("equiposAgregados") &&
                lotesAgregados.map((lote, indiceLote) => {
                  const adicionalesLote = renderBloqueAdicionales({
                    clave: `lote-adicionales-${indiceLote}`,
                    equipos: lote.equipos,
                    deposito: Number(lote.cabecera.deposito) || 0,
                    transporteTipo: lote.cabecera.transporte || null,
                    transporteMonto:
                      Number(lote.cabecera.valorTransporte) || 0,
                  });

                  // Cuántas columnas ocupa este lote: una sola si
                  // trae un equipo, dos si trae dos o más. El ancho
                  // se le pone al lote COMPLETO —no solo a la fila de
                  // equipos— para que su información de pago y sus
                  // cargos adicionales queden en la misma columna que
                  // el equipo. Sueltos se iban a todo lo ancho y el
                  // equipo quedaba a media pantalla con los datos
                  // desalineados debajo.
                  const columnasLote = Math.min(
                    lote.equipos.length,
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
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "1fr",
                            sm: `repeat(${columnasLote}, 1fr)`,
                          },
                          gap: 1,
                        }}
                      >
                        {lote.equipos.map((equipo, index) =>
                          renderEquipoRow(
                            equipo,
                            `agregado-${indiceLote}-${index}`,
                            colorEquiposAgregados,
                          ),
                        )}
                      </Box>

                      <Box sx={{ mt: 1 }}>
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
                        {renderInfoPago({
                          key: `lote-pago-${indiceLote}`,
                          pagos: normalizarPagos(
                            lote.cabecera.pagos,
                            lote.cabecera.modoPago,
                            null,
                          ),
                          tipoPago: lote.cabecera.tipoPago,
                          fecha: lote.cabecera.fechaAgregado,
                          colorEstado: colorPago,
                        })}
                      </Box>

                      {adicionalesLote}
                    </Box>
                  );
                })}
            </Box>
          )}

          {/* Los abonos van al final de todo lo que se despachó:
              después de los equipos agregados si los hay, y si no,
              después de los equipos de la factura. */}
          {(factura.abonos || []).length > 0 && (
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
                  {renderAbonos(factura.abonos, colorAbonos)}
                </Box>
              )}
            </Box>
          )}
        </>
      ) : (
        factura.equipos?.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {factura.equipos.join(", ")}
            </Typography>
          </Box>
        )
      )}

      {(lineasTotales.length > 0 || valorTotal) && (
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
            {renderToggle("pagoTotal")}
          </Stack>
          {mostrar("pagoTotal") && (
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
      )}
        </>
      )}
    </Box>
  );
}

FacturaCard.propTypes = {
  factura: PropTypes.object.isRequired,
  cliente: PropTypes.object,
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
