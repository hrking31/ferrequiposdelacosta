// El documento de identidad del cliente en su ficha: dos miniaturas, frente y
// atrás, que al tocarlas se ven en grande. Va primero en el renglón del
// contacto, antes del teléfono y la dirección.
//
// Vive dentro del contacto plegable del encabezado (ver ClienteEncabezado): la
// ficha abre plegada, así que las fotos se bajan solo cuando alguien pide ver
// los datos del cliente, no cada vez que se abre la ficha.
//
// Se cargan o se cambian desde el lápiz de editar cliente.
import { useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  ButtonBase,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
} from "@mui/material";
import BadgeIcon from "@mui/icons-material/Badge";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import { LADOS_DOCUMENTO } from "../ListaClientes/documentoCliente";

const ICONO_DEL_LADO = { frente: BadgeIcon, atras: FingerprintIcon };

export default function DocumentoClienteVista({ documento, apiladas = false }) {
  const theme = useTheme();
  const [ladoAbierto, setLadoAbierto] = useState(null);

  const lados = LADOS_DOCUMENTO.filter(({ clave }) => documento?.[clave]);
  if (lados.length === 0) return null;

  const abierto = lados.find(({ clave }) => clave === ladoAbierto);

  return (
    <>
      {/* Solo las fotos, sin rótulo: la imagen ya dice qué es. */}
      <Stack
        direction={apiladas ? "column" : "row"}
        spacing={1}
        alignItems="center"
        justifyContent="center"
        sx={{ flexShrink: 0 }}
      >
        {lados.map(({ clave, etiqueta }) => (
          <ButtonBase
            key={clave}
            onClick={() => setLadoAbierto(clave)}
            aria-label={`Ver el documento, ${etiqueta.toLowerCase()}`}
            sx={{
              width: 72,
              aspectRatio: "1.586",
              borderRadius: 1,
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box
              component="img"
              src={documento[clave]}
              alt={`Documento, ${etiqueta.toLowerCase()}`}
              loading="lazy"
              sx={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </ButtonBase>
        ))}
      </Stack>

      <Dialog
        open={Boolean(abierto)}
        onClose={() => setLadoAbierto(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ color: theme.palette.custom.accent }}>
          Documento de identidad
        </DialogTitle>
        <DialogContent>
          {/* Con los dos lados cargados se pasa de uno a otro sin cerrar. */}
          {lados.length > 1 && (
            <ToggleButtonGroup
              exclusive
              size="small"
              value={ladoAbierto}
              onChange={(_e, lado) => lado && setLadoAbierto(lado)}
              sx={{ mb: 1.5, display: "flex", justifyContent: "center" }}
            >
              {/* Íconos en vez de palabras, los mismos de los dibujos de la
                  tarjeta en el formulario: la silueta es el frente y la
                  huella, atrás. */}
              {lados.map(({ clave, etiqueta }) => {
                const Icono = ICONO_DEL_LADO[clave];
                return (
                  <ToggleButton
                    key={clave}
                    value={clave}
                    aria-label={etiqueta}
                    title={etiqueta}
                    sx={{ px: 2 }}
                  >
                    <Icono fontSize="small" />
                  </ToggleButton>
                );
              })}
            </ToggleButtonGroup>
          )}
          {abierto && (
            <Box
              component="img"
              src={documento[abierto.clave]}
              alt={`Documento, ${abierto.etiqueta.toLowerCase()}`}
              sx={{
                display: "block",
                width: "100%",
                maxHeight: "70vh",
                objectFit: "contain",
                borderRadius: 1,
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setLadoAbierto(null)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

DocumentoClienteVista.propTypes = {
  // { frente, atras }: el enlace de cada foto, o vacío.
  documento: PropTypes.object,
  // Una encima de la otra (celular) en vez de lado a lado (computador).
  apiladas: PropTypes.bool,
};
