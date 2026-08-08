import cartReducer, {
  addToCart,
  removeFromCart,
  updateQty,
  updateDays,
  clearCart,
} from "./cartSlice";

// Pruebas del carrito. Un reducer es una función pura: recibe el estado y una
// acción, y devuelve el estado nuevo sin mutar el anterior.

describe("cartSlice", () => {
  it("addToCart agrega una línea nueva con su lineId", () => {
    const estado = cartReducer(undefined, addToCart({ id: "a", quantity: 2, days: 3 }));
    expect(estado.items).toHaveLength(1);
    expect(estado.items[0].lineId).toBe("a");
    expect(estado.items[0].quantity).toBe(2);
  });

  it("addToCart sobre la misma línea suma cantidad y actualiza los días", () => {
    let estado = cartReducer(undefined, addToCart({ id: "a", quantity: 2, days: 3 }));
    estado = cartReducer(estado, addToCart({ id: "a", quantity: 1, days: 5 }));
    expect(estado.items).toHaveLength(1);
    expect(estado.items[0].quantity).toBe(3);
    expect(estado.items[0].days).toBe(5);
  });

  it("dos variantes del mismo equipo son dos líneas distintas", () => {
    let estado = cartReducer(
      undefined,
      addToCart({ id: "a", varianteSeleccionada: "rojo", quantity: 1, days: 1 }),
    );
    estado = cartReducer(
      estado,
      addToCart({ id: "a", varianteSeleccionada: "azul", quantity: 1, days: 1 }),
    );
    expect(estado.items).toHaveLength(2);
  });

  it("removeFromCart quita la línea por su lineId", () => {
    const inicial = { items: [{ id: "a", lineId: "a", quantity: 1 }] };
    const estado = cartReducer(inicial, removeFromCart("a"));
    expect(estado.items).toHaveLength(0);
  });

  it("updateQty cambia la cantidad, pero ignora valores <= 0", () => {
    const inicial = { items: [{ lineId: "a", quantity: 1 }] };
    expect(cartReducer(inicial, updateQty({ lineId: "a", quantity: 5 })).items[0].quantity).toBe(5);
    expect(cartReducer(inicial, updateQty({ lineId: "a", quantity: 0 })).items[0].quantity).toBe(1);
  });

  it("updateDays cambia los días, pero ignora valores <= 0", () => {
    const inicial = { items: [{ lineId: "a", days: 2 }] };
    expect(cartReducer(inicial, updateDays({ lineId: "a", days: 4 })).items[0].days).toBe(4);
    expect(cartReducer(inicial, updateDays({ lineId: "a", days: 0 })).items[0].days).toBe(2);
  });

  it("clearCart vacía el carrito", () => {
    const inicial = { items: [{ lineId: "a" }] };
    expect(cartReducer(inicial, clearCart()).items).toEqual([]);
  });
});
