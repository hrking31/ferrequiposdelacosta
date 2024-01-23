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
import { linkStyle } from "./CardEquiposStyled";
import { Card, CardActionArea, CardMedia, Grid, Rating } from "@mui/material";
import {
  StyleNameTypography,
  StyledCardContent,
  StyledDivider,
  StyleTypography,
  StyledRoomPriceTypography,
  StyledUSD,
  StyledStarIcon,
  StyledStarBorderIcon,
} from "./CardEquiposStyled";

export default function CardEquipos({ name, url, price }) {
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
        <Link to={`/detail/${name}`} style={linkStyle}>
          <Card
            sx={{
              backgroundColor: "#ededed",
              height: "500px",
              transition: "0.2s",
              "&:hover": {
                transform: "scale(1.05)",
              },
            }}
          >
            <CardActionArea>
              <Grid item xs>
                <CardMedia
                  component="img"
                  height="215"
                  src={url[0]}
                  alt="img not found"
                />
              </Grid>

              <StyledCardContent>
                <Grid item xs={12} sm container>
                  <Grid item xs={12} container direction="column" spacing={2}>
                    <Grid item sx={{ width: 100, marginBottom: "-15px" }}>
                      <StyleNameTypography variant="h5">
                        {name}
                      </StyleNameTypography>
                      <Rating
                        name="rating"
                        readOnly
                        emptyIcon={<StyledStarBorderIcon />}
                        icon={<StyledStarIcon />}
                        size="large"
                        sx={{ fontSize: 15 }}
                      />
                    </Grid>
                  </Grid>
                  <Grid item xs={12}>
                    <StyledRoomPriceTypography sx={{ mt: 2 }}>
                      {`$${price}`}
                      <StyledUSD>$</StyledUSD>
                    </StyledRoomPriceTypography>
                  </Grid>
                </Grid>
                <StyledDivider />
                <StyleTypography sx={{ mt: 1.5 }}>Facilities</StyleTypography>
              </StyledCardContent>
            </CardActionArea>
          </Card>
        </Link>
      </Grid>
    </Grid>
  );
}
