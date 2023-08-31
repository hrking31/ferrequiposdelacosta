// import { useSelector, useDispatch } from "react-redux";
// import {
//   setFormCotizacion,
//   setItems,
//   setTotal,
// } from "../../Store/Slices/cotizacionSlice";

// export default function Cotizacion() {
//   const dispatch = useDispatch();
//   const formValues = useSelector((state) => state.cotizacion.value);

//   const handlerInputChange = (event) => {
//     const { name, value } = event.target;
//     const updatedFormValues = { ...formValues, [name]: value };
//     dispatch(setFormCotizacion(updatedFormValues));
//   };

//   return (
//     <form>
//       <div>
//         <label>Fecha:</label>
//         <input
//           type="date"
//           name="fecha"
//           value={formValues.fecha}
//           onChange={handlerInputChange}
//           placeholder="  Fecha..."
//         />
//       </div>
//       <div>
//         <label>Empresa:</label>
//         <input
//           type="text"
//           name="empresa"
//           value={formValues.empresa}
//           onChange={handlerInputChange}
//           placeholder="  Empresa..."
//         />
//       </div>
//       <div>
//         <label>Nit:</label>
//         <input
//           type="number"
//           name="nit"
//           value={formValues.nit}
//           onChange={handlerInputChange}
//           placeholder="  Nit..."
//         />
//       </div>
//       <div>
//         <label>Dirección:</label>
//         <input
//           type="text"
//           name="direccion"
//           value={formValues.direccion}
//           onChange={handlerInputChange}
//           placeholder="  direccion..."
//         />
//       </div>
//     </form>
//   );
// }

import React, { useState } from "react"; // Asegúrate de importar React y useState
import { useSelector, useDispatch } from "react-redux";
import {
  setFormCotizacion,
  setItems,
  setTotal,
} from "../../Store/Slices/cotizacionSlice";

export default function Cotizacion() {
  const dispatch = useDispatch();
  const formValues = useSelector((state) => state.cotizacion.value);
  const items = useSelector((state) => state.cotizacion.value.items);
  const total = useSelector((state) => state.cotizacion.value.total);

  const handlerInputChange = (event) => {
    const { name, value } = event.target;
    const updatedFormValues = { ...formValues, [name]: value };
    dispatch(setFormCotizacion(updatedFormValues));
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...items];
    const updatedItem = { ...updatedItems[index], [field]: value };
    updatedItem.subtotal = updatedItem.quantity * updatedItem.price;
    updatedItems[index] = updatedItem;
    dispatch(setItems(updatedItems));
  };

  const calculateTotal = () => {
    const totalAmount = items.reduce(
      (total, item) => total + item.quantity * item.price,
      0
    );
    dispatch(setTotal(totalAmount));
  };

  const addNewItem = () => {
    const newItem = { description: "", quantity: 0, price: 0 };
    dispatch(setItems([...items, newItem]));
  };

  return (
    <form>
      <div>
        <label>Fecha:</label>
        <input
          type="date"
          name="fecha"
          value={formValues.fecha}
          onChange={handlerInputChange}
          placeholder="  Fecha..."
        />
      </div>
      <div>
        <label>Empresa:</label>
        <input
          type="text"
          name="empresa"
          value={formValues.empresa}
          onChange={handlerInputChange}
          placeholder="  Empresa..."
        />
      </div>
      <div>
        <label>Nit:</label>
        <input
          type="number"
          name="nit"
          value={formValues.nit}
          onChange={handlerInputChange}
          placeholder="  Nit..."
        />
      </div>
      <div>
        <label>Dirección:</label>
        <input
          type="text"
          name="direccion"
          value={formValues.direccion}
          onChange={handlerInputChange}
          placeholder="  direccion..."
        />
      </div>

      <div>
        <button type="button" onClick={addNewItem}>
          Agregar Ítem
        </button>
        {items.map((item, index) => (
          <div key={index}>
            <input
              type="text"
              placeholder="Descripción"
              value={item.description}
              onChange={(e) => updateItem(index, "description", e.target.value)}
            />
            <input
              type="number"
              placeholder="Cantidad"
              value={item.quantity !== 0 ? item.quantity : ""}
              onChange={(e) => updateItem(index, "quantity", e.target.value)}
            />
            <input
              type="number"
              placeholder="Precio"
              value={item.price !== 0 ? item.price : ""}
              onChange={(e) => updateItem(index, "price", e.target.value)}
            />
            <p>{item.subtotal}</p>
          </div>
        ))}
        <button type="button" onClick={calculateTotal}>
          Calcular Total
        </button>
        <p>Total: {total}</p>
      </div>
    </form>
  );
}
