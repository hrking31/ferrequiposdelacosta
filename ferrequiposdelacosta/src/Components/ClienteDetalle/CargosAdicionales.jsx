// Lo que se cobra aparte del alquiler de un lote de equipos: el IVA y el
// transporte, con su total, y —al desplegar la flecha— el IVA
// discriminado equipo por equipo.
//
// El IVA del recuadro es la suma del de todos los equipos del grupo, y sumado
// no se entiende de dónde salió: una factura que arrancó con $20.000 de IVA y
// a la que después se le sumó un equipo de $30.000 muestra $50.000, sin forma
// de reconstruir el reparto. La flecha vive arriba a la derecha, DENTRO del
// mismo recuadro —igual que el botón de ocultar factura—, y el detalle
// abre debajo, también adentro.
//
// El desglose parte el IVA de cada equipo en los renglones que se cobran
// distinto: la renta inicial, los días que se pactaron después y los días que
// el equipo se quedó afuera pasada la fecha. Cada uno lleva su nombre, porque
// decirle "días ampliados" a un vencimiento cuenta que alguien autorizó esos
// días, cuando lo que pasó es que el cliente no devolvió.
//
// Lo que devolvió sin usar NO tiene renglón propio: se le resta a la renta
// inicial, que es lo que corrige. Un equipo que salió por 3 días y volvió a 1
// se lee como un solo renglón de 1 día —lo que se le cobra— en vez de 3 y −2,
// que obliga a restar de cabeza para saber lo que interesa.
//
// El transporte no se desglosa porque no es por equipo: se cobra una vez por
// despacho, no importa cuántos equipos hayan salido en él.
//
// El depósito NO está acá: no es un cargo sino una garantía, y tiene su
// propio recuadro (RecuadroDeposito). Mientras estuvo entre los cargos se
// sumaba al "Total adicionales" como si fuera un cobro.
import { Fragment } from "react";
import PropTypes from "prop-types";
import {
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddCardIcon from "@mui/icons-material/AddCard";
// Un ícono por cargo: el porcentaje es el IVA, el camión el flete y el recibo
// la suma.
import PercentIcon from "@mui/icons-material/Percent";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { equipoLlevaIva, tramosDeEquipo } from "./facturaUtils";
import {
  detenerToque,
  renderContenidoPlano,
  iconBtnSx,
  propsRenglonPlegable,
  renderFilaDatos,
  renderFlechaPlegable,
  renderRecuadroBloque,
  sxRenglonPlegable,
} from "./recuadrosCuenta";
// Con alias: la moneda que deja el hueco vacío si no hay número.
import { formatearMonedaOVacio as formatearMoneda } from "../../Utils/formato";

const IVA = 0.19;

// Los datos del recuadro de importes. Antes vivía dentro del cuadro de pago,
// mezclado con el medio y el monto; ahora va en su propio recuadro, debajo de
// los equipos. Devuelve la lista de datos en vez del recuadro ya armado,
// para que el componente pueda meterle la flecha y el desglose adentro.
const datosAdicionales = ({
  transporteTipo,
  transporteMonto,
  iva,
  colores,
}) => {
  const hayTransporte = transporteTipo && transporteTipo !== "Sin transporte";
  const hayIva = Number(iva) > 0;
  if (!hayTransporte && !hayIva) return null;

  const total = (hayIva ? Number(iva) : 0) + (hayTransporte ? transporteMonto : 0);

  const datos = [];
  if (hayIva) {
    datos.push({
      clave: "iva",
      Icono: PercentIcon,
      // Violeta: el impuesto no es del negocio, es del Estado. Con el naranja
      // del bloque se confundía con el rótulo que lo encabeza.
      colorIcono: colores.impuesto,
      rotulo: "IVA (19%)",
      valor: formatearMoneda(Number(iva)),
    });
  }
  // El tipo de transporte y su valor van juntos: son un solo dato, no dos
  // ("Ida y vuelta · $60.000").
  if (hayTransporte) {
    datos.push({
      clave: "transporte",
      Icono: LocalShippingIcon,
      // Azul, el del movimiento: el flete es logística, no alquiler.
      colorIcono: colores.movimiento,
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
    Icono: ReceiptLongIcon,
    // El acento, que es el color de los totales en toda la ficha.
    colorIcono: colores.total,
    rotulo: "Total adicionales",
    valor: formatearMoneda(total),
  });

  return datos;
};

// Cómo se llama cada tramo, con su número de días por delante. En singular
// cuando es uno solo: "1 día vencido" y no "1 días vencidos".
const NOMBRES_DE_TRAMO = {
  inicial: { uno: "día renta inicial", varios: "días renta inicial" },
  ampliados: { uno: "día ampliado", varios: "días ampliados" },
  vencidos: { uno: "día vencido", varios: "días vencidos" },
};

const conceptoDelTramo = (tipo, dias) => {
  const nombre = NOMBRES_DE_TRAMO[tipo];
  return `${dias} ${dias === 1 ? nombre.uno : nombre.varios}`;
};

export default function CargosAdicionales({
  equipos,
  transporteTipo,
  transporteMonto,
  // La marca de IVA de la factura: vale para los equipos que no traen la suya
  // propia (las facturas viejas, migradas del Excel).
  abierto,
  onToggle,
  // El plegado del BLOQUE entero, aparte del desglose del IVA que vive
  // adentro: en celular su rótulo oculta las cifras como el de cualquier otro
  // bloque de la factura.
  bloqueAbierto,
  onToggleBloque,
}) {
  const theme = useTheme();
  const esMovil = useMediaQuery(theme.breakpoints.down("sm"));
  const color = theme.palette.custom.seccionAdicionales;

  // Cada equipo respeta su propia marca de IVA (o la de la factura, si no
  // trae la suya). El de un lote es solo el de sus equipos, sin contar el de
  // otro lote agregado después.
  const llevaIvaEquipo = (equipo) => equipoLlevaIva(equipo);

  // Los renglones que se ven al desplegar, cada uno con su valor y su IVA.
  // El que no mueve plata no se dibuja: un equipo sin días de más tiene una
  // sola línea, la suya.
  //
  // El nombre del equipo va aparte del concepto porque en pantalla se dibujan
  // aparte: el nombre encabeza el grupo y los conceptos van debajo. Repetido
  // en cada renglón —"1 COMPRESOR NEUMATICO INGERSOLLRAND 185 · días vencidos
  // pagados"— no cabía en una línea, y al partirse en dos descolocaba los
  // totales de la derecha. La etiqueta completa sobrevive en el `title`, para
  // el que pare el mouse encima.
  // Un renglón por tramo, en el orden en que pasaron: los trae así la cuenta
  // del equipo (ver tramosDeEquipo), que es la única que sabe la fecha de
  // cada uno. El que no mueve plata no se dibuja — un equipo que salió y
  // volvió a tiempo tiene una sola línea, la suya.
  const renglonesDeEquipo = (equipo) => {
    const nombre = `${equipo.cantidadEquipos} ${equipo.nombre}`;
    const conIva = llevaIvaEquipo(equipo);

    return tramosDeEquipo(equipo)
      .filter((tramo) => tramo.valor !== 0)
      .map((tramo) => {
        const concepto = conceptoDelTramo(tramo.tipo, tramo.dias);

        return {
          clave: tramo.clave,
          concepto,
          equipo: nombre,
          etiqueta: `${nombre} · ${concepto}`,
          valor: tramo.valor,
          iva: conIva ? tramo.valor * IVA : 0,
        };
      });
  };

  // El IVA de UN equipo completo. Sale de los mismos tramos que el desglose,
  // así que los renglones de abajo siempre suman el número de arriba.
  const ivaDeUnEquipo = (equipo) =>
    renglonesDeEquipo(equipo).reduce((total, renglon) => total + renglon.iva, 0);

  const ivaDeEquipos = (lista) =>
    lista.reduce((total, equipo) => total + ivaDeUnEquipo(equipo), 0);

  const datos = datosAdicionales({
    iva: ivaDeEquipos(equipos),
    transporteTipo,
    transporteMonto,
    colores: {
      impuesto: theme.palette.custom.seccionEquiposAgregados,
      movimiento: theme.palette.custom.estadoEquipo.ampliacion,
      total: theme.palette.custom.accent,
    },

  });
  if (!datos) return null;

  // El transporte del despacho, que cada renglón del desglose suma a su
  // propio IVA para mostrar a cuánto llegaría el total con esa parte. Es una lectura por renglón, no una suma: el despacho se cobra una
  // sola vez, así que la columna NO totaliza —sumarla daría más que el
  // "Total adicionales" de arriba, que es el número que manda—.
  const cargosDelLote =
    transporteTipo && transporteTipo !== "Sin transporte"
      ? Number(transporteMonto) || 0
      : 0;

  // Hay algo que desglosar si más de un equipo aporta IVA —si fuera uno
  // solo, la línea repetiría el total que ya está arriba— o si ese único
  // equipo se parte en varios renglones, porque ahí sí hay algo nuevo que
  // mostrar: de dónde salió cada pedazo. El transporte no entra acá: es un
  // cargo único del lote, no de cada equipo (ver la nota
  // de arriba).
  const aportantes = equipos.filter((equipo) => ivaDeUnEquipo(equipo) > 0);
  // La casilla del IVA es la que abre su propio desglose: el toque va en ella
  // y no en el bloque entero, que es lo que se tocaba antes sin querer. Se le
  // agrega acá abajo y no al armarla porque recién ahora se sabe si hay algo
  // que abrir.
  const marcarCasillaIva = (hay) => {
    if (!esMovil || !hay) return;
    const casillaIva = datos.find((dato) => dato.clave === "iva");
    if (!casillaIva) return;
    casillaIva.props = propsRenglonPlegable({
      abierto,
      alternar: onToggle,
      etiqueta: abierto ? "Ocultar el detalle" : "Ver de dónde sale el IVA",
    });
    casillaIva.sxCasilla = sxRenglonPlegable;
  };

  const hayDesglose =
    aportantes.length > 1 ||
    aportantes.some((equipo) => renglonesDeEquipo(equipo).length > 1);

  marcarCasillaIva(hayDesglose);

  // CADA EQUIPO LLEVA SU PROPIA CUENTA. La columna de la derecha dice a
  // cuánto llega el "Total adicionales" con este equipo: los cargos del
  // despacho —el flete, que es del lote— más el IVA de sus tramos,
  // sumados de a uno.
  //
  // No se encadena entre equipos, y ahí estaba el error: dos equipos que
  // salieron en el MISMO despacho no ocurrieron uno después del otro, así que
  // encadenarlos mostraba un número que nunca existió —"el total si el otro
  // equipo no hubiera salido"—. La columna se lee renglón por renglón y NO
  // suma hacia abajo.
  //
  // El número que coincide con el "Total adicionales" de arriba no se repite.
  // Pasa cuando el grupo tiene un solo equipo: ahí su último tramo cierra
  // justo en el total que ya está a la vista.
  const totalAdicionales = cargosDelLote + ivaDeEquipos(equipos);
  const mismoNumero = (uno, otro) => Math.round(uno) === Math.round(otro);

  // Los equipos, el último agregado primero; y dentro de cada uno sus tramos
  // al revés de como pasaron —lo más reciente arriba—, que es como se lee.
  // El orden de los tramos ya no se deduce de su clase: lo trae la cuenta del
  // equipo, que sabe la fecha de cada uno (ver tramosDeEquipo).
  const filasDelDesglose = [];
  [...aportantes].reverse().forEach((equipo, indice) => {
    let acumulado = cargosDelLote;
    const renglones = renglonesDeEquipo(equipo).map((renglon) => {
      acumulado += renglon.iva;
      return {
        ...renglon,
        // Dos equipos pueden llamarse igual en el mismo lote, así que el
        // índice va pegado a la clave.
        clave: `${equipo.nombre}-${indice}-${renglon.clave}`,
        totalHistorico: mismoNumero(acumulado, totalAdicionales)
          ? null
          : acumulado,
      };
    });

    filasDelDesglose.push({
      clave: `equipo-${equipo.nombre}-${indice}`,
      titulo: `${equipo.cantidadEquipos} ${equipo.nombre}`,
    });
    filasDelDesglose.push(...renglones.reverse());
  });

  // La flecha va DENTRO del recuadro, al lado de los datos y a su mismo
  // nivel —no en un renglón propio arriba, que solo dejaba un hueco vacío—,
  // igual que el botón de ocultar factura.
  const contenidoRecuadro = (
    <>
      <Stack
        direction="row"
        alignItems="flex-start"
        // El detalle NO lo abre el bloque entero: lo abre la casilla del IVA,
        // que es el número que explica (ver datosAdicionales). Tocando el
        // resto no pasa nada, como debe ser.
        sx={{ gap: 1 }}
      >
        {/* El desglose va DENTRO de esta caja, junto a la fila de datos, y no
            debajo del Stack: así hereda el mismo ancho —el del recuadro menos
            la flecha— y su última columna cae exactamente bajo el "Total
            adicionales". Colgado afuera había que adivinar cuánto mide el
            botón y el total quedaba corrido por esos pixeles. */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {renderFilaDatos(color, datos)}

          {hayDesglose && abierto && (
            // Una sola cuadrícula para todo el detalle: cada total de la
            // derecha es una celda de la MISMA fila que su renglón, así que le
            // queda al lado aunque el texto se parta en dos líneas. Dibujados
            // como dos listas sueltas —los nombres por un lado, los totales
            // por otro—, una línea de más corría todos los totales y dejaban
            // de explicar nada.
            //
            // Las dos primeras columnas miden lo que mide su contenido, así
            // que el IVA queda pegado al concepto que lo explica en vez de
            // irse a media pantalla; el hueco que sobra lo absorbe una tercera
            // columna vacía. La última mide lo mismo que una de la fila de
            // arriba —el ancho del recuadro menos los divisores, repartido
            // entre tantas partes como datos haya—, así que los totales caen
            // justo bajo el "Total adicionales" que explican.
            <Box
              onClick={detenerToque}
              sx={{
                mt: 0.75,
                // La línea separa los importes del bloque —lo que se ve
                // siempre— del detalle que abre la flecha, igual que en la
                // historia de un equipo.
                pt: 0.75,
                borderTop: "1px solid",
                borderColor: "divider",
                display: "grid",
                gridTemplateColumns: {
                  xs: "minmax(0, max-content) max-content 1fr max-content",
                  sm: `minmax(0, max-content) max-content 1fr calc((100% - ${
                    datos.length - 1
                  }px) / ${datos.length})`,
                },
                rowGap: 0.25,
              }}
            >
              <Typography
                variant="rotuloDato"
                sx={{ color: color, gridColumn: "1 / 4", px: { sm: 0.75 } }}
              >
                IVA POR EQUIPO
              </Typography>

              {filasDelDesglose.map((fila) =>
                fila.titulo ? (
                  // El nombre del equipo, una sola vez, encabezando lo suyo.
                  <Typography
                    key={fila.clave}
                    variant="body2"
                    fontWeight="bold"
                    sx={{
                      gridColumn: "1 / 4",
                      px: { sm: 0.75 },
                      mt: 0.75,
                    }}
                  >
                    {fila.titulo}
                  </Typography>
                ) : (
                  <Fragment key={fila.clave}>
                    {/* El concepto va sangrado bajo el nombre que lo encabeza
                        y guarda la etiqueta completa en el `title`, para el
                        que pare el mouse encima. */}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      title={fila.etiqueta}
                      sx={{
                        gridColumn: 1,
                        minWidth: 0,
                        pl: { xs: 1.5, sm: 2.25 },
                      }}
                    >
                      {fila.concepto}
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      sx={{
                        gridColumn: 2,
                        pl: 2,
                        whiteSpace: "nowrap",
                        textAlign: "right",
                      }}
                    >
                      {formatearMoneda(fila.iva)}
                    </Typography>
                    {/* A cuánto llega el total adicional con este equipo. El
                        renglón que daría el mismo número que está arriba no
                        lo lleva: repetirlo no agregaría nada. */}
                    {fila.totalHistorico !== null && (
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        sx={{
                          gridColumn: 4,
                          pl: { sm: 0.75 },
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatearMoneda(fila.totalHistorico)}
                      </Typography>
                    )}
                  </Fragment>
                ),
              )}
            </Box>
          )}
        </Box>
        {hayDesglose &&
          (esMovil ? (
            // La señal vuelve a su esquina, a la derecha del bloque, que es
            // donde se busca. Quien ABRE es la casilla del IVA —la flecha
            // solo avisa que hay algo detrás de ese número—.
            renderFlechaPlegable(abierto, theme.palette.custom.accent)
          ) : (
            <Tooltip
              title={abierto ? "Ocultar el detalle" : "Ver de dónde sale el IVA"}
            >
              <IconButton
                size="small"
                onClick={onToggle}
                sx={{ ...iconBtnSx, color, flexShrink: 0 }}
              >
                {abierto ? (
                  <ExpandLessIcon fontSize="small" />
                ) : (
                  <ExpandMoreIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          ))}
      </Stack>

    </>
  );

  const rotulo = (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      {...(esMovil
        ? propsRenglonPlegable({
            abierto: bloqueAbierto,
            alternar: onToggleBloque,
            etiqueta: "Cargos adicionales",
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
        color,
      }}
    >
        <AddCardIcon fontSize="small" />
        Cargos adicionales
      </Typography>
      {esMovil && renderFlechaPlegable(bloqueAbierto, theme.palette.custom.accent)}
    </Stack>
  );

  // En celular, un solo recuadro con el rótulo adentro y una línea que lo
  // separa de las cifras, igual que la información de pago y el total: así
  // los bloques de la factura se leen todos igual. En computador el rótulo va
  // apoyado encima del recuadro, como estuvo siempre.
  return esMovil ? (
    <Box sx={{ mt: 1 }}>
      {renderRecuadroBloque(
        color,
        <>
          {rotulo}
          {bloqueAbierto && renderContenidoPlano(color, contenidoRecuadro)}
        </>,
      )}
    </Box>
  ) : (
    <Box sx={{ mt: 1 }}>
      {rotulo}

      <Box sx={{ mt: 0.5 }}>
        {renderRecuadroBloque(color, contenidoRecuadro)}
      </Box>
    </Box>
  );
}

CargosAdicionales.propTypes = {
  equipos: PropTypes.array.isRequired,
  transporteTipo: PropTypes.string,
  transporteMonto: PropTypes.number,
  abierto: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
  bloqueAbierto: PropTypes.bool,
  onToggleBloque: PropTypes.func,
};
