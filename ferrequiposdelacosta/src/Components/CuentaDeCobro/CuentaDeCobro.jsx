import PropTypes from "prop-types";
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  RadioGroup,
  Radio,
  FormControlLabel,
  useTheme,
} from "@mui/material";
import ConstructionIcon from "@mui/icons-material/Construction";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { TituloSeccion } from "../PanelLista/ResumenLista";
import { useSelector, useDispatch } from "react-redux";
import { setFormCuentaCobro } from "../../Store/Slices/cuentacobroSlice";
import {
  formatearMoneda,
  formatearMonedaInput,
  limpiarMonedaInput,
  formatearNit,
  limpiarNit,
} from "../../Utils/formato";
import resumenCuentaCobro, {
  UNIDADES_DE_TIEMPO,
  valorDeFila,
} from "./resumenCuentaCobro";
import { usePantallaCompacta } from "../../Utils/pantalla";
import IconoDeposito from "../ClienteDetalle/IconoDeposito";
import DiscountIcon from "@mui/icons-material/Discount";
import PercentIcon from "@mui/icons-material/Percent";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PaidIcon from "@mui/icons-material/Paid";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import HandymanIcon from "@mui/icons-material/Handyman";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import TollIcon from "@mui/icons-material/Toll";
import ScheduleIcon from "@mui/icons-material/Schedule";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";

// Cada renglón de las pizarras con el ícono y el color que lleva en el estado
// de cuenta de la factura. Las clases ("pagado", "abono", "alerta") son las de
// la pizarra del tema.
const RENGLONES = {
  Subtotal: { Icono: ConstructionIcon },
  Descuento: { Icono: DiscountIcon, color: "success.light" },
  "IVA (19%)": { Icono: PercentIcon },
  Transporte: { Icono: LocalShippingIcon },
  Total: { Icono: ReceiptLongIcon, clase: "total" },
  Pagado: { Icono: PaidIcon, clase: "pagado" },
  Abonos: { Icono: AddCircleIcon, clase: "abono" },
  "Retenido por daños": { Icono: HandymanIcon, color: "warning.light" },
  "Devuelto al cliente": { Icono: CurrencyExchangeIcon },
  "Depósito por cobrar": { Icono: TollIcon, clase: "alerta" },
  // Los del depósito.
  Recibido: { Icono: TollIcon },
  "Por cobrar": { Icono: TollIcon, clase: "alerta" },
  "Aplicado a la factura": { Icono: ReceiptLongIcon },
  Devuelto: { Icono: CurrencyExchangeIcon },
  "En garantía": { Icono: AccountBalanceWalletIcon, clase: "resaltada" },
  "Por devolver": { Icono: AccountBalanceWalletIcon, clase: "resaltada" },
};

// En la pizarra del depósito, lo que sale de él va con su signo, como en la
// factura.
const SALEN_DEL_DEPOSITO = ["Retenido por daños", "Aplicado a la factura", "Devuelto"];
const CIERRES_DEL_DEPOSITO = ["En garantía", "Por devolver"];

// `forma="acostada"`: la tableta acostada (pedido del dueño, 2026-11-05). El
// formulario ocupa todo el alto de su columna: los datos en renglones de a
// tres, los ítems de corrido, el botón de agregar estirado hasta las pizarras
// —se encoge con cada ítem— y las pizarras abajo. Así no queda espacio vacío
// debajo. Cuando no cabe, se desplaza la columna entera: un solo
// desplazamiento, en el computador y en la tableta.
export default function CuentaCobro({ forma = "normal" }) {
  const theme = useTheme();
  const acostada = forma === "acostada";
  // `forma="dePie"`: la tableta de pie (pedido del dueño, 2026-11-05). Las
  // piezas van sueltas en la grilla de la pantalla: los datos y la pizarra a la
  // izquierda, los ítems a la derecha y la hoja debajo (ver VistaCuentaDeCobro).
  const dePie = forma === "dePie";
  // En la tableta, de pie o acostada, el botón de agregar se estira hasta
  // abajo si sobra alto.
  const llenaElAlto = acostada || dePie;
  // El ancho de los campos de a dos, que acostada van de a tres.
  const deATres = acostada ? 4 : 6;
  const compacta = usePantallaCompacta();
  // En la tableta, Persona, Empresa, IVA y la fecha en un solo renglón (pedido
  // del dueño, 2026-11-05): las casillas más chicas y la fecha toma lo que queda.
  const casillaChica = llenaElAlto ? { size: "small", sx: { p: 0.75 } } : {};
  const opcion = llenaElAlto
    ? { flex: "none", alignItems: "center", mr: 1.5 }
    : { flex: 1, alignItems: "center" };
  const dispatch = useDispatch();
  const formValues = useSelector((state) => state.cuentacobro.value);
  const { items, total } = formValues;
  // Los mismos renglones del PDF: la pantalla y el documento no pueden decir dos
  // cifras distintas.
  const { filas, filasDeposito, aCancelar, hayMovimientos } =
    resumenCuentaCobro(formValues);
  // Traída de las facturas: sus datos no se modifican acá. Si hay un error se
  // arregla en la factura y se vuelve a pasar. Solo queda libre el "por concepto
  // de", que la factura no trae.
  const bloqueada = Boolean(formValues.desdeFacturas);

  // El subtotal de un ítem es cantidad x precio x tiempo, sea en días o en horas
  // (el precio es el de esa unidad). Se guarda como NÚMERO;
  // el formato de moneda se pone recién al mostrarlo.
  const calcularSubtotal = (item) =>
    (Number(item.quantity) || 0) *
    (Number(item.price) || 0) *
    (Number(item.day) || 0);

  // Recalcula el desglose entero a partir de un value ya actualizado y lo
  // guarda TODO en un solo dispatch: total = subtotal - descuento + IVA +
  // transporte. El IVA solo suma si su casilla está marcada, y el descuento se
  // resta ANTES del IVA, como en la factura. El depósito va aparte, también como
  // en la factura.
  //
  // Lo que se cobra no es el total sino el SALDO, y no se guarda: se calcula al
  // mostrarlo (ver resumenCuentaCobro).
  const recalcularYGuardar = (value) => {
    const nuevoSubtotal = (value.items || []).reduce(
      (acumulado, item) => acumulado + calcularSubtotal(item),
      0,
    );
    const descuento = Number(value.descuento) || 0;
    const base = Math.max(0, nuevoSubtotal - descuento);
    const nuevoIva = value.iva ? base * 0.19 : 0;
    const transporte = Number(value.valorTransporte) || 0;
    const nuevoTotal = base + nuevoIva + transporte;

    dispatch(
      setFormCuentaCobro({
        ...value,
        subtotalNumero: nuevoSubtotal,
        ivaNumero: nuevoIva,
        total: nuevoTotal,
      }),
    );
  };

  const handlerInputChange = (event) => {
    const { name, value } = event.target;
    // Los importes de una cuenta traída ya vienen hechos: el "por concepto de"
    // se guarda sin recalcular nada. Volver a sumar los ítems perdería, por
    // ejemplo, el renglón de daños, que no tiene días.
    if (bloqueada) {
      dispatch(setFormCuentaCobro({ ...formValues, [name]: value }));
      return;
    }
    // El NIT se guarda pelado (dígitos y guion); los puntos se ponen al mostrar.
    const valorAGuardar = name === "nit" ? limpiarNit(value) : value;
    const actualizado = { ...formValues, [name]: valorAGuardar };

    // Si no hay transporte, su valor no cuenta: se pone en cero para que no
    // quede sumando "fantasma".
    if (name === "transporte" && value === "Sin transporte") {
      actualizado.valorTransporte = 0;
    }

    recalcularYGuardar(actualizado);
  };

  const updateItem = (index, field, value) => {
    const updatedItems = items.map((item, i) => {
      if (i !== index) return item;
      const actualizado = { ...item, [field]: value };
      actualizado.subtotal = calcularSubtotal(actualizado);
      return actualizado;
    });
    recalcularYGuardar({
      ...formValues,
      items: updatedItems,
    });
  };

  const addNewItem = () => {
    // Con subtotal en cero desde el arranque: sin esto el ítem recién agregado
    // mostraba "Subtotal:" vacío hasta que se tocaba alguno de sus campos.
    const newItem = {
      factura: "",
      description: "",
      quantity: 0,
      price: 0,
      day: 1,
      unidad: "dias",
      subtotal: 0,
    };
    recalcularYGuardar({
      ...formValues,
      items: [...items, newItem],
    });
  };

  const removeItem = (indexToRemove) => {
    const updatedItems = items.filter((_, index) => index !== indexToRemove);
    recalcularYGuardar({
      ...formValues,
      items: updatedItems,
    });
  };

  const esEmpresa = formValues.tipo === "empresa";

  // LAS DOS PIZARRAS, como el estado de cuenta de la factura (pedido del dueño,
  // 2026-11-05): la cuenta y el depósito. Lado a lado; si no caben, la segunda
  // baja sola. En el celular, una debajo de la otra. De pie cada una va suelta
  // en la grilla de la pantalla: la cuenta debajo de los datos y el depósito
  // debajo de los ítems (ver VistaCuentaDeCobro).
  const sxPizarra = (area) =>
    dePie
      ? { gridArea: area, minWidth: 0 }
      : compacta
        ? {}
        : { flex: "1 1 260px", minWidth: 0 };

  // Un renglón de pizarra con su ícono y su color, como en la factura.
  const renglon = (fila, { signo, variante = "body2", sx } = {}) => {
    const { Icono, clase = "", color } = RENGLONES[fila.etiqueta] ?? {};
    const peso = fila.fuerte ? "bold" : undefined;
    return (
      <Box
        key={fila.etiqueta}
        className={`fila ${clase}`}
        sx={{ ...(color && { color }), ...sx }}
      >
        <Typography variant={variante} fontWeight={peso}>
          {Icono && (
            <Icono sx={{ fontSize: "1rem", verticalAlign: "-0.15em", mr: 0.75 }} />
          )}
          {fila.etiqueta}
        </Typography>
        <Typography variant={variante} fontWeight={peso}>
          {valorDeFila(signo ? { ...fila, signo } : fila)}
        </Typography>
      </Box>
    );
  };

  // Lo que queda del depósito cierra su pizarra, resaltado. Sin nada que
  // guardar ni devolver, dice que no hay nada en garantía.
  const cierresDelDeposito = filasDeposito.filter(({ etiqueta }) =>
    CIERRES_DEL_DEPOSITO.includes(etiqueta),
  );

  return (
    // Aire a los costados del formulario y de los recuadros de cada ítem.
    <Box
      mx="auto"
      sx={{
        display: dePie ? "contents" : "flex",
        flexDirection: "column",
        px: 2,
        ...(acostada && { width: "100%", minHeight: 0 }),
      }}
    >
      <Box
        component="form"
        sx={
          acostada
            ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflowY: "auto" }
            : dePie
              ? { display: "contents" }
              : undefined
        }
      >
        <Grid
          container
          spacing={2}
          sx={{ mt: { xs: 0, md: 1 }, flexShrink: 0, ...(dePie && { gridArea: "datos" }) }}
        >
          {/* Persona / Empresa: cambia los rótulos de NIT/Cédula y
              Empresa/Nombre, igual que en la cotización. El IVA va acá al lado
              porque es la otra decisión de una sola vez del documento: los
              demás campos son importes. */}
          <Grid item xs={12} sm={llenaElAlto ? "auto" : 6}>
            <Box display="flex" alignItems="center" width="100%">
              <FormControl sx={{ flex: llenaElAlto ? "none" : 1 }} disabled={bloqueada}>
                <RadioGroup
                  row
                  name="tipo"
                  value={formValues.tipo}
                  onChange={handlerInputChange}
                  sx={{ display: "flex", width: "100%" }}
                >
                  <FormControlLabel
                    value="persona"
                    control={<Radio {...casillaChica} />}
                    label="Persona"
                    sx={opcion}
                  />
                  <FormControlLabel
                    value="empresa"
                    control={<Radio {...casillaChica} />}
                    label="Empresa"
                    sx={opcion}
                  />
                </RadioGroup>
              </FormControl>

              <FormControlLabel
                label="IVA"
                sx={{ flexShrink: 0, mr: 0 }}
                control={
                  <Checkbox
                    {...casillaChica}
                    name="iva"
                    disabled={bloqueada}
                    checked={formValues.iva}
                    onChange={(e) =>
                      handlerInputChange({
                        target: { name: "iva", value: e.target.checked },
                      })
                    }
                  />
                }
              />
            </Box>
          </Grid>

          <Grid item xs={12} sm={llenaElAlto ? true : 6}>
            <TextField
              fullWidth
              type="date"
              name="fecha"
              label="Fecha"
              disabled={bloqueada}
              value={formValues.fecha}
              onChange={handlerInputChange}
              InputLabelProps={{ shrink: true }}
              InputProps={{ sx: { color: theme.palette.text.primary } }}
            />
          </Grid>

          {/* En la tableta ese primer renglón es solo de esos cuatro: sin este
              corte, en el iPad grande acostado la cédula se subía también. */}
          {llenaElAlto && <Box sx={{ flexBasis: "100%", height: 0 }} />}

          <Grid item xs={12} sm={deATres}>
            <TextField
              fullWidth
              type="text"
              name="nit"
              label={esEmpresa ? "NIT" : "Cédula"}
              disabled={bloqueada}
              value={formatearNit(formValues.nit)}
              onChange={handlerInputChange}
            />
          </Grid>

          <Grid item xs={12} sm={deATres}>
            <TextField
              fullWidth
              type="text"
              name="empresa"
              label={esEmpresa ? "Empresa" : "Nombre"}
              disabled={bloqueada}
              value={formValues.empresa}
              onChange={handlerInputChange}
            />
          </Grid>

          {/* Obra: propio de la cuenta de cobro (la cotización no lo tiene). */}
          <Grid item xs={12} sm={deATres}>
            <TextField
              fullWidth
              type="text"
              name="obra"
              label="Obra"
              disabled={bloqueada}
              value={formValues.obra}
              onChange={handlerInputChange}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="text"
              name="direccion"
              label="Dirección"
              disabled={bloqueada}
              value={formValues.direccion}
              onChange={handlerInputChange}
            />
          </Grid>

          {/* Por concepto de: propio de la cuenta de cobro. */}
          <Grid item xs={12} sm={acostada ? 6 : 12}>
            <TextField
              fullWidth
              type="text"
              name="concepto"
              label="Por concepto de"
              value={formValues.concepto}
              onChange={handlerInputChange}
            />
          </Grid>

          <Grid item xs={12} sm={deATres}>
            <FormControl fullWidth disabled={bloqueada}>
              <InputLabel id="cc-transporte-label" htmlFor="cc-transporte-input">
                Transporte
              </InputLabel>
              <Select
                labelId="cc-transporte-label"
                inputProps={{ id: "cc-transporte-input" }}
                name="transporte"
                value={formValues.transporte || ""}
                label="Transporte"
                onChange={handlerInputChange}
              >
                <MenuItem value="Solo ida">Solo ida</MenuItem>
                <MenuItem value="Solo vuelta">Solo vuelta</MenuItem>
                <MenuItem value="Ida y vuelta">Ida y vuelta</MenuItem>
                <MenuItem value="Sin transporte">Sin transporte</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={deATres}>
            <TextField
              fullWidth
              type="text"
              inputMode="numeric"
              name="valorTransporte"
              label="Valor Transporte"
              disabled={
                bloqueada ||
                !formValues.transporte ||
                formValues.transporte === "Sin transporte"
              }
              value={formatearMonedaInput(formValues.valorTransporte)}
              onChange={(e) =>
                handlerInputChange({
                  target: {
                    name: "valorTransporte",
                    value: limpiarMonedaInput(e.target.value),
                  },
                })
              }
            />
          </Grid>

          {/* Los cuatro importes sueltos del documento. Cada uno sale solo si
              tiene valor. El depósito no suma al total, y lo pagado es todo lo
              consignado: cubre primero el depósito (ver resumenCuentaCobro). */}
          <Grid item xs={6} sm={deATres}>
            <TextField
              fullWidth
              type="text"
              inputMode="numeric"
              name="valorDeposito"
              label="Valor Depósito"
              disabled={bloqueada}
              value={formatearMonedaInput(formValues.valorDeposito)}
              onChange={(e) =>
                handlerInputChange({
                  target: {
                    name: "valorDeposito",
                    value: limpiarMonedaInput(e.target.value),
                  },
                })
              }
            />
          </Grid>

          <Grid item xs={6} sm={deATres}>
            <TextField
              fullWidth
              type="text"
              inputMode="numeric"
              name="pagado"
              label="Valor Pagado"
              disabled={bloqueada}
              value={formatearMonedaInput(formValues.pagado)}
              onChange={(e) =>
                handlerInputChange({
                  target: {
                    name: "pagado",
                    value: limpiarMonedaInput(e.target.value),
                  },
                })
              }
            />
          </Grid>

          <Grid item xs={6} sm={deATres}>
            <TextField
              fullWidth
              type="text"
              inputMode="numeric"
              name="descuento"
              label="Valor Descuento"
              disabled={bloqueada}
              value={formatearMonedaInput(formValues.descuento)}
              onChange={(e) =>
                handlerInputChange({
                  target: {
                    name: "descuento",
                    value: limpiarMonedaInput(e.target.value),
                  },
                })
              }
            />
          </Grid>

          <Grid item xs={6} sm={deATres}>
            <TextField
              fullWidth
              type="text"
              inputMode="numeric"
              name="abonos"
              label="Valor Abonos"
              disabled={bloqueada}
              value={formatearMonedaInput(formValues.abonos)}
              onChange={(e) =>
                handlerInputChange({
                  target: {
                    name: "abonos",
                    value: limpiarMonedaInput(e.target.value),
                  },
                })
              }
            />
          </Grid>
        </Grid>

        {/* LOS ÍTEMS Y EL BOTÓN DE AGREGAR, juntos. Si sobra alto, el botón
            se estira hasta abajo (pedido del dueño, 2026-11-05):
            - Acostada, debajo de los datos y sin desplazamiento propio: crecen
              de corrido y se desplaza la columna entera del formulario.
            - De pie, a la derecha de los datos y con su propio desplazamiento.
              No mandan en el alto del renglón: lo pone el formulario de la
              izquierda. */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            ...(acostada && { flex: "1 0 auto" }),
            ...(dePie && { gridArea: "items", minHeight: 0, contain: "size", overflow: "hidden" }),
          }}
        >
        <Box
          sx={
            dePie
              ? { flex: bloqueada ? "1 1 auto" : "0 1 auto", minHeight: 0, overflowY: "auto" }
              : undefined
          }
        >
        {items.map((item, index) => (
          <Box
            key={index}
            display="flex"
            justifyContent="center"
            sx={{
              mt: 2,
              p: 2,
              // El recuadro de toda la app (theme.recuadro), del acento, con
              // su título arriba (pedido del dueño, 2026-10-30).
              ...theme.recuadro(theme.palette.custom.accent),
            }}
          >
            <Grid container spacing={1} key={index}>
              <Grid item xs={12}>
                <TituloSeccion
                  titulo={`ÍTEM ${index + 1}`}
                  icono={<ConstructionIcon />}
                  color={theme.palette.custom.accent}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  type="text"
                  rows={2}
                  name={`item-${index}-descripcion`}
                  label="Descripción"
                  disabled={bloqueada}
                  value={item.description || ""}
                  onChange={(e) =>
                    updateItem(index, "description", e.target.value)
                  }
                />
              </Grid>

              {/* El número de factura de la que sale el equipo. Es solo de las
                  personas: a una empresa no se le muestra ni se le puede
                  escribir, y su documento no dibuja esa columna. */}
              {/* LOS CAMPOS DE UNA PERSONA son cinco y en un renglón quedaban
                  apretados: tres arriba y dos abajo (pedido del dueño,
                  2026-11-05). Los de una empresa son cuatro, en un renglón. */}
              {!esEmpresa && (
                <Grid item xs={6} sm={4}>
                  <TextField
                    fullWidth
                    type="text"
                    name={`item-${index}-factura`}
                    label="Factura"
                    disabled={bloqueada}
                    value={item.factura || ""}
                    onChange={(e) => updateItem(index, "factura", e.target.value)}
                  />
                </Grid>
              )}

              <Grid item xs={6} sm={esEmpresa ? 3 : 4}>
                <TextField
                  fullWidth
                  type="number"
                  name={`item-${index}-cantidad`}
                  label="Cantidad"
                  disabled={bloqueada}
                  value={item.quantity !== 0 ? item.quantity : ""}
                  onChange={(e) => updateItem(index, "quantity", e.target.value)}
                />
              </Grid>

              {/* Por días o por horas, ítem por ítem. Un ítem guardado antes de
                  esto no trae unidad: va por días. */}
              <Grid item xs={6} sm={esEmpresa ? 3 : 4}>
                <FormControl fullWidth disabled={bloqueada}>
                  <InputLabel
                    id={`cc-unidad-${index}-label`}
                    htmlFor={`cc-unidad-${index}-input`}
                  >
                    Unidad
                  </InputLabel>
                  <Select
                    labelId={`cc-unidad-${index}-label`}
                    inputProps={{ id: `cc-unidad-${index}-input` }}
                    name={`item-${index}-unidad`}
                    label="Unidad"
                    value={item.unidad || "dias"}
                    onChange={(e) => updateItem(index, "unidad", e.target.value)}
                  >
                    {UNIDADES_DE_TIEMPO.map(({ valor, rotulo }) => (
                      <MenuItem key={valor} value={valor}>
                        {rotulo}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6} sm={esEmpresa ? 3 : 6}>
                <TextField
                  fullWidth
                  type="number"
                  name={`item-${index}-dias`}
                  label={item.unidad === "horas" ? "Horas" : "Días"}
                  disabled={bloqueada}
                  value={item.day !== 0 ? item.day : ""}
                  onChange={(e) => updateItem(index, "day", e.target.value)}
                />
              </Grid>

              <Grid item xs={esEmpresa ? 6 : 12} sm={esEmpresa ? 3 : 6}>
                {/* Va como texto y no como número: un input numérico no acepta
                    los puntos de miles. Se guarda el número pelado. */}
                <TextField
                  fullWidth
                  type="text"
                  inputMode="numeric"
                  name={`item-${index}-precio`}
                  label={item.unidad === "horas" ? "Valor hora" : "Valor día"}
                  disabled={bloqueada}
                  value={formatearMonedaInput(item.price)}
                  onChange={(e) =>
                    updateItem(index, "price", limpiarMonedaInput(e.target.value))
                  }
                />
              </Grid>

              <Grid item xs={6} md={6}>
                <Typography variant="subtitle1" sx={{ color: "custom.accent" }}>
                  Subtotal: {formatearMoneda(item.subtotal)}
                </Typography>
              </Grid>

              {!bloqueada && (
                <Grid item xs={6} md={6}>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => removeItem(index)}
                    fullWidth
                  >
                    Eliminar Ítem
                  </Button>
                </Grid>
              )}
            </Grid>
          </Box>
        ))}
        </Box>

          {/* De pie los ítems van en una caja con su propio desplazamiento
              donde cabe uno solo: el contador dice cuántos hay. Va al lado del
              botón de agregar, en su misma fila, para no gastar un renglón
              (pedido del dueño, 2026-11-05). Sin ítems no sale: el botón queda
              solo. En lo demás la fila no existe y el botón va solo. */}
          <Box
            sx={
              dePie
                ? {
                    display: "flex",
                    alignItems: "stretch",
                    gap: 2,
                    ...(bloqueada ? { flexShrink: 0 } : { flex: "1 1 64px", minHeight: 64 }),
                  }
                : { display: "contents" }
            }
          >
            {dePie && items.length > 0 && (
              <Stack
                direction="row"
                alignItems="center"
                gap={1}
                sx={{ flexShrink: 0, alignSelf: "center" }}
              >
                <ConstructionIcon sx={{ fontSize: 18, color: theme.palette.custom.accent }} />
                <Typography
                  variant="overline"
                  sx={{ fontWeight: 700, lineHeight: 1.6, color: theme.palette.custom.accent }}
                >
                  Ítems
                </Typography>
                <Chip
                  size="small"
                  label={items.length}
                  sx={{
                    height: 20,
                    fontWeight: 700,
                    bgcolor: theme.palette.custom.accent,
                    color: theme.palette.getContrastText(theme.palette.custom.accent),
                  }}
                />
              </Stack>
            )}

            {/* Punteado, como "Nuevo equipo" (pedido del dueño, 2026-11-05).
                En la tableta se estira hasta abajo y se encoge con cada ítem;
                en lo demás tiene su alto fijo. */}
            {!bloqueada && (
              <ButtonBase
                onClick={addNewItem}
                sx={{
                  ...(dePie
                    ? { flex: 1, minWidth: 0 }
                    : {
                        width: "100%",
                        ...(llenaElAlto ? { flex: "1 1 64px", minHeight: 64 } : { height: 52 }),
                      }),
                  gap: 1,
                  ...theme.botonAgregarALista(theme.palette.success.main),
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                }}
              >
                <AddCircleOutlineIcon fontSize="small" />
                Agregar Ítem
              </ButtonBase>
            )}
          </Box>
        </Box>

        <Box
          sx={
            dePie
              ? { display: "contents" }
              : {
                  flexShrink: 0,
                  mt: 2,
                  display: "flex",
                  flexDirection: compacta ? "column" : "row",
                  flexWrap: "wrap",
                  // Cada una con el alto de la más alta.
                  alignItems: "stretch",
                  gap: 1.5,
                }
          }
        >
          {/* LA CUENTA. Cada renglón sale solo si tiene valor —una cuenta sin
              transporte no lleva un "Transporte $ 0"— y el de abajo es lo que
              de verdad se cobra: el saldo. Crece con sus renglones (pedido del
              dueño, 2026-11-05: el alto fijo dejaba un hueco antes del saldo). */}
          <Paper variant="totales" sx={sxPizarra("cuenta")}>
            {filas.map((fila) =>
              fila.etiqueta === "Total"
                ? renglon(fila, { variante: "subtitle1", sx: { mb: 1 } })
                : renglon(fila),
            )}

            {/* Sin pagos, el total es lo que se cobra y va en amarillo, como
                siempre. Con pagos cierra el saldo: en rojo si se debe, en
                verde si quedó en cero, como el saldo de la factura. */}
            <Box
              className={
                hayMovimientos ? `fila separada ${aCancelar > 0 ? "alerta" : "ok"}` : "fila total"
              }
              sx={{ mb: 0 }}
            >
              <Typography variant="h6" fontWeight="bold">
                {hayMovimientos ? (
                  <ScheduleIcon sx={{ fontSize: "1.1rem", verticalAlign: "-0.15em", mr: 0.75 }} />
                ) : (
                  <ReceiptLongIcon sx={{ fontSize: "1.1rem", verticalAlign: "-0.15em", mr: 0.75 }} />
                )}
                {hayMovimientos ? "Saldo a cancelar" : "Total"}
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {formatearMoneda(hayMovimientos ? aCancelar : total)}
              </Typography>
            </Box>
          </Paper>

          {/* EL DEPÓSITO, aparte de la suma, como en la factura: cuánto se
              recibió, qué salió de él y cuánto queda. Va siempre, para que
              nada salte al escribirlo. */}
          <Paper variant="totales" sx={sxPizarra("deposito")}>
            <Box className="titulo deposito">
              <IconoDeposito fontSize="small" />
              <Typography variant="subtitle2">DEPÓSITO</Typography>
            </Box>

            {filasDeposito.length === 0 ? (
              <Typography variant="body2" sx={{ opacity: 0.6 }}>
                Sin depósito
              </Typography>
            ) : (
              <>
                {filasDeposito
                  .filter(({ etiqueta }) => !CIERRES_DEL_DEPOSITO.includes(etiqueta))
                  .map((fila) =>
                    renglon(fila, {
                      signo: SALEN_DEL_DEPOSITO.includes(fila.etiqueta) ? "-" : undefined,
                    }),
                  )}
                <Box className="raya" />
                {(cierresDelDeposito.length
                  ? cierresDelDeposito
                  : [{ etiqueta: "En garantía", valor: 0 }]
                ).map((fila) => renglon({ ...fila, fuerte: true }))}
              </>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}

CuentaCobro.propTypes = {
  forma: PropTypes.oneOf(["normal", "acostada", "dePie"]),
};
