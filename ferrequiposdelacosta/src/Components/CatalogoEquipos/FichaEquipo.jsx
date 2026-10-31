import { useState } from "react";
import PropTypes from "prop-types";
import { Box, Button, ButtonBase, Chip, IconButton, Stack, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import TuneIcon from "@mui/icons-material/Tune";
import ConstructionIcon from "@mui/icons-material/Construction";
import DescriptionIcon from "@mui/icons-material/Description";
import EtiquetasFoto from "../FormularioEquipo/EtiquetasFoto";
import { coloresDelFormulario, lugarDeLaFoto } from "../FormularioEquipo/piezasFormulario";
import { TituloSeccion } from "../PanelLista/ResumenLista";
import { miniaturaDe } from "./catalogoEquipos";

// Un dato de la ficha, en su propio recuadro del color de su recuadro del
// formulario (descripción azul, variantes naranja, cotización verde), con
// aire (pedido del dueño, 2026-10-26; también en el celular desde el
// 2026-10-29). Arriba su ícono y su título y debajo el texto, como los
// recuadros de Usuarios (pedido del dueño, 2026-10-29), con los nombres de
// los recuadros de Crear equipo y, debajo del título, su `subtitulo` (el
// nombre de la variante, el subtítulo de la cotización). `crece`: se lleva el
// alto que sobra y, si su texto es más largo, se desplaza adentro.
function Dato({ titulo, subtitulo, icono, color, crece = false, children }) {
  return (
    <Box
      sx={(theme) => ({
        p: 2,
        // El recuadro de toda la app (theme.recuadro).
        ...theme.recuadro(color),
        flexShrink: 0,
        ...(crece && { flex: "1 1 auto", minHeight: 96, overflowY: "auto" }),
      })}
    >
      <TituloSeccion titulo={titulo} icono={icono} color={color} />
      {subtitulo && (
        // Pegado al título (que deja 16px debajo) y con su aire antes del
        // contenido.
        <Typography variant="body2" sx={{ fontWeight: 700, color: "text.secondary", mt: -1, mb: 1.5 }}>
          {subtitulo}
        </Typography>
      )}
      {children}
    </Box>
  );
}

Dato.propTypes = {
  titulo: PropTypes.string.isRequired,
  subtitulo: PropTypes.string,
  icono: PropTypes.element.isRequired,
  color: PropTypes.string.isRequired,
  crece: PropTypes.bool,
  children: PropTypes.node,
};

// Cuántas miniaturas se ven a la vez.
const A_LA_VEZ = 4;
// El espacio entre miniaturas, en px (8 = spacing 1 del tema).
const ESPACIO = 8;

// LAS FOTOS DEL EQUIPO EN MINIATURA, en una sola fila pareja de cuatro, como
// las casillas del menú (pedido del dueño, 2026-10-26: sueltas quedaban
// desordenadas en el celular). Si son más, las flechas de los lados avisan
// que hay otras y las van trayendo: la fila se corre y la siguiente entra por
// la derecha. Tocar una la muestra en grande.
function TiraDeFotos({ fotos, vista, onVer, acento }) {
  // La primera que se ve en la fila.
  const [inicio, setInicio] = useState(0);
  const conFlechas = fotos.length > A_LA_VEZ;
  const ultimoInicio = Math.max(0, fotos.length - A_LA_VEZ);
  // Cada miniatura mide un cuarto del ancho, menos su parte de los espacios.
  const anchoMiniatura = `calc((100% - ${(A_LA_VEZ - 1) * ESPACIO}px) / ${A_LA_VEZ})`;

  const flecha = (paso, etiqueta, Icono) => (
    <IconButton
      size="small"
      aria-label={etiqueta}
      disabled={paso < 0 ? inicio === 0 : inicio === ultimoInicio}
      onClick={() => setInicio((i) => Math.min(ultimoInicio, Math.max(0, i + paso)))}
      sx={{ flexShrink: 0, p: 0.25 }}
    >
      <Icono />
    </IconButton>
  );

  return (
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1.5, flexShrink: 0 }}>
      {conFlechas && flecha(-1, "Fotos anteriores", ChevronLeftIcon)}
      {/* Unos px de relleno para que no se corte el borde de la elegida. */}
      <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden", p: "4px" }}>
        <Box
          sx={{
            display: "flex",
            // Con 2 o 3, centradas bajo la foto y en su orden, la portada
            // primero (pedido del dueño, 2026-10-29).
            justifyContent: conFlechas ? "flex-start" : "center",
            gap: `${ESPACIO}px`,
            transition: "transform 0.3s ease",
            transform: `translateX(calc(-${inicio} * (${anchoMiniatura} + ${ESPACIO}px)))`,
          }}
        >
          {fotos.map((foto, i) => (
            <ButtonBase
              key={`${foto.url}-${i}`}
              onClick={() => onVer(i)}
              aria-label={`Ver foto ${i + 1}`}
              aria-pressed={i === vista}
              sx={{
                flex: `0 0 ${anchoMiniatura}`,
                aspectRatio: "4 / 3",
                borderRadius: 1.5,
                overflow: "hidden",
                outline: i === vista ? `2px solid ${acento}` : "none",
                outlineOffset: 2,
              }}
            >
              <Box
                component="img"
                src={miniaturaDe(foto)}
                alt=""
                loading="lazy"
                sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </ButtonBase>
          ))}
        </Box>
      </Box>
      {conFlechas && flecha(1, "Más fotos", ChevronRightIcon)}
    </Stack>
  );
}

TiraDeFotos.propTypes = {
  fotos: PropTypes.arrayOf(PropTypes.shape({ url: PropTypes.string })).isRequired,
  vista: PropTypes.number.isRequired,
  onVer: PropTypes.func.isRequired,
  acento: PropTypes.string.isRequired,
};

// LA FICHA DE UN EQUIPO (opción 2 que eligió el dueño, 2026-10-26): lo que
// tiene guardado, para mirarlo antes de editarlo o eliminarlo. La foto grande
// arriba (la portada, o la que se toque abajo), el nombre, la descripción, las
// variantes y lo que va en la cotización. Solo muestra: no escribe nada.
//
// `conBotones`: EDITAR y ELIMINAR al pie de la ficha. En el celular van en
// el pie de la pantalla.
//
// `llenarAlto`: en el computador, la foto y los datos en una fila al alto de
// la pantalla, sin dejar hueco abajo (pedido del dueño, 2026-10-26; desde el
// 2026-10-29 también de 916 a 1009px): la foto grande crece con el alto que
// hay —entera, sobre blanco, como en la tienda—, las miniaturas quedan al pie
// de la foto y los botones al fondo de la ficha. Sin eso (celular), SIEMPRE
// uno debajo del otro, la foto a todo el ancho (pedido del dueño, 2026-10-29:
// en el celular ancho o acostado se ponían lado a lado); se desplaza.
//
// `enDosPisos` (con `llenarAlto`): de 960 a 1032px, donde en una fila la foto
// quedaba angosta (pedido del dueño, 2026-10-29): arriba la foto con sus
// miniaturas y, a su derecha, el nombre, sus etiquetas y la descripción;
// abajo, a todo el ancho, las variantes y la cotización, una debajo de la
// otra y del mismo alto, y los botones.
export default function FichaEquipo({
  equipo,
  onEditar,
  onEliminar,
  conBotones = true,
  llenarAlto = false,
  enDosPisos = false,
}) {
  const theme = useTheme();
  const colores = coloresDelFormulario(theme);
  const acento = theme.palette.custom.accent;
  // La foto que se ve en grande (al abrir, la portada).
  const [vista, setVista] = useState(0);
  const fotos = equipo.images || [];
  const actual = fotos[vista] || fotos[0];
  const variantes = equipo.variantes || [];
  // Con el alto de la pantalla, la letra de los textos un poco más grande.
  const texto = llenarAlto ? "body1" : "body2";

  const foto = (
    <Box
      sx={{
        ...(llenarAlto
          ? { position: "relative", flex: "1 1 0", minHeight: enDosPisos ? 0 : 220, minWidth: 0 }
          : lugarDeLaFoto),
        borderRadius: 2,
        overflow: "hidden",
        // Con foto, el blanco de la tienda (las fotos vienen sobre blanco).
        bgcolor: actual && llenarAlto ? "common.white" : "action.hover",
        display: "grid",
        placeItems: "center",
      }}
    >
      {actual ? (
        <Box
          component="img"
          src={actual.url}
          alt={actual.name || equipo.name}
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            // Alta, entera; en el cuadro de 4 a 3, recortada para llenarlo.
            objectFit: llenarAlto ? "contain" : "cover",
          }}
        />
      ) : (
        <PhotoLibraryIcon sx={{ fontSize: 56, color: "text.disabled" }} />
      )}
      {actual && vista === 0 && (
        <Box sx={{ position: "absolute", top: 8, left: 8 }}>
          <EtiquetasFoto portada />
        </Box>
      )}
    </Box>
  );

  const encabezado = (
    <Box sx={{ flexShrink: 0 }}>
      <Typography
        variant="h5"
        sx={{
          fontWeight: 800,
          color: acento,
          overflowWrap: "anywhere",
          ...(llenarAlto && { fontSize: "1.75rem", lineHeight: 1.25 }),
        }}
      >
        {equipo.name}
      </Typography>
      {llenarAlto ? (
        // Cuántas fotos y variantes, en dos etiquetas.
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Chip
            size="small"
            icon={<PhotoLibraryIcon />}
            label={fotos.length === 1 ? "1 foto" : `${fotos.length} fotos`}
            sx={{ fontWeight: 600 }}
          />
          <Chip
            size="small"
            icon={<TuneIcon />}
            label={variantes.length === 1 ? "1 variante" : `${variantes.length} variantes`}
            sx={{ fontWeight: 600 }}
          />
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {fotos.length === 1 ? "1 foto" : `${fotos.length} fotos`} ·{" "}
          {variantes.length === 1 ? "1 variante" : `${variantes.length} variantes`}
        </Typography>
      )}
    </Box>
  );

  const descripcion = (
    <Dato titulo="DATOS DEL EQUIPO" icono={<ConstructionIcon />} color={colores.datos} crece={llenarAlto}>
      <Typography variant={texto} sx={{ whiteSpace: "pre-line", lineHeight: 1.6 }}>
        {equipo.description}
      </Typography>
    </Dato>
  );

  const recuadroVariantes = variantes.length > 0 && (
    <Dato
      titulo="VARIANTES"
      subtitulo={equipo.varianteNombre?.toUpperCase()}
      icono={<TuneIcon />}
      color={colores.variantes}
    >
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {variantes.map((valor) => (
          <Chip
            key={valor}
            label={valor}
            size={llenarAlto ? "medium" : "small"}
            sx={{
              fontWeight: 600,
              bgcolor: alpha(colores.variantes, 0.12),
              border: "1px solid",
              borderColor: alpha(colores.variantes, 0.5),
            }}
          />
        ))}
      </Stack>
    </Dato>
  );

  const recuadroCotizacion = (
    <Dato
      titulo="TEXTOS DE LA COTIZACIÓN"
      subtitulo={equipo.subtitulo}
      icono={<DescriptionIcon />}
      color={colores.cotizacion}
    >
      {!equipo.subtitulo && (
        <Typography variant={texto} color="text.secondary">
          Sin subtítulo: la cotización usa la descripción.
        </Typography>
      )}
      {equipo.textoExtra && (
        <Typography variant={texto} color="text.secondary" sx={{ mt: 0.5, whiteSpace: "pre-line" }}>
          {equipo.textoExtra}
        </Typography>
      )}
    </Dato>
  );

  // `enColumna`: en dos pisos van al lado de los textos de la cotización, uno
  // encima del otro (pedido del dueño, 2026-10-30), y no en su propia fila.
  const botonesEn = (enColumna) => conBotones && (
    <Stack
      direction={enColumna ? "column" : "row"}
      spacing={1.5}
      justifyContent="center"
      sx={enColumna ? { flexShrink: 0, width: 170 } : { mt: "auto", pt: 1, flexShrink: 0 }}
    >
      <Button variant="contained" color="accent" startIcon={<EditIcon />} onClick={onEditar} fullWidth>
        EDITAR
      </Button>
      <Button
        variant="outlined"
        color="error"
        startIcon={<DeleteOutlineIcon />}
        onClick={onEliminar}
        fullWidth
      >
        ELIMINAR
      </Button>
    </Stack>
  );

  // La foto con sus miniaturas debajo. En el computador, en su propio
  // recuadro, como el carné de una persona (pedido del dueño, 2026-10-29); en
  // el celular, el recuadro lo pone la ficha (con el nombre adentro).
  const fotoConMiniaturas = (
    <Box
      sx={
        llenarAlto
          ? {
              flex: "1 1 0",
              minWidth: 0,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              boxSizing: "border-box",
              p: 2,
              borderRadius: 3,
              bgcolor: "background.elevated",
              border: "1px solid",
              borderColor: "divider",
            }
          : { flexShrink: 0 }
      }
    >
      {foto}
      {fotos.length > 1 && (
        <TiraDeFotos fotos={fotos} vista={vista} onVer={setVista} acento={acento} />
      )}
    </Box>
  );

  // El recuadro grande de la ficha en el computador (una fila y dos pisos).
  const marco = {
    height: "100%",
    boxSizing: "border-box",
    overflowY: "auto",
    p: 3,
    ...theme.recuadro(acento),
    display: "flex",
  };

  if (enDosPisos) {
    return (
      <Box sx={{ ...marco, flexDirection: "column", gap: 2 }}>
        {/* Arriba, la foto con sus miniaturas y, a la derecha, el nombre y la
            descripción. */}
        <Box sx={{ flex: "1 1 0", minHeight: 260, display: "flex", gap: 3 }}>
          {fotoConMiniaturas}
          <Box
            sx={{
              flex: "0 0 42%",
              minWidth: 0,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {encabezado}
            {descripcion}
          </Box>
        </Box>
        {/* Abajo, a todo el ancho: variantes y cotización del mismo alto (el
            del más alto), con los botones al lado de la cotización. */}
        <Box
          sx={{
            flexShrink: 0,
            display: "grid",
            gridAutoRows: "1fr",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: 2,
          }}
        >
          {recuadroVariantes && <Box sx={{ gridColumn: "1 / -1", display: "grid" }}>{recuadroVariantes}</Box>}
          {recuadroCotizacion}
          {botonesEn(true)}
        </Box>
      </Box>
    );
  }

  // EN EL CELULAR, sin el recuadro grande, como la ficha de una persona
  // (pedido del dueño, 2026-10-29): la foto, sus miniaturas y el nombre en su
  // propio recuadro —el "carné" del equipo— y debajo los demás, sueltos.
  if (!llenarAlto) {
    return (
      <Stack spacing={1.5} sx={{ pb: 1.5 }}>
        <Box
          sx={{
            p: 1.75,
            ...theme.recuadro(acento),
          }}
        >
          {fotoConMiniaturas}
          <Box sx={{ mt: 1.5 }}>{encabezado}</Box>
        </Box>
        {descripcion}
        {recuadroVariantes}
        {recuadroCotizacion}
        {botonesEn(false)}
      </Stack>
    );
  }

  return (
    <Box sx={{ ...marco, gap: 3 }}>
      {fotoConMiniaturas}

      <Box
        sx={{
          flex: "0 0 42%",
          maxWidth: 560,
          minWidth: 280,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {encabezado}
        {descripcion}
        {recuadroVariantes}
        {recuadroCotizacion}
        {botonesEn(false)}
      </Box>
    </Box>
  );
}

FichaEquipo.propTypes = {
  equipo: PropTypes.shape({
    name: PropTypes.string,
    description: PropTypes.string,
    images: PropTypes.arrayOf(PropTypes.shape({ name: PropTypes.string, url: PropTypes.string })),
    varianteNombre: PropTypes.string,
    variantes: PropTypes.arrayOf(PropTypes.string),
    subtitulo: PropTypes.string,
    textoExtra: PropTypes.string,
  }).isRequired,
  onEditar: PropTypes.func.isRequired,
  onEliminar: PropTypes.func.isRequired,
  conBotones: PropTypes.bool,
  llenarAlto: PropTypes.bool,
  enDosPisos: PropTypes.bool,
};
