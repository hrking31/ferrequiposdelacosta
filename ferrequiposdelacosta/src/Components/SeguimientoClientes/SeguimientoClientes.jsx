import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Chip,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../Firebase/Firebase";
import useSnackbar from "../../Hooks/useSnackbar";
import AppSnackbar from "../AppSnackbar/AppSnackbar";
import ClienteSeguimientoCard from "./ClienteSeguimientoCard";
import PanelSeguimiento from "./PanelSeguimiento";
import {
  usePantallaCompacta,
  usePantallaBaja,
} from "../../Utils/pantalla";
import LoadingLogo from "../LoadingLogo/LoadingLogo";
import BuscadorFiltro from "../BuscadorFiltro/BuscadorFiltro";
import DashboardIcon from "@mui/icons-material/Dashboard";
import {
  obtenerFechaHoyBogota,
  facturaEnSeguimiento,
  equiposDe,
  datosFactura,
} from "../ClienteDetalle/facturaUtils";
import {
  FILTROS_GESTION,
  cumpleDias,
  cumpleGestion,
  datosParaFiltrar,
  opcionesDias,
} from "./filtrosSeguimiento";

const FILTROS_TIPO = [
  { valor: "todos", label: "Todos" },
  { valor: "persona", label: "Personas", icono: PersonIcon },
  { valor: "empresa", label: "Empresas", icono: BusinessIcon },
];

const tipoDe = (cliente) => (cliente.tipo === "empresa" ? "empresa" : "persona");

const obtenerNombreCompleto = (cliente) => {
  if (!cliente) return "";
  if (cliente.tipo === "empresa") return cliente.razonSocial || cliente.nombreOriginal;
  return [cliente.nombres, cliente.apellido].filter(Boolean).join(" ") || cliente.nombreOriginal;
};

export default function SeguimientoClientes() {
  const theme = useTheme();
  // El mismo corte que usan las vistas para su encabezado y su pie. No sirve
  // el "sm" de MUI (600px): un celular ACOSTADO mide 740 y tomaba los valores
  // del computador, así que el aire de acá se agrandaba justo al girar.
  const navigate = useNavigate();
  // Angosta O baja: el teléfono acostado pasa de los 915px de ancho.
  const esCelular = usePantallaCompacta();
  // EL CELULAR ACOSTADO. De alto quedan unos 390px, y el buscador, los filtros
  // y el renglón del conteo se llevaban casi todo: a las tarjetas les quedaba
  // una franja donde no cabía ni una. Con la pantalla así de baja se desplaza
  // todo junto, encabezado incluido.
  const altoCorto = usePantallaBaja();
  // LOS FILTROS EN UNA COLUMNA A LA IZQUIERDA, como en la lista de clientes.
  // Desde 1010px, el ancho en que la columna sola deja a las tarjetas unos
  // 760px, lo que necesitan para verse enteras (lo eligió el dueño el
  // 2026-10-20). Más angosto van debajo del buscador, en los desplegables
  // del celular.
  const columnaFiltros = useMediaQuery("(min-width:1010px)") && !esCelular;
  const acento =
    theme.palette.custom.accent;
  // Los mismos colores del chip de gestión de cada tarjeta.
  const colorPorGestion = theme.palette.custom.gestionFactura;
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroGestion, setFiltroGestion] = useState("todos");
  const [filtroDias, setFiltroDias] = useState("todos");
  const [clientesConSeguimiento, setClientesConSeguimiento] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  // Qué equipo tiene su historia en el panel: { clave, clienteId, facturaId,
  // posicion }. Se guarda dónde está y no el equipo mismo (ver `elegido`).
  const [seleccion, setSeleccion] = useState(null);
  const { snackbar, showSnackbar, closeSnackbar } = useSnackbar();

  const fetchSeguimiento = useCallback(
    async (silencioso = false) => {
      try {
        if (!silencioso) setLoading(true);

        // Solo los clientes que hay que cobrar, no los 200. El estado del
        // cliente es "la más urgente de sus facturas", y vencida y cobro son
        // justamente las dos más urgentes: pedir estos dos estados trae
        // EXACTAMENTE los clientes con alguna factura en seguimiento, ni uno
        // más ni uno menos. No es una aproximación.
        //
        // Esto se apoya en que el estado guardado sea confiable, y lo es desde
        // que lo mantiene el servidor (ver functions/index.js). Cuando lo
        // corregían las pantallas al abrirse no se podía hacer: un cliente
        // vencido anoche seguía marcado activo y habría quedado fuera de la
        // lista de cobros, que es el peor error posible acá.
        const clientesSnap = await getDocs(
          query(
            collection(db, "clientes"),
            where("estado", "in", ["vencida", "cobro"]),
          ),
        );
        const clientes = clientesSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        const hoy = obtenerFechaHoyBogota();

        // Esta pantalla no guarda nada: solo mira. El estado de cada factura
        // se calcula acá mismo, y del estado del CLIENTE —lo único que se
        // guarda— se encarga el servidor (ver ajustarTotalesPanel y
        // recalcularTotalesPanel en functions/index.js). Esta pantalla lo
        // corregía al abrirse, y esa era justamente la falla: si nadie entraba
        // acá, la lista de clientes mostraba estados viejos.
        const resultados = await Promise.all(
          clientes.map(async (cliente) => {
            // Y de cada uno, solo las facturas abiertas: una cerrada devolvió
            // todo y no debe nada, así que nunca puede estar en seguimiento.
            // Traerlas era pagar por facturas que el filtro de abajo iba a
            // descartar igual.
            const facturasSnap = await getDocs(
              query(
                collection(db, "clientes", cliente.id, "facturas"),
                where("factura.cerrada", "==", false),
              ),
            );
            const facturasAbiertas = facturasSnap.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            }));

            const facturas = facturasAbiertas.filter((factura) =>
              facturaEnSeguimiento(factura, hoy),
            );
            // `facturas` son las que están en cartera, que es lo que la
            // tarjeta muestra. `facturasAbiertas` van igual porque el abono se
            // reparte entre TODAS las que tienen saldo, estén en cartera o no:
            // con las de cartera nada más, un cliente que entrega de más
            // dejaría sin tocar una factura vigente que también debe.
            return facturas.length > 0
              ? { cliente, facturas, facturasAbiertas }
              : null;
          }),
        );

        setClientesConSeguimiento(resultados.filter(Boolean));
      } catch (error) {
        console.error("Error al cargar seguimiento de clientes:", error);
        showSnackbar("Error al cargar el seguimiento de clientes", "error");
      } finally {
        if (!silencioso) setLoading(false);
      }
    },
    [showSnackbar],
  );

  useEffect(() => {
    fetchSeguimiento();
  }, [fetchSeguimiento]);

  const hoy = obtenerFechaHoyBogota();
  const busquedaLower = busqueda.trim().toLowerCase();

  // Lo que los filtros miran de cada factura (su gestión y sus días), una sola
  // vez por carga y no en cada tecla del buscador.
  const conDatos = useMemo(
    () =>
      clientesConSeguimiento.map((item) => ({
        ...item,
        facturasConDatos: item.facturas.map((factura) => ({
          factura,
          datos: datosParaFiltrar(factura, hoy),
        })),
      })),
    [clientesConSeguimiento, hoy],
  );

  const conBusqueda = useMemo(
    () =>
      conDatos.filter(({ cliente }) => {
        if (!busquedaLower) return true;
        const nombre = obtenerNombreCompleto(cliente).toLowerCase();
        const telefono = (cliente.telefono || "").toLowerCase();
        return nombre.includes(busquedaLower) || telefono.includes(busquedaLower);
      }),
    [conDatos, busquedaLower],
  );

  const porTipoYBusqueda = useMemo(
    () =>
      conBusqueda.filter(
        ({ cliente }) => filtroTipo === "todos" || tipoDe(cliente) === filtroTipo,
      ),
    [conBusqueda, filtroTipo],
  );

  const datosDeFacturas = useMemo(
    () =>
      porTipoYBusqueda.flatMap(({ facturasConDatos }) =>
        facturasConDatos.map(({ datos }) => datos),
      ),
    [porTipoYBusqueda],
  );

  // El selector de días ofrece solo los que hay entre las facturas de la
  // gestión elegida. Si el que estaba puesto ya no está (se cambió la gestión,
  // se registró una devolución), vuelve a "Todos".
  const conGestion = useMemo(
    () => datosDeFacturas.filter((datos) => cumpleGestion(datos, filtroGestion)),
    [datosDeFacturas, filtroGestion],
  );
  const opcionesDeDias = useMemo(() => opcionesDias(conGestion), [conGestion]);
  const diasElegidos = opcionesDeDias.some((opcion) => opcion.valor === filtroDias)
    ? filtroDias
    : "todos";

  // Cuántas FACTURAS hay de cada gestión con los días elegidos.
  const conteosPorGestion = useMemo(() => {
    const conDias = datosDeFacturas.filter((datos) => cumpleDias(datos, diasElegidos));
    const conteo = { todos: conDias.length };
    conDias.forEach(({ gestion }) => {
      conteo[gestion] = (conteo[gestion] || 0) + 1;
    });
    return conteo;
  }, [datosDeFacturas, diasElegidos]);

  // Cuántos CLIENTES hay de cada tipo con la gestión y los días elegidos. El
  // tipo es del cliente y no de la factura, así que acá se cuentan clientes
  // —como el "2 de 5" del buscador— y en las gestiones, facturas.
  const conteosPorTipo = useMemo(() => {
    const conteo = { todos: 0, persona: 0, empresa: 0 };
    conBusqueda.forEach(({ cliente, facturasConDatos }) => {
      const tieneAlguna = facturasConDatos.some(
        ({ datos }) => cumpleGestion(datos, filtroGestion) && cumpleDias(datos, diasElegidos),
      );
      if (!tieneAlguna) return;
      conteo.todos += 1;
      conteo[tipoDe(cliente)] += 1;
    });
    return conteo;
  }, [conBusqueda, filtroGestion, diasElegidos]);

  // Cada tarjeta lleva solo las facturas que cumplen; el cliente que se queda
  // sin ninguna no aparece.
  const visibles = useMemo(
    () =>
      porTipoYBusqueda
        .map(({ facturasConDatos, ...item }) => ({
          ...item,
          facturas: facturasConDatos
            .filter(
              ({ datos }) =>
                cumpleGestion(datos, filtroGestion) && cumpleDias(datos, diasElegidos),
            )
            .map(({ factura }) => factura),
        }))
        .filter(({ facturas }) => facturas.length > 0),
    [porTipoYBusqueda, filtroGestion, diasElegidos],
  );

  const buscador = (
    <BuscadorFiltro
      value={busqueda}
      onChange={setBusqueda}
      placeholder="Buscar cliente..."
    />
  );

  const contador = (
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
    >
      {/* En celular, solo "3 de 3": al lado izquierdo ya dice de qué lista
          se trata, así que la palabra sobraba. En computador va sola y sí
          necesita decir de qué son. */}
      {visibles.length} de {clientesConSeguimiento.length}
      {esCelular ? "" : " clientes"}
    </Typography>
  );

  // El aplicado conserva su color: sin esto MUI le superpone un tinte al
  // pasar el mouse y otro mientras tiene el foco.
  const chipElegido = (color) => ({
    bgcolor: color,
    color: theme.palette.getContrastText(color),
    "& .MuiChip-icon": { color: "inherit" },
    "&:hover": { bgcolor: color },
    "&.Mui-focusVisible": { bgcolor: color },
  });

  const enColumna = {
    width: "100%",
    justifyContent: "flex-start",
    "& .MuiChip-label": { width: "100%" },
  };

  // El rótulo de un botón de filtro con su número, que va en su pastilla, a
  // la derecha, como en la lista de clientes.
  const rotuloConConteo = (label, conteo, seleccionado, color) => (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ width: "100%" }}
    >
      <Box component="span">{label}</Box>
      <Box
        component="span"
        sx={{
          minWidth: 20,
          height: 20,
          px: 0.75,
          borderRadius: (t) => t.shape.pill,
          fontSize: 11,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: seleccionado ? "custom.contadorSobreChip" : "action.selected",
          color: seleccionado ? theme.palette.getContrastText(color) : "text.secondary",
        }}
      >
        {conteo}
      </Box>
    </Stack>
  );

  // Los botones de la columna. Los de gestión, con el color de cada una y
  // cuántas facturas hay.
  const chipsGestion = () =>
    FILTROS_GESTION.map((filtro) => {
      const seleccionado = filtroGestion === filtro.valor;
      const colorFiltro = colorPorGestion[filtro.valor];
      const color = colorFiltro || acento;
      const conteo = conteosPorGestion[filtro.valor] || 0;
      return (
        <Chip
          key={filtro.valor}
          clickable
          onClick={() => setFiltroGestion(filtro.valor)}
          variant={seleccionado ? "filled" : "outlined"}
          label={rotuloConConteo(filtro.label, conteo, seleccionado, color)}
          icon={
            colorFiltro && !seleccionado ? (
              <Box
                component="span"
                sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: colorFiltro, ml: "10px" }}
              />
            ) : undefined
          }
          sx={{
            flexShrink: 0,
            fontWeight: 600,
            ...enColumna,
            ...(seleccionado && chipElegido(color)),
          }}
        />
      );
    });

  // Los de tipo, con cuántos CLIENTES hay de cada uno (ver conteosPorTipo).
  const chipsTipo = () =>
    FILTROS_TIPO.map((filtro) => {
      const seleccionado = filtroTipo === filtro.valor;
      const Icono = filtro.icono;
      return (
        <Chip
          key={filtro.valor}
          clickable
          onClick={() => setFiltroTipo(filtro.valor)}
          label={rotuloConConteo(
            filtro.label,
            conteosPorTipo[filtro.valor],
            seleccionado,
            acento,
          )}
          icon={Icono ? <Icono /> : undefined}
          variant={seleccionado ? "filled" : "outlined"}
          sx={{
            flexShrink: 0,
            ...enColumna,
            ...(seleccionado && chipElegido(acento)),
          }}
        />
      );
    });

  // El id en inputProps y el htmlFor del rótulo son obligatorios en todo
  // select de la app: sin ellos el rótulo apunta a un elemento que no es el
  // campo y el lector de pantalla no lo asocia.
  const selector = ({ id, label, value, onChange, opciones, sx }) => (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      onChange={(evento) => onChange(evento.target.value)}
      inputProps={{ id }}
      InputLabelProps={{ htmlFor: id }}
      sx={sx}
    >
      {opciones.map((opcion) => (
        <MenuItem key={opcion.valor} value={opcion.valor}>
          {/* Con `cantidad`, el número va al otro extremo del renglón: en la
              lista y en el campo una vez elegida. Si no cabe —los tres
              desplegables del celular son angostos— el nombre se corta con
              "…" y el número queda siempre a la vista. */}
          {opcion.cantidad === undefined ? (
            opcion.label
          ) : (
            <Stack
              direction="row"
              justifyContent="space-between"
              spacing={1}
              sx={{ width: "100%", minWidth: 0 }}
            >
              <Box
                component="span"
                sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {opcion.label}
              </Box>
              <Box component="span" sx={{ flexShrink: 0 }}>
                {opcion.cantidad}
              </Box>
            </Stack>
          )}
        </MenuItem>
      ))}
    </TextField>
  );

  // "3 días vencidos" y la cantidad de facturas al otro extremo (lo pidió el
  // dueño el 2026-10-20).
  const selectorDias = (sx) =>
    selector({
      id: "filtro-dias-seguimiento",
      label: "Días vencidos",
      value: diasElegidos,
      onChange: setFiltroDias,
      opciones: [
        { valor: "todos", label: "Todos", cantidad: conGestion.length },
        ...opcionesDeDias,
      ],
      sx,
    });

  // EN CELULAR, TRES DESPLEGABLES en un renglón, como los de la lista de
  // clientes: gestión, días y tipo, cada uno con su rótulo. También en el
  // computador angosto, donde no entra la columna. En los tres, la cantidad
  // al otro extremo del nombre.
  const desplegables = (
    <Stack direction="row" spacing={1}>
      {selector({
        id: "filtro-gestion-seguimiento",
        label: "Gestión",
        value: filtroGestion,
        onChange: setFiltroGestion,
        opciones: FILTROS_GESTION.map((filtro) => ({
          valor: filtro.valor,
          label: filtro.label,
          cantidad: conteosPorGestion[filtro.valor] || 0,
        })),
        sx: { flex: 1, minWidth: 0 },
      })}
      {selectorDias({ flex: 1, minWidth: 0 })}
      {selector({
        id: "filtro-tipo-seguimiento",
        label: "Tipo",
        value: filtroTipo,
        onChange: setFiltroTipo,
        opciones: FILTROS_TIPO.map((filtro) => ({
          valor: filtro.valor,
          label: filtro.label,
          cantidad: conteosPorTipo[filtro.valor],
        })),
        sx: { flex: 1, minWidth: 0 },
      })}
    </Stack>
  );

  const etiquetaFiltro = (texto) => (
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, pl: 0.5 }}>
      {texto}
    </Typography>
  );

  // EL PANEL DE LA DERECHA, solo en computador: los números del menú y la
  // historia del equipo que se elija en la lista. En el celular no entra al
  // lado, y cada equipo abre su historia en un diálogo.
  //
  // Desde 1520px: con la columna de filtros y los 420px del panel, ahí les
  // quedan a las tarjetas los mismos 760px. Desde 1200, como era antes, les
  // quedaban 484 y los equipos y los números se encimaban. Más angosto la
  // lista va sin panel y la historia se abre con el botón de cada equipo,
  // como en el celular.
  const anchoParaPanel = useMediaQuery("(min-width:1520px)");
  const conPanel = !esCelular && anchoParaPanel;

  // El equipo elegido se busca de nuevo en la lista vigente cada vez: después
  // de registrar una devolución o una ampliación la lista se recarga, y así el
  // panel muestra la historia ya con lo que se acaba de anotar. Si la factura
  // salió de Seguimiento, el panel vuelve a quedar vacío.
  const elegido = useMemo(() => {
    if (!seleccion) return null;
    const item = clientesConSeguimiento.find(
      ({ cliente }) => cliente.id === seleccion.clienteId,
    );
    const factura = item?.facturas.find((f) => f.id === seleccion.facturaId);
    const equipo = factura && equiposDe(factura)[seleccion.posicion]?.equipo;
    if (!equipo) return null;
    return {
      equipo,
      numeroFactura: datosFactura(factura).numeroFactura,
      nombreCliente: obtenerNombreCompleto(item.cliente),
    };
  }, [seleccion, clientesConSeguimiento]);

  if (loading) {
    return <LoadingLogo height="40vh" text="Cargando seguimiento de clientes..." />;
  }

  // El buscador y los filtros van aparte de la lista: en computador ocupan
  // TODO el ancho, y el panel de la derecha arranca debajo de ellos, a la
  // altura de la primera tarjeta.
  const encabezado =
    clientesConSeguimiento.length > 0 &&
        (esCelular ? (
          // EN CELULAR, TRES RENGLONES: el buscador con el botón de menú al
          // lado —que antes era un botón ancho al pie—, los filtros debajo y,
          // al final, qué lista es y cuántos se están viendo. Antes iban los
          // tres apilados sin orden, con el conteo en el medio.
          <Stack spacing={1} sx={{ mb: 1.5, flexShrink: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ flex: 1, minWidth: 0 }}>{buscador}</Box>
              <Tooltip title="Menú">
                <IconButton
                  onClick={() => navigate("/adminforms")}
                  aria-label="Menú"
                  color="primary"
                  sx={{ flexShrink: 0 }}
                >
                  <DashboardIcon />
                </IconButton>
              </Tooltip>
            </Stack>

            {desplegables}

            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ gap: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                Lista de clientes
              </Typography>
              {contador}
            </Stack>
          </Stack>
        ) : columnaFiltros ? (
          // Los filtros están en la columna de la izquierda: acá quedan el
          // buscador y el conteo.
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ mb: 2, flexShrink: 0 }}
          >
            {buscador}
            {contador}
          </Stack>
        ) : (
          // Sin lugar para la columna: debajo del buscador, los tres
          // desplegables del celular. Antes los botones de la columna se
          // acomodaban como podían en el renglón, y el dueño (2026-10-20)
          // pidió que al achicar la pantalla pasara de una a lo del celular.
          <Stack spacing={1.5} sx={{ mb: 2, flexShrink: 0 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              {buscador}
              {contador}
            </Stack>
            {desplegables}
          </Stack>
        ));

  const cuerpo = (
      // Acostado el celular el scroll lo manda la caja de afuera, no esta:
      // dos áreas que se desplazan, una dentro de la otra, se pelean el dedo.
      <Box
        sx={
          altoCorto ? undefined : { flex: 1, minHeight: 0, overflowY: "auto" }
        }
      >
        {clientesConSeguimiento.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 6 }}>
            No hay clientes en seguimiento por el momento.
          </Typography>
        ) : visibles.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 6 }}>
            {busquedaLower
              ? "No se encontraron clientes con esa búsqueda."
              : "No hay clientes en seguimiento con este filtro."}
          </Typography>
        ) : (
          <Stack spacing={2.5}>
            {visibles.map(({ cliente, facturas, facturasAbiertas }) => (
              <ClienteSeguimientoCard
                key={cliente.id}
                cliente={cliente}
                facturas={facturas}
                facturasConSaldo={facturasAbiertas}
                hoy={hoy}
                onEquiposActualizados={() => fetchSeguimiento(true)}
                {...(conPanel && {
                  equipoElegido: elegido ? seleccion.clave : undefined,
                  onElegirEquipo: setSeleccion,
                })}
              />
            ))}
          </Stack>
        )}
      </Box>
  );

  const lista = conPanel ? (
    // La lista y el panel, lado a lado debajo del buscador. Cada uno se
    // desplaza por su cuenta: el panel no se va al bajar por la lista.
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", gap: 3 }}>
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {cuerpo}
      </Box>
      <Box sx={{ width: 420, flexShrink: 0, minHeight: 0 }}>
        <PanelSeguimiento elegido={elegido} hoy={hoy} onSoltar={() => setSeleccion(null)} />
      </Box>
    </Box>
  ) : (
    cuerpo
  );

  // LA COLUMNA DE FILTROS va debajo del buscador, no al lado: así arranca a la
  // altura de la primera tarjeta, como la pidió el dueño. Se desplaza por su
  // cuenta, igual que la lista.
  const columna = (
    <Box
      sx={{
        width: "clamp(160px, 14vw, 220px)",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        overflowY: "auto",
      }}
    >
      {etiquetaFiltro("Gestión")}
      <Stack spacing={1}>{chipsGestion()}</Stack>
      <Box sx={{ mt: 1.5 }}>{selectorDias({ width: "100%" })}</Box>
      <Box sx={{ mt: 1 }}>{etiquetaFiltro("Tipo")}</Box>
      <Stack spacing={1}>{chipsTipo()}</Stack>
    </Box>
  );

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        ...(altoCorto
          ? { overflowY: "auto" }
          : { display: "flex", flexDirection: "column" }),
      }}
    >
      {encabezado}

      {columnaFiltros && clientesConSeguimiento.length > 0 ? (
        <Box sx={{ flex: 1, minHeight: 0, display: "flex", gap: 3 }}>
          {columna}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {lista}
          </Box>
        </Box>
      ) : (
        lista
      )}

      <AppSnackbar snackbar={snackbar} onClose={closeSnackbar} />
    </Box>
  );
}
