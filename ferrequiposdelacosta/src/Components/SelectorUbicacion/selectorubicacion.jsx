import { useState, useEffect} from "react";
import { useSelector } from "react-redux";
import { TextField, MenuItem, Box, Typography, Divider } from "@mui/material";
import { departamentosYMunicipios } from "../RolesPermisos/RolesPermisos";

export default function SelectorUbicacion({ onGuardarDireccion, modoAdmin }) {
  const direccion = useSelector((state) => state.cliente.direccion);
  const [departamento, setDepartamento] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [detalle, setDetalle] = useState("");
  const [otrosDatos, setOtrosDatos] = useState("");

  // const guardarDireccion = (data) => {
  //   const nuevaDireccion = {
  //     departamento,
  //     municipio,
  //     detalle,
  //     otrosDatos,
  //     ...data,
  //   };
  //   dispatch(actualizarDireccion(nuevaDireccion));
  //   localStorage.setItem("datosCliente", JSON.stringify(nuevaDireccion));
  // };

    useEffect(() => {
      const direccion = {
        detalle,
        otrosDatos,
        departamento,
        municipio,
      };
      onGuardarDireccion(direccion); 
    }, [departamento, municipio, detalle, otrosDatos, onGuardarDireccion]);

  console.log(detalle, otrosDatos, departamento, municipio);


  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {!modoAdmin && (
        <Box>
          <Typography variant="subtitle1">
            <strong>Cliente actual:</strong>
          </Typography>

          <Typography variant="body2">
            Direccion: {direccion.detalle}
          </Typography>

          <Typography variant="body2">Otros: {direccion.otrosDatos}</Typography>

          <Typography variant="body2">
            Departamento: {direccion.departamento}
          </Typography>
          <Typography variant="body2">
            Municipio: {direccion.municipio}
          </Typography>
          <Divider sx={{ my: 1 }} />
        </Box>
      )}

      <TextField
        label="Dirección"
        value={detalle}
        onChange={(e) => setDetalle(e.target.value)}
        fullWidth
        placeholder="Ej: Calle 123 #45-67"
      />

      <TextField
        label="Otros datos (Ej: bodega, edificio, obra)"
        value={otrosDatos}
        onChange={(e) => setOtrosDatos(e.target.value)}
        fullWidth
        placeholder="Ej: Bodega 5, Edificio Torre Sur"
      />

      <TextField
        select
        label="Departamento"
        value={departamento}
        onChange={(e) => setDepartamento(e.target.value)}
        fullWidth
      >
        {Object.keys(departamentosYMunicipios).map((dep) => (
          <MenuItem key={dep} value={dep}>
            {dep}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="Municipio"
        value={municipio}
        onChange={(e) => setMunicipio(e.target.value)}
        fullWidth
        disabled={!departamento}
      >
        {departamento && departamentosYMunicipios[departamento]?.length > 0 ? (
          departamentosYMunicipios[departamento].map((mun) => (
            <MenuItem key={mun} value={mun}>
              {mun}
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>Seleccione un departamento</MenuItem>
        )}
      </TextField>
    </Box>
  );
}
