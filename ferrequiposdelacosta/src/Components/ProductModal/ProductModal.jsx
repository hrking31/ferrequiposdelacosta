import { useState } from "react";
import {
  Modal,
  Box,
  Typography,
  Button,
  Slide,
  Stack,
} from "@mui/material";
import { Add, Remove } from "@mui/icons-material";
import { useDispatch } from "react-redux";
import { addToCart } from "../../Store/Slices/cartSlice.js";

const style = {
  position: "fixed",
  bottom: 0,
  left: 0,
  width: "100%",
  height: "60vh",
  bgcolor: "background.paper",
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  boxShadow: 24,
  p: 4,
};

const ProductModal = ({ open, onClose, product }) => {
  const dispatch = useDispatch();
  const [quantity, setQuantity] = useState(1);
  const [days, setDays] = useState(1);

  const handleAdd = () => {
    dispatch(addToCart({ ...product, quantity, days }));
    onClose();
  };

  const handleIncrement = (setter, value) => () => setter(value + 1);
  const handleDecrement = (setter, value) => () =>
    setter(value > 1 ? value - 1 : 1);

  const ControlBox = ({ label, value, setValue }) => (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        {label}
      </Typography>

      <Stack direction="row" spacing={2} alignItems="center">
        <Button
          variant="success"
          onClick={handleDecrement(setValue, value)}
          sx={{ minWidth: 40 }}
        >
          <Remove />
        </Button>

        <Typography variant="h6" sx={{ width: 32, textAlign: "center" }}>
          {value}
        </Typography>

        <Button
          variant="success"
          onClick={handleIncrement(setValue, value)}
          sx={{ minWidth: 40 }}
        >
          <Add />
        </Button>
      </Stack>
    </Box>
  );

  return (
    <Modal open={open} onClose={onClose}>
      <Slide direction="up" in={open}>
        <Box sx={style}>
          <Typography variant="h5" gutterBottom>
            {product?.name}
          </Typography>

          <ControlBox
            label="Cantidad"
            value={quantity}
            setValue={setQuantity}
          />
          <ControlBox label="Días" value={days} setValue={setDays} />

          <Button
            variant="success"
            color="primary"
            fullWidth
            onClick={handleAdd}
            sx={{ mt: 2 }}
          >
            Agregar al carrito
          </Button>
        </Box>
      </Slide>
    </Modal>
  );
};

export default ProductModal;
