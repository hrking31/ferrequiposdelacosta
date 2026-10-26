import { useEffect, useState } from "react";
import {
  Box,
  Stack,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import CrearEquipos from "../../Components/CrearEquipos/CrearEquipos";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import BuildIcon from "@mui/icons-material/Build";
import CloseIcon from "@mui/icons-material/Close";
import HeaderUsuarioConModal from "../../Components/HeaderUsuario/HeaderUsuario";
import PanelDocumentos from "../../Components/PanelLista/PanelDocumentos";
import ListaEquipos from "../../Components/CatalogoEquipos/ListaEquipos";
import DetalleCatalogo from "../../Components/KpiCard/DetalleCatalogo";
import DashboardIcon from "@mui/icons-material/Dashboard";
import { fetchEquiposData } from "../../Store/Slices/equiposSlice";
import { usePantallaCompacta } from "../../Utils/pantalla";
import SaveIcon from "@mui/icons-material/Save";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

// Con este id los botones del encabezado envían y limpian el formulario.
const ID_FORMULARIO = "form-crear-equipo";

const VistaCreaEquipo = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const theme = useTheme();
  const { name, photoURL, role, genero } = useSelector(
    (state) => state.user,
  );
  // LOS MISMOS CORTES DE SEGUIMIENTO (pedido del dueño, 2026-10-26):
  // - celular: angosta O baja (el teléfono acostado también lo es);
  // - desde 1010px, el formulario en dos columnas (allá, la de filtros);
  // - desde 1520px, el catálogo en su columna de 420px (allá, el panel).
  const isFullScreen = usePantallaCompacta();
  const dosColumnas = useMediaQuery("(min-width:1010px)") && !isFullScreen;
  const conPanel = useMediaQuery("(min-width:1520px)") && !isFullScreen;
  // Y las fotos, de mayor a menor (pedido del dueño, 2026-10-26): dos por fila
  // desde 1170px —también con el catálogo al lado—; más angosto, una, hasta el
  // celular.
  const dosFotosPorFila = useMediaQuery("(min-width:1170px)") && !isFullScreen;

  // LOS EQUIPOS QUE YA HAY EN EL CATÁLOGO (2026-10-26, pedido del dueño), para
  // no crear uno repetido. Es la misma lista del recuadro "Equipos" del menú y
  // sale del catálogo en memoria, que la app ya bajó al abrirse: verla no
  // cuesta ninguna lectura. Si la memoria está vacía —se recargó la página
  // estando acá— se pide una vez, como en editar o eliminar equipo.
  const { equipos: catalogo, loading: cargandoCatalogo } = useSelector((state) => state.equipos);
  const equiposEnLista = catalogo.length === 0 && cargandoCatalogo ? null : catalogo;
  const [verCatalogo, setVerCatalogo] = useState(false);
  // La cantidad junto al título de la columna y de la ventana, en vez del
  // contador al lado del buscador (pedido del dueño, 2026-10-26).
  const tituloCatalogo = (titulo) =>
    catalogo.length > 0 ? `${titulo} · ${catalogo.length}` : titulo;

  useEffect(() => {
    if (catalogo.length === 0) {
      dispatch(fetchEquiposData());
    }
    // Solo al montar: si dependiera del catálogo, uno vacío de verdad haría
    // que se pidiera en bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        width: "100%",
        // Sin barra de navegación (ver NavBar): ni arriba ni abajo hay que
        // dejarle hueco. En el celular el pie deja 5px bajo sus botones: con
        // 7 más suman los 12 del encabezado, como en la ficha del cliente.
        pb: isFullScreen ? "7px" : 2,
        px: { xs: 2, sm: 3 },
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <Box
        sx={{
          px: 0,
          // EN EL CELULAR, 12px arriba y abajo: el mismo aire que deja el pie
          // con sus botones, así el contenido queda parejo entre los dos. En
          // el computador no hay pie y el encabezado respira un poco más.
          py: isFullScreen ? 1.5 : 2,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 1,
          "@media (min-width:916px)": { px: 2 },
        }}
      >
        {/* El logo de la tienda va dentro del encabezado (conLogo), con ir
            a la tienda, al menú y cerrar sesión. */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <HeaderUsuarioConModal
            name={name}
            photoURL={photoURL}
            role={role}
            genero={genero}
            conLogo
            vista={"Crea un Nuevo Equipo"}
            descripcion={"Agrega un equipo nuevo al catálogo"}
            icono={<AddCircleOutlineIcon />}
            // Con el teléfono acostado, también el encabezado del celular.
            compacto={isFullScreen}
            // En computador Crear y Cancelar van en el encabezado, como en la
            // cotización y la cuenta de cobro; en celular, en el pie. Llegan
            // al formulario por su id (atributo `form`). Sin la columna del
            // catálogo, también va acá el botón para verlo.
            acciones={
              isFullScreen ? undefined : (
                <>
                  {/* El catálogo primero, como en el pie del celular. */}
                  {!conPanel && (
                    <Tooltip title="Ver catálogo">
                      <IconButton onClick={() => setVerCatalogo(true)} color="info">
                        <BuildIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Crear equipo">
                    <IconButton type="submit" form={ID_FORMULARIO} color="success">
                      <SaveIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Cancelar y limpiar el formulario">
                    <IconButton type="reset" form={ID_FORMULARIO} color="error">
                      <RestartAltIcon />
                    </IconButton>
                  </Tooltip>
                </>
              )
            }
          />
        </Box>
      </Box>

      {/* EN EL COMPUTADOR, el catálogo en una columna a la derecha del
          formulario: el mismo recuadro, ancho y aire del buzón y de las
          cuentas de cobro, con la lista de Equipos. Sin lugar para la
          columna, va en una ventana (la llave). */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          gap: 3,
          mx: isFullScreen ? 0 : 2,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
          {/* Crear y Cancelar viven siempre afuera: en el encabezado o en el
              pie. */}
          <CrearEquipos
            anchoCompleto={dosColumnas}
            fotosPorFila={dosFotosPorFila ? 2 : 1}
            botonesAbajo={false}
            idFormulario={ID_FORMULARIO}
          />
        </Box>
        {conPanel && (
          <Box sx={{ width: 420, flexShrink: 0, minHeight: 0 }}>
            <PanelDocumentos titulo={tituloCatalogo("Catálogo")} icono={<BuildIcon fontSize="small" />}>
              {equiposEnLista === null ? (
                <Box sx={{ mt: 2, px: 1 }}>
                  <DetalleCatalogo equipos={null} />
                </Box>
              ) : (
                // La misma lista de Equipos, con buscador y miniaturas
                // (pedido del dueño, 2026-10-26). Acá solo se mira.
                <ListaEquipos equipos={catalogo} enPanel conContador={false} />
              )}
            </PanelDocumentos>
          </Box>
        )}
      </Box>

      {/* EL PIE DEL CELULAR (pedido del dueño, 2026-10-26), como el de la
          ficha del cliente: íconos grandes repartidos a lo ancho, donde llega
          el pulgar. El catálogo primero: al tocarlo abre la lista. */}
      {isFullScreen && (
        // 5px arriba y abajo: con los botones de 44 suman la misma franja de
        // 54px que la ficha del cliente.
        <Box sx={{ py: 0.625, flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            {/* El catálogo primero; solo íconos en el pie, para un orden
                visual parejo (pedido del dueño, 2026-10-26). */}
            <Tooltip title="Ver catálogo">
              <IconButton
                aria-label="EQUIPOS"
                onClick={() => setVerCatalogo(true)}
                sx={{ p: 1.25, color: "info.main" }}
              >
                <BuildIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Crear equipo">
              <IconButton
                type="submit"
                form={ID_FORMULARIO}
                sx={{ p: 1.25, color: "success.main" }}
              >
                <SaveIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Cancelar y limpiar el formulario">
              <IconButton
                type="reset"
                form={ID_FORMULARIO}
                sx={{ p: 1.25, color: "error.main" }}
              >
                <RestartAltIcon />
              </IconButton>
            </Tooltip>
            {/* El menú al final, como en el encabezado del computador. */}
            <Tooltip title="Ir al menú">
              <IconButton
                onClick={() => navigate("/adminforms")}
                sx={{ p: 1.25, color: "custom.accent" }}
              >
                <DashboardIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      )}

      {/* La X arriba y sin botón "Cerrar" al pie, como las ventanas de los
          recuadros del menú. */}
      <Dialog
        open={!conPanel && verCatalogo}
        onClose={() => setVerCatalogo(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle
          sx={{
            color: theme.palette.custom.accent,
            display: "flex",
            alignItems: "center",
            gap: 1,
            pr: 1,
          }}
        >
          <Box component="span" sx={{ flex: 1 }}>
            {tituloCatalogo("Equipos del catálogo")}
          </Box>
          <Tooltip title="Cerrar">
            {/* El rojo del tema para cancelar y salir, el mismo de "Cerrar
                sesión" en el encabezado. */}
            <IconButton
              size="small"
              color="error"
              aria-label="Cerrar"
              onClick={() => setVerCatalogo(false)}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </DialogTitle>
        {/* La misma lista de la columna, con buscador y miniaturas (pedido
            del dueño, 2026-10-26): la llave muestra lo mismo en cualquier
            pantalla. */}
        <DialogContent>
          {equiposEnLista === null ? (
            <DetalleCatalogo equipos={null} />
          ) : (
            <ListaEquipos equipos={catalogo} enPanel conContador={false} />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default VistaCreaEquipo;
