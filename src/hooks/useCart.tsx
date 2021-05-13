import { createContext, ReactNode, useContext, useState } from "react";
import { toast, ToastOptions } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);
const toastOptions: ToastOptions = {
  position: "top-right",
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
};

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart) as Product[];
    }

    return [];
  });

  const getProductInfo = async (id: number) => {
    return await api.get(`/products/${id}`).then((response) => response.data);
  };

  const getProductFromCart = (id: number): Product => {
    return cart.find((product) => product.id === id) as Product;
  };

  const getOthersProductsFromCart = (excludeId: number): Product[] => {
    return cart.filter((product) => product.id !== excludeId) as Product[];
  };

  const updateProductFromCart = (updatedProduct: Product): Product[] => {
    return cart.map((product) => {
      if (product.id === updatedProduct.id) {
        return updatedProduct;
      } else {
        return product;
      }
    });
  };

  const getItemStock = async (productId: number) => {
    return await api
      .get(`/stock/${productId}`)
      .then((response) => response.data as Stock);
  };

  const updateCart = (newCart: Product[]) => {
    setCart(newCart);
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
  };

  const addProduct = async (productId: number) => {
    try {
      const cartItem = getProductFromCart(productId);
      const itemStock = await getItemStock(productId);
      const item = (await getProductInfo(productId)) as Product;

      if (!item.id) {
        throw new Error();
      }

      if (cartItem) {
        if (cartItem.amount + 1 > itemStock.amount) {
          throw new Error("Quantidade solicitada fora de estoque");
        }

        const updatedCart = updateProductFromCart({
          ...cartItem,
          amount: cartItem.amount + 1,
        });

        updateCart(updatedCart);
      } else {
        if (1 > itemStock.amount) {
          throw new Error("Quantidade solicitada fora de estoque");
        }

        updateCart([
          ...cart,
          {
            ...item,
            amount: 1,
          },
        ]);
      }
    } catch (error: any) {
      if (error.message === "Quantidade solicitada fora de estoque") {
        toast.error("Quantidade solicitada fora de estoque");
      } else {
        toast.error("Erro na adição do produto");
      }
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = getOthersProductsFromCart(productId);
      const item = getProductFromCart(productId);

      if (!item) throw new Error();

      updateCart(newCart);
    } catch {
      return toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const item = getProductFromCart(productId);
      if (amount <= 0) throw new Error();

      const itemStock = await getItemStock(productId);

      if (!itemStock) throw new Error();

      if (amount > itemStock.amount)
        throw new Error("Quantidade solicitada fora de estoque");

      const updatedCart = updateProductFromCart({ ...item, amount });

      updateCart(updatedCart);
    } catch (error: any) {
      if (error.message === "Quantidade solicitada fora de estoque") {
        toast.error("Quantidade solicitada fora de estoque");
      } else {
        toast.error("Erro na alteração de quantidade do produto");
      }
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
