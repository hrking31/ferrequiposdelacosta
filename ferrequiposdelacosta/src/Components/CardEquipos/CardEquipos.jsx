import React from "react";
import { Link } from "react-router-dom";
import { Card, CardActionArea, CardMedia, Grid } from "@mui/material";
import { StyleNameTypography, StyledCardContent } from "./CardEquiposStyled";

export default function CardEquipos({ name, url, id }) {
  return (
    <Grid
      container
      spacing={2}
      sx={{
        marginTop: "20px",
        marginBottom: {
          xs: "-15px",
          sm: "-30px",
          md: "-70px",
        },
      }}
    >
      <Grid item xs={12}>
        <Link to={`/detail/${id}`} style={{ textDecoration: "none" }}>
          <Card
            sx={{
              maxWidth: 345,
              border: "1px solid #ddd",
              borderRadius: "8px",
              boxShadow: 4,
              "&:hover": {
                transform: "scale(1.05)",
                boxShadow: 6,
              },
            }}
          >
            <CardActionArea>
              <CardMedia
                component="img"
                height="400"
                src={url}
                alt="img not found"
              />
              <StyledCardContent>
                <Grid container direction="column" spacing={2}>
                  <Grid item xs={12} sx={{ marginBottom: "-15px" }}>
                    <StyleNameTypography
                      sx={{
                        fontSize: { xs: "1rem", sm: "1.5rem", md: "2rem" },
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        lineHeight: 1.2,
                      }}
                      title={name}
                    >
                      {name}
                    </StyleNameTypography>
                  </Grid>
                </Grid>
              </StyledCardContent>
            </CardActionArea>
          </Card>
        </Link>
      </Grid>
    </Grid>
  );
}
