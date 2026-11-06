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
import {
  setFormCotizacion,
  setItems,
  setSubtotal,
  setTotal,
  setSubtotalNumero,
  setIvaNumero,
  setTotalNumero,
} from "../../Store/Slices/cotizacionSlice";
import { useSelector, useDispatch } from "react-redux";
import { departamentosYMunicipios } from "../RolesPermisos/departamentosYMunicipios";
import { formatearMoneda } from "../../Utils/formato";
import { ANCHO_FECHA, usePantallaCompacta } from "../../Utils/pantalla";
import {
  renglonDePizarra,
  renderTituloDeposito,
} from "../ClienteDetalle/recuadrosCuenta";
import resumenCotizacion from "./resumenCotizacion";

// LAS FORMAS DEL FORMULARIO, las mismas de la cuenta de cobro (pedido del
// dueño, 2026-11-05; ver useFormaConHoja en Utils/pantalla):
// - `forma="ladoALado"`: al lado de la hoja, desde 1462 de ancho. Ocupa todo el
//   alto de su columna: los datos de a tres, los ítems de corrido, el botón de
//   agregar estirado hasta las pizarras y las pizarras abajo. Cuando no cabe,
//   se desplaza la columna entera.
// - `forma="dePie"`: el iPad de pie. Las piezas van sueltas en la grilla de la
//   pantalla: los datos a la izquierda, los ítems a la derecha con su propio
//   desplazamiento, las dos pizarras debajo y la hoja abajo de todo.
export default function Cotizacion({ forma = "normal" }) {
  const dispatch = useDispatch();
  const theme = useTheme();
  const formValues = useSelector((state) => state.cotizacion.value);
  const { items } = formValues;

  const ladoALado = forma === "ladoALado";
  const dePie = forma === "dePie";
  // Lado a lado o de pie, el formulario llena el alto de su espacio y el botón
  // de agregar se estira hasta abajo si sobra alto.
  const llenaElAlto = ladoALado || dePie;
  // El ancho de los campos de a dos, que lado a lado van de a tres.
  const deATres = ladoALado ? 4 : 6;
  const compacta = usePantallaCompacta();
  // Lado a lado o de pie, Persona, Empresa y la fecha en un solo renglón: las
  // casillas más chicas y la fecha con el ancho justo de una fecha. Cada opción
  // se corre 6 px y no los 11 de fábrica: con la columna que se desplaza sola,
  // el círculo de "Persona" quedaba cortado por el borde izquierdo.
  const casillaChica = llenaElAlto ? { size: "small", sx: { p: 0.75 } } : {};
  const opcion = llenaElAlto
    ? { flex: "none", alignItems: "center", ml: -0.75, mr: 1.5 }
    : { flex: 1, alignItems: "center" };

  // Las cifras de la cotización salen de un solo lugar, el mismo que leen la
  // hoja y el PDF. El depósito va aparte del total.
  const resumen = resumenCotizacion(formValues);

  const handlerInputChange = (event) => {
    const { name, value } = event.target;

    const updatedFormValues = {
      ...formValues,
      [name]:
        name === "nit"
          ? formatNit(value)
          : name === "telefono"
            ? formatTelefono(value)
            : value,
    };

    if (name === "transporte" && value === "Sin transporte") {
      updatedFormValues.valorTransporte = 0;
    }

    if (!value && name === "deposito") {
      updatedFormValues.valorDeposito = 0;
    }

    dispatch(setFormCotizacion(updatedFormValues));

    if (
      name === "valorTransporte" ||
      name === "transporte" ||
      name === "iva" ||
      name === "deposito" ||
      name === "valorDeposito"
    ) {
      calculateTotalFrom(items, updatedFormValues);
    }
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...items];
    const updatedItem = { ...updatedItems[index], [field]: value };
    updatedItem.subtotal = formatearMoneda(
      updatedItem.quantity * updatedItem.price * updatedItem.day,
    );
    updatedItems[index] = updatedItem;
    dispatch(setItems(updatedItems));
    calculateTotalFrom(updatedItems);
  };

  // Guarda las cifras ya calculadas para la lista de cotizaciones, que muestra
  // el total sin volver a sumar. El total ya no lleva el depósito.
  const calculateTotalFrom = (updatedItems, currentFormValues = formValues) => {
    const { subtotal, iva, total } = resumenCotizacion({
      ...currentFormValues,
      items: updatedItems,
    });
    dispatch(setSubtotalNumero(subtotal));
    dispatch(setSubtotal(formatearMoneda(subtotal)));
    dispatch(setIvaNumero(iva));
    dispatch(setTotalNumero(total));
    dispatch(setTotal(formatearMoneda(total)));
  };

  const addNewItem = () => {
    const newItem = { description: "", quantity: 0, price: 0, day: 1 };
    dispatch(setItems([...items, newItem]));
  };

  const removeItem = (indexToRemove) => {
    const updatedItems = items.filter((_, index) => index !== indexToRemove);
    dispatch(setItems(updatedItems));
    calculateTotalFrom(updatedItems);
  };

  const formatNit = (nit) => {
    const cleanNit = nit.replace(/[^\d-]/g, "");
    const soloDiez = cleanNit.substring(0, 11);
    const formattedNit = soloDiez.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return formattedNit;
  };

  const formatTelefono = (telefono) => telefono.replace(/\D/g, "").substring(0, 15);

  // LAS DOS PIZARRAS, como el estado de cuenta de la factura (pedido del dueño,
  // 2026-11-05): la cuenta y el depósito. Lado a lado; si no caben, la segunda
  // baja sola. En el celular, una debajo de la otra. De pie cada una va suelta
  // en la grilla de la pantalla: la cuenta debajo de los datos y el depósito
  // debajo de los ítems (ver VistaCotizacion).
  const sxPizarra = (area) =>
    dePie
      ? { gridArea: area, minWidth: 0 }
      : compacta
        ? {}
        : { flex: "1 1 260px", minWidth: 0 };

  return (
    // Aire a los costados del formulario y de los recuadros de cada ítem.
    <Box
      mx="auto"
      sx={{
        display: dePie ? "contents" : "flex",
        flexDirection: "column",
        px: 2,
        ...(ladoALado && { width: "100%", minHeight: 0 }),
      }}
    >
      <Box
        component="form"
        sx={
          ladoALado
            ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflowY: "auto" }
            : dePie
              ? { display: "contents" }
              : undefined
        }
      >
        <Grid
          container
          spacing={2}
          sx={{ flexShrink: 0, ...(llenaElAlto && { mt: 1 }), ...(dePie && { gridArea: "datos" }) }}
        >
          <Grid item xs={12} sm={llenaElAlto ? true : 6}>
            <FormControl fullWidth>
              <Box display="flex" width="100%">
                <RadioGroup
                  row
                  name="tipo"
                  value={formValues.tipo}
                  onChange={(e) => {
                    handlerInputChange({
                      target: {
                        name: "tipo",
                        value: e.target.value,
                      },
                    });
                  }}
                  sx={{
                    display: "flex",
                    width: "100%",
                  }}
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
              </Box>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={llenaElAlto ? "auto" : 6}>
            <TextField
              fullWidth
              type="date"
              name="fecha"
              label="Fecha"
              sx={llenaElAlto ? { width: { sm: ANCHO_FECHA } } : undefined}
              value={formValues.fecha}
              onChange={handlerInputChange}
              InputLabelProps={{
                shrink: true,
              }}
              InputProps={{
                sx: {
                  color: theme.palette.text.primary,
                },
              }}
            />
          </Grid>

          {/* Lado a lado y de pie, ese primer renglón es solo de esos dos: sin
              este corte, en una pantalla ancha la cédula se subía también. */}
          {llenaElAlto && <Box sx={{ flexBasis: "100%", height: 0 }} />}

          <Grid item xs={6} sm={deATres}>
            <TextField
              fullWidth
              type="text"
              name="nit"
              label={formValues.tipo === "empresa" ? "NIT" : "Cédula"}
              value={formValues.nit}
              onChange={handlerInputChange}
            />
          </Grid>

          <Grid item xs={6} sm={deATres}>
            <TextField
              fullWidth
              type="text"
              name="telefono"
              label="Teléfono"
              value={formValues.telefono}
              onChange={handlerInputChange}
            />
          </Grid>
          <Grid item xs={12} sm={deATres}>
            <TextField
              fullWidth
              type="text"
              name="empresa"
              label={formValues.tipo === "empresa" ? "Empresa" : "Nombre"}
              value={formValues.empresa}
              onChange={handlerInputChange}
            />
          </Grid>
          <Grid item xs={12} sm={deATres}>
            <TextField
              fullWidth
              type="text"
              name="direccion"
              label="Dirección"
              value={formValues.direccion}
              onChange={handlerInputChange}
            />
          </Grid>

          <Grid item xs={12} sm={deATres}>
            <TextField
              fullWidth
              type="text"
              name="barrio"
              label="Barrio"
              value={formValues.barrio}
              onChange={handlerInputChange}
            />
          </Grid>

          <Grid item xs={12} sm={deATres}>
            <TextField
              fullWidth
              type="text"
              name="otrosDatos"
              label="Otros datos (Ej: bodega, edificio, obra)"
              value={formValues.otrosDatos}
              onChange={handlerInputChange}
            />
          </Grid>

          <Grid item xs={12} sm={deATres}>
            <TextField
              select
              id="departamento-select"
              name="departamento"
              label="Departamento"
              value={formValues.departamento}
              onChange={handlerInputChange}
              fullWidth
              inputProps={{ id: "departamento-input" }}
              InputLabelProps={{ htmlFor: "departamento-input" }}
            >
              {Object.keys(departamentosYMunicipios).map((dep) => (
                <MenuItem key={dep} value={dep}>
                  {dep}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={deATres}>
            <TextField
              select
              id="municipio-select"
              name="municipio"
              label="Municipio"
              value={formValues.municipio}
              onChange={handlerInputChange}
              fullWidth
              disabled={!formValues.departamento}
              inputProps={{ id: "municipio-input" }}
              InputLabelProps={{ htmlFor: "municipio-input" }}
            >
              {formValues.departamento &&
              departamentosYMunicipios[formValues.departamento]?.length > 0 ? (
                departamentosYMunicipios[formValues.departamento].map((mun) => (
                  <MenuItem key={mun} value={mun}>
                    {mun}
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>Seleccione un departamento</MenuItem>
              )}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={deATres}>
            <FormControl fullWidth>
              <InputLabel id="transporte-label" htmlFor="transporte-input">
                Transporte
              </InputLabel>

              <Select
                labelId="transporte-label"
                inputProps={{ id: "transporte-input" }}
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
              name="valorTransporte"
              label="Valor Transporte"
              disabled={!formValues.transporte || formValues.transporte === "Sin transporte"}
              value={
                formValues.valorTransporte
                  ? Number(formValues.valorTransporte).toLocaleString("es-CO")
                  : ""
              }
              onChange={(e) => {
                const rawValue = e.target.value.replace(/\./g, "");

                handlerInputChange({
                  target: {
                    name: "valorTransporte",
                    value: rawValue,
                  },
                });
              }}
            />
          </Grid>

          <Grid item xs={12} sm={deATres}>
            <Box display="flex" alignItems="center" width="100%">
              <Box flex={1}>
                <FormControlLabel
                  label="IVA"
                  control={
                    <Checkbox
                      checked={formValues.iva}
                      onChange={(e) => {
                        handlerInputChange({
                          target: {
                            name: "iva",
                            value: e.target.checked,
                          },
                        });
                      }}
                    />
                  }
                />
              </Box>

              <Box flex={1}>
                <FormControlLabel
                  label="Depósito"
                  control={
                    <Checkbox
                      checked={formValues.deposito}
                      onChange={(e) => {
                        handlerInputChange({
                          target: {
                            name: "deposito",
                            value: e.target.checked,
                          },
                        });
                      }}
                    />
                  }
                />
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} sm={deATres}>
            <TextField
              fullWidth
              type="text"
              name="valorDeposito"
              label="Valor Depósito"
              disabled={!formValues.deposito}
              value={
                formValues.valorDeposito
                  ? Number(formValues.valorDeposito).toLocaleString("es-CO")
                  : ""
              }
              onChange={(e) => {
                const rawValue = e.target.value.replace(/\./g, "");

                handlerInputChange({
                  target: {
                    name: "valorDeposito",
                    value: rawValue,
                  },
                });
              }}
            />
          </Grid>
        </Grid>

        {/* LOS ÍTEMS Y EL BOTÓN DE AGREGAR, juntos. Si sobra alto, el botón
            se estira hasta abajo (pedido del dueño, 2026-11-05):
            - Lado a lado, debajo de los datos y sin desplazamiento propio:
              crecen de corrido y se desplaza la columna entera del formulario.
            - De pie, a la derecha de los datos y con su propio desplazamiento.
              No mandan en el alto del renglón: lo pone el formulario de la
              izquierda. */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            ...(ladoALado && { flex: "1 0 auto" }),
            ...(dePie && { gridArea: "items", minHeight: 0, contain: "size", overflow: "hidden" }),
          }}
        >
          <Box
            sx={
              dePie ? { flex: "0 1 auto", minHeight: 0, overflowY: "auto" } : undefined
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
                      label="Descripción"
                      value={item.description}
                      onChange={(e) =>
                        updateItem(index, "description", e.target.value)
                      }
                    />
                  </Grid>

                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Cantidad"
                      value={item.quantity !== 0 ? item.quantity : ""}
                      onChange={(e) =>
                        updateItem(index, "quantity", e.target.value)
                      }
                    />
                  </Grid>

                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Dias"
                      value={item.day !== 0 ? item.day : ""}
                      onChange={(e) => updateItem(index, "day", e.target.value)}
                    />
                  </Grid>

                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      type="text"
                      label="Valor día"
                      value={
                        item.price !== 0
                          ? Number(item.price).toLocaleString("es-CO")
                          : ""
                      }
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/\./g, "");

                        updateItem(index, "price", rawValue);
                      }}
                    />
                  </Grid>

                  <Grid item xs={6} md={6}>
                    <Typography variant="subtitle1" sx={{ color: "custom.accent" }}>
                      Subtotal: {item.subtotal}
                    </Typography>
                  </Grid>

                  <Grid item xs={6} md={6}>
                    <Button
                      variant="contained"
                      color="error"
                      onClick={() => removeItem(index)}
                      fullWidth
                      sx={{ flex: 1, whiteSpace: "nowrap" }}
                    >
                      Eliminar Ítem {index + 1}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            ))}
          </Box>

          {/* De pie los ítems van en una caja con su propio desplazamiento
              donde cabe uno solo: el contador dice cuántos hay. Va al lado del
              botón de agregar, en su misma fila, para no gastar un renglón.
              Sin ítems no sale: el botón queda solo. */}
          <Box
            sx={
              dePie
                ? { display: "flex", alignItems: "stretch", gap: 2, flex: "1 1 64px", minHeight: 64 }
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

            {/* Punteado, como "Nuevo equipo" y el de la cuenta de cobro.
                Lado a lado y de pie se estira hasta abajo y se encoge con cada
                ítem; en lo demás tiene su alto fijo. */}
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
          {/* LA CUENTA: el subtotal y lo que se le suma, y el total. Cada
              renglón sale solo si tiene valor. Con depósito cierra lo que el
              cliente lleva el día del despacho: el total más el depósito. */}
          <Paper variant="totales" sx={sxPizarra("cuenta")}>
            {renglonDePizarra("Subtotal", formatearMoneda(resumen.subtotal), { fuerte: true })}
            {resumen.iva > 0 && renglonDePizarra("IVA (19%)", formatearMoneda(resumen.iva))}
            {resumen.transporte > 0 &&
              renglonDePizarra("Transporte", formatearMoneda(resumen.transporte))}
            {resumen.deposito > 0 ? (
              <>
                {renglonDePizarra("Total", formatearMoneda(resumen.total), {
                  fuerte: true,
                  variante: "subtitle1",
                  sx: { mb: 1 },
                })}
                {renglonDePizarra("Para despachar", formatearMoneda(resumen.paraDespachar), {
                  fuerte: true,
                  variante: "h6",
                  sx: { mb: 0 },
                })}
              </>
            ) : (
              renglonDePizarra("Total", formatearMoneda(resumen.total), {
                fuerte: true,
                variante: "h6",
                sx: { mb: 0 },
              })
            )}
          </Paper>

          {/* EL DEPÓSITO, aparte del total, como en la factura. Va siempre,
              para que nada salte al escribirlo. */}
          <Paper variant="totales" sx={sxPizarra("deposito")}>
            {renderTituloDeposito()}
            {resumen.deposito > 0 ? (
              <>
                {renglonDePizarra("A entregar", formatearMoneda(resumen.deposito), {
                  fuerte: true,
                })}
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Se devuelve al recibir los equipos.
                </Typography>
              </>
            ) : (
              <Typography variant="body2" sx={{ opacity: 0.6 }}>
                Sin depósito
              </Typography>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}

Cotizacion.propTypes = {
  forma: PropTypes.oneOf(["normal", "ladoALado", "dePie"]),
};
