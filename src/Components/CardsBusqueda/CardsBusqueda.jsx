import React from 'react';
import { Card, CardContent, CardMedia, Typography } from '@mui/material';

const CardBusqueda = ({ name, description, imageUrl }) => {
  // Verifica si imageUrl es un array y contiene URLs válidas
  const imageSrc = imageUrl && imageUrl.length > 0 ? imageUrl[0] : '';

  return (
    <Card sx={{ maxWidth: 345 }}>
                    <CardMedia
                component="img"
                height="400"
                src={imageUrl}
                alt="img not found"
              />
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          {name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default CardBusqueda;



