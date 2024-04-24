import { useSelector, useDispatch } from "react-redux";
import {
  setFormCuentaCobro,
  setItemsCc,
  setTotalCc,
} from "../../Store/Slices/cuentacobroSlice";

export default function CuentaCobro() {
  const dispatch = useDispatch();
  const formValues = useSelector((state) => state.cuentacobro.value);
  const items = useSelector((state) => state.cuentacobro.value.items);
  const total = useSelector((state) => state.cuentacobro.value.total);
  
  const handlerInputChange = (event) => {
    const { name, value } = event.target;
    const updatedFormValues = { ...formValues, [name]: value };
    dispatch(setFormCuentaCobro(updatedFormValues));
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...items];
    const updatedItem = { ...updatedItems[index], [field]: value };
    updatedItem.subtotal = updatedItem.quantity * updatedItem.price;
    updatedItems[index] = updatedItem;
    dispatch(setItemsCc(updatedItems));
  };

  const calculateTotal = () => {
    const totalAmount = items.reduce(
      (total, item) => total + item.quantity * item.price,
      0
    );
    dispatch(setTotalCc(totalAmount));
  };

  const addNewItem = () => {
    const newItem = { description: "", quantity: 0, price: 0 };
    dispatch(setItemsCc([...items, newItem]));
  };

const formatNit = (nit) => {
  const cleanNit = nit.replace(/[^\d-]/g, '');
  const soloDiez = cleanNit.substring(0, 11);
  const formattedNit = soloDiez.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return formattedNit;
};

  return (
    <form>
      <h1 style={{ color: "red" }}>Formulario Cuenta de Cobro</h1>
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
          type="text"
          name="nit"
         value={formatNit(formValues.nit)}
          onChange={handlerInputChange}
          placeholder="  Nit..."
        />
      </div>
      <div>
        <label>Obra: </label>
        <input
          type="text"
          name="obra"
          value={formValues.obra}
          onChange={handlerInputChange}
          placeholder="  Obra..."
        />
      </div>
      <div>
        <label>Por Concepto De: :</label>
        <input
          type="text"
          name="concepto"
          value={formValues.concepto}
          onChange={handlerInputChange}
          placeholder="  Concepto..."
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