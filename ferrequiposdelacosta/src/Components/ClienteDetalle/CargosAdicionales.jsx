// Lo que se cobra aparte del alquiler de un lote de equipos: el IVA, el
// depósito y el transporte, con su total, y —al desplegar la flecha— el IVA
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
// El depósito y el transporte no se desglosan porque no son por equipo: se
// cobran una vez por despacho, no importa cuántos equipos hayan salido en él.
import { Fragment } from "react";
import PropTypes from "prop-types";
import {
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import AddCardIcon from "@mui/icons-material/AddCard";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { calcularEquipo, diasDeEquipo, equipoLlevaIva } from "./facturaUtils";
import { iconBtnSx, renderFilaDatos, renderRecuadroBloque } from "./recuadrosCuenta";
// Con alias: la moneda que deja el hueco vacío si no hay número.
import { formatearMonedaOVacio as formatearMoneda } from "../../Utils/formato";

const IVA = 0.19;

// Los datos del recuadro de importes. Antes vivía dentro del cuadro de pago,
// mezclado con el medio y el monto; ahora va en su propio recuadro, debajo de
// los equipos. Devuelve la lista de datos en vez del recuadro ya armado,
// para que el componente pueda meterle la flecha y el desglose adentro.
const datosAdicionales = ({
  deposito,
  transporteTipo,
  transporteMonto,
  iva,
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

  return datos;
};

// Lo que vale cada parte de un equipo, separada por concepto. Sale todo de la
// misma cuenta —calcularEquipo—, que ya expone lo pactado y lo vencido por
// separado justamente para que una pantalla los pueda nombrar distinto.
//
// Ya no hay una parte "sin usar". Un equipo que volvió antes trae en sus días
// los que de verdad estuvo afuera, así que lo que no usó nunca entró al
// cobro: no hay nada que restar después.
const partesDeEquipo = (equipo, hoyIso) => {
  const porDia =
    (Number(equipo?.cantidadEquipos) || 0) * (Number(equipo?.valorDia) || 0);
  const cuenta = hoyIso ? calcularEquipo(equipo, hoyIso) : calcularEquipo(equipo);
  const dias = hoyIso ? diasDeEquipo(equipo, hoyIso) : diasDeEquipo(equipo);

  return {
    inicial: dias.alta * porDia,
    // Lo que se pactó DE MÁS al ampliarle el plazo, ya con su descuento.
    ampliados: Math.max(0, dias.ampliados * porDia - cuenta.descuento),
    // Los que se le vencieron y ya pagó: se cerraron al recibir el pago y por
    // eso no están entre los vencidos, pero se cobran igual y tienen que
    // aparecer, o el desglose sumaría menos que el total del equipo.
    pagados: dias.pagados * porDia,
    // Los días vencidos se cobran al valor del día y sin descuento.
    vencidos: dias.vencidos * porDia,
  };
};

export default function CargosAdicionales({
  equipos,
  deposito,
  transporteTipo,
  transporteMonto,
  // La marca de IVA de la factura: vale para los equipos que no traen la suya
  // propia (las facturas viejas, migradas del Excel).
  abierto,
  onToggle,
}) {
  const theme = useTheme();
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
  const renglonesDeEquipo = (equipo) => {
    const partes = partesDeEquipo(equipo);
    const nombre = `${equipo.cantidadEquipos} ${equipo.nombre}`;
    const conIva = llevaIvaEquipo(equipo);

    return [
      {
        clave: "inicial",
        concepto: "renta inicial",
        // Si salió por 3 días y devolvió a 1, este renglón vale 1 día: los
        // días que quedaron escritos al volver son los que estuvo afuera.
        valor: partes.inicial,
      },
      {
        clave: "ampliados",
        concepto: "días ampliados",
        valor: partes.ampliados,
      },
      {
        clave: "pagados",
        concepto: "días vencidos pagados",
        valor: partes.pagados,
      },
      {
        clave: "vencidos",
        concepto: "días vencidos",
        valor: partes.vencidos,
      },
    ]
      .filter((renglon) => renglon.valor !== 0)
      .map((renglon) => ({
        ...renglon,
        equipo: nombre,
        etiqueta: `${nombre} · ${renglon.concepto}`,
        iva: conIva ? renglon.valor * IVA : 0,
      }));
  };

  // El IVA de UN equipo completo. Sale de las mismas partes que el desglose,
  // así que los renglones de abajo siempre suman el número de arriba.
  const ivaDeUnEquipo = (equipo) => {
    if (!llevaIvaEquipo(equipo)) return 0;
    const partes = partesDeEquipo(equipo);
    return (
      (partes.inicial + partes.ampliados + partes.pagados + partes.vencidos) * IVA
    );
  };

  const ivaDeEquipos = (lista) =>
    lista.reduce((total, equipo) => total + ivaDeUnEquipo(equipo), 0);

  const datos = datosAdicionales({
    iva: ivaDeEquipos(equipos),
    deposito,
    transporteTipo,
    transporteMonto,
  });
  if (!datos) return null;

  // El depósito y el transporte del despacho, que cada renglón del desglose
  // suma a su propio IVA para mostrar a cuánto llegaría el total con esa
  // parte. Es una lectura por renglón, no una suma: el despacho se cobra una
  // sola vez, así que la columna NO totaliza —sumarla daría más que el
  // "Total adicionales" de arriba, que es el número que manda—.
  const cargosDelLote =
    Math.max(0, Number(deposito) || 0) +
    (transporteTipo && transporteTipo !== "Sin transporte"
      ? Number(transporteMonto) || 0
      : 0);

  // Hay algo que desglosar si más de un equipo aporta IVA —si fuera uno
  // solo, la línea repetiría el total que ya está arriba— o si ese único
  // equipo se parte en varios renglones, porque ahí sí hay algo nuevo que
  // mostrar: de dónde salió cada pedazo. El depósito y el transporte no
  // entran acá: son un cargo único del lote, no de cada equipo (ver la nota
  // de arriba).
  const aportantes = equipos.filter((equipo) => ivaDeUnEquipo(equipo) > 0);
  const hayDesglose =
    aportantes.length > 1 ||
    aportantes.some((equipo) => renglonesDeEquipo(equipo).length > 1);

  // Los renglones en el orden en que ocurrieron: primero el alta —todos los
  // equipos salieron en el mismo despacho— y después lo que fue pasando con
  // cada uno, los días que se pactaron y los que se vencieron.
  const conClave = (equipo, indice, renglon) => ({
    ...renglon,
    clave: `${equipo.nombre}-${indice}-${renglon.clave}`,
    // De quién es el renglón: dos equipos pueden llamarse igual en el mismo
    // lote, así que el índice va pegado. Sirve para saber cuándo el historial
    // cambia de equipo y hay que volver a escribir el nombre.
    idEquipo: `${equipo.nombre}-${indice}`,
    esDelAlta: renglon.clave === "inicial",
  });
  const renglonesEnOrden = [
    ...aportantes.flatMap((equipo, indice) =>
      renglonesDeEquipo(equipo)
        .filter((renglon) => renglon.clave === "inicial")
        .map((renglon) => conClave(equipo, indice, renglon)),
    ),
    ...aportantes.flatMap((equipo, indice) =>
      renglonesDeEquipo(equipo)
        .filter((renglon) => renglon.clave !== "inicial")
        .map((renglon) => conClave(equipo, indice, renglon)),
    ),
  ];

  // La columna de la derecha es el HISTORIAL del "Total adicionales": a
  // cuánto llegaba ese número después de cada movimiento. Por eso es un
  // acumulado —el despacho más todo el IVA hasta ahí— y no el aporte suelto
  // de cada renglón.
  //
  // El último movimiento no lleva total: ese es justamente el número que está
  // arriba, siempre a la vista. Repetirlo abajo no agregaría nada.
  //
  // Y se muestra al revés de como ocurrió: lo más reciente arriba, el alta
  // abajo del todo, que es como se lee un historial.
  let ivaAcumulado = 0;
  const renglonesDelDesglose = renglonesEnOrden
    .map((renglon, indice) => {
      ivaAcumulado += renglon.iva;
      const esElVigente = indice === renglonesEnOrden.length - 1;
      return {
        ...renglon,
        totalHistorico: esElVigente ? null : cargosDelLote + ivaAcumulado,
      };
    })
    .reverse();

  // Lo que se dibuja, ya en el orden final: el nombre del equipo encabeza sus
  // renglones y no se repite mientras los que siguen sean suyos. Como manda el
  // historial y no el equipo, un equipo que se movió dos veces en momentos
  // distintos aparece encabezando dos grupos —es el precio de leer la cuenta
  // en el orden en que pasó, que es como se entiende—.
  const filasDelDesglose = [];
  let equipoEnCurso = null;
  renglonesDelDesglose.forEach((renglon) => {
    if (renglon.idEquipo !== equipoEnCurso) {
      filasDelDesglose.push({
        clave: `equipo-${renglon.clave}`,
        titulo: renglon.equipo,
      });
      equipoEnCurso = renglon.idEquipo;
    }
    filasDelDesglose.push(renglon);
  });

  // La flecha va DENTRO del recuadro, al lado de los datos y a su mismo
  // nivel —no en un renglón propio arriba, que solo dejaba un hueco vacío—,
  // igual que el botón de ocultar factura.
  const contenidoRecuadro = (
    <>
      <Stack
        direction="row"
        alignItems="flex-start"
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
            // La última columna mide lo mismo que una de la fila de arriba
            // —el ancho del recuadro menos los divisores, repartido entre
            // tantas partes como datos haya—, así que los totales caen justo
            // bajo el "Total adicionales" que explican.
            <Box
              sx={{
                mt: 0.75,
                display: "grid",
                gridTemplateColumns: {
                  xs: "minmax(0, 1fr) max-content max-content",
                  sm: `minmax(0, 1fr) max-content calc((100% - ${
                    datos.length - 1
                  }px) / ${datos.length})`,
                },
                rowGap: 0.25,
              }}
            >
              <Typography
                variant="rotuloDato"
                sx={{ color: color, gridColumn: "1 / 3", px: { sm: 0.75 } }}
              >
                IVA POR EQUIPO
              </Typography>

              {filasDelDesglose.map((fila) =>
                fila.titulo ? (
                  // El nombre del equipo, una sola vez, encabezando lo suyo.
                  <Typography
                    key={fila.clave}
                    variant="body2"
                    sx={{
                      gridColumn: "1 / 3",
                      px: { sm: 0.75 },
                      mt: 0.5,
                      fontWeight: 600,
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
                      variant="body2"
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
                      sx={{
                        gridColumn: 2,
                        pl: 2,
                        whiteSpace: "nowrap",
                        textAlign: "right",
                      }}
                    >
                      {formatearMoneda(fila.iva)}
                    </Typography>
                    {/* A cuánto llegaba el total adicional después de este
                        movimiento. El renglón vigente no lleva ninguno: su
                        total es el que está arriba, siempre a la vista. */}
                    {fila.totalHistorico !== null && (
                      <Typography
                        variant="body2"
                        sx={{
                          gridColumn: 3,
                          pl: { sm: 0.75 },
                          whiteSpace: "nowrap",
                          fontWeight: 600,
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
        {hayDesglose && (
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
        )}
      </Stack>

    </>
  );

  return (
    <Box sx={{ mt: 1 }}>
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

      <Box sx={{ mt: 0.5 }}>
        {renderRecuadroBloque(color, contenidoRecuadro)}
      </Box>
    </Box>
  );
}

CargosAdicionales.propTypes = {
  equipos: PropTypes.array.isRequired,
  deposito: PropTypes.number,
  transporteTipo: PropTypes.string,
  transporteMonto: PropTypes.number,
  abierto: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
};
