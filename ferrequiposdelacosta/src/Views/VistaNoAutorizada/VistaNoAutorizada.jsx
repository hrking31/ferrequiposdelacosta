import React from "react";
import { Typography, Container, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

const VistaNoAutorizada = () => {
  const navigate = useNavigate();

  return (
    <Container
      maxWidth="sm"
      style={{ textAlign: "center", marginTop: "100px" }}
    >
      <Typography variant="h4" color="error" gutterBottom>
        Acceso denegado
      </Typography>
      <Typography variant="body1" gutterBottom>
        No tienes permiso para ver esta página.
      </Typography>
      <Button variant="contained" color="primary" onClick={() => navigate("/")}>
        Volver al inicio
      </Button>
    </Container>
  );
};

export default VistaNoAutorizada;
