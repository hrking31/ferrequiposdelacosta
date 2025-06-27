import { Box, Typography } from "@mui/material";
import { useSelector } from "react-redux";

export const Camion = ({ size = 64, color = "currentColor" }) => {
  return (
    <Box sx={{ position: "relative", width: size, height: size }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1024 1024"
        width={size}
        height={size}
        fill={color}
        style={{ verticalAlign: "middle" }}
      >
        <path d="M957.6 572.8L836.8 391.2c-3.2-4.8-8-7.2-13.6-7.2H704V224c0-17.6-14.4-32-32-32H96c-17.6 0-32 14.4-32 32v448c0 17.6 14.4 32 32 32h32c0 70.4 57.6 128 128 128s128-57.6 128-128h256c0 70.4 57.6 128 128 128s128-57.6 128-128h32c17.6 0 32-14.4 32-32v-90.4c0-3.2-0.8-6.4-2.4-8.8zM256 768c-35.2 0-64-28.8-64-64s28.8-64 64-64 64 28.8 64 64-28.8 64-64 64z m384-128H366.4c-22.4-38.4-63.2-64-110.4-64s-88.8 25.6-110.4 64H128V256h512v384z m128 128c-35.2 0-64-28.8-64-64s28.8-64 64-64 64 28.8 64 64-28.8 64-64 64z m128-128h-17.6c-22.4-38.4-63.2-64-110.4-64-23.2 0-44.8 6.4-64 17.6V448h95.2c5.6 0 10.4 2.4 12.8 7.2L892.8 572c1.6 2.4 3.2 5.6 3.2 8.8V640z" />
      </svg>
    </Box>
  );
};

export default function CamionContador({ size = 64, color = "currentColor" }) {
  const items = useSelector((state) => state.cart.items);

  return (
    <Box sx={{ position: "relative", width: size, height: size }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1024 1024"
        width={size}
        height={size}
        fill={color}
        style={{ verticalAlign: "middle" }}
      >
        <path d="M957.6 572.8L836.8 391.2c-3.2-4.8-8-7.2-13.6-7.2H704V224c0-17.6-14.4-32-32-32H96c-17.6 0-32 14.4-32 32v448c0 17.6 14.4 32 32 32h32c0 70.4 57.6 128 128 128s128-57.6 128-128h256c0 70.4 57.6 128 128 128s128-57.6 128-128h32c17.6 0 32-14.4 32-32v-90.4c0-3.2-0.8-6.4-2.4-8.8zM256 768c-35.2 0-64-28.8-64-64s28.8-64 64-64 64 28.8 64 64-28.8 64-64 64z m384-128H366.4c-22.4-38.4-63.2-64-110.4-64s-88.8 25.6-110.4 64H128V256h512v384z m128 128c-35.2 0-64-28.8-64-64s28.8-64 64-64 64 28.8 64 64-28.8 64-64 64z m128-128h-17.6c-22.4-38.4-63.2-64-110.4-64-23.2 0-44.8 6.4-64 17.6V448h95.2c5.6 0 10.4 2.4 12.8 7.2L892.8 572c1.6 2.4 3.2 5.6 3.2 8.8V640z" />
      </svg>

      {items.length > 0 && (
        <Typography
          variant="caption"
          sx={{
            position: "absolute",
            top: "20%", 
            left: "20%", 
            transform: "translate(-50%, -50%)",
            backgroundColor: "red",
            color: "white",
            borderRadius: "50%",
            width: 20,
            height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: "bold",
          }}
        >
          {items.length}
        </Typography>
      )}
    </Box>
  );
}
