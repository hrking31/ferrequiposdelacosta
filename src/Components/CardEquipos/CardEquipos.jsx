/*import style from "../Card/Card.module.css";
import { Link } from "react-router-dom";

export default function Card(props) {
  return (
    <div>
      <div className={style.card}>
        <Link to={`/detail/${props.name}`}>
          <h2> {props.name}</h2>
          <h2>{props.price}</h2>
          <img
            src={props.url}
            className={style.cardImage}
            alt="img not found"
          />*/
//         {/* <p>{props.description}</p> */}
//       </Link>
//     </div>
//    </div>
//  );
//}

import React from "react";
import { Link } from "react-router-dom";
import { Card, CardActionArea, CardMedia, Grid} from "@mui/material";
import {
  StyleNameTypography,
  StyledCardContent,
} from "./CardEquiposStyled";
import { Textfit } from "react-textfit";

export default function CardEquipos({ name, url }) {
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
        <Link to={`/detail/${name}`} style={{ textDecoration: "none" }}>
          <Card
            sx={{
              backgroundColor: "#ededed",
              height: "auto",
              transition: "0.2s",
              "&:hover": {
                transform: "scale(1.05)",
              },
            }}
          >
            <CardActionArea>
              <CardMedia
                component="img"
                height="400"
                src={url[0]}
                alt="img not found"
              />
              <StyledCardContent>
                <Grid container direction="column" spacing={2}>
                  <Grid item xs={12} sx={{ marginBottom: "-15px" }}>
                    <Textfit mode="multi" max={30}>
                      <StyleNameTypography>{name}</StyleNameTypography>
                    </Textfit>
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



