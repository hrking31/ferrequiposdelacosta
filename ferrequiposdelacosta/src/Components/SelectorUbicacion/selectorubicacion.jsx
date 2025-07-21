import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { TextField, MenuItem, Box } from "@mui/material";
import { departamentosYMunicipios } from "../RolesPermisos/RolesPermisos.jsx";
import { actualizarDireccion } from "../../Store/Slices/clienteSlice";

const SelectorUbicacion = () => {
  const dispatch = useDispatch();
  // const direccion = useSelector((state) => state.cliente.direccion);
  const [departamento, setDepartamento] = useState("");
  const [municipio, setMunicipio] = useState("");


  const handleDepartamentoChange = (event) => {
    const nuevoDepartamento = event.target.value;
    setDepartamento(nuevoDepartamento);
    setMunicipio("");
    dispatch(
      actualizarDireccion({ departamento: nuevoDepartamento, municipio: "" })
    );
  };

  const handleMunicipioChange = (event) => {
    const nuevoMunicipio = event.target.value;
    setMunicipio(nuevoMunicipio);
    dispatch(actualizarDireccion({ departamento, municipio: nuevoMunicipio }));
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <TextField
        select
        label="Departamento"
        value={departamento}
        onChange={handleDepartamentoChange}
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
        onChange={handleMunicipioChange}
        fullWidth
        disabled={!departamento}
      >
        {departamento &&
          departamentosYMunicipios[departamento].map((mun) => (
            <MenuItem key={mun} value={mun}>
              {mun}
            </MenuItem>
          ))}
      </TextField>
    </Box>
  );
};

export default SelectorUbicacion;
