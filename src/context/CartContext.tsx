import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiDelete, apiGet, apiPost } from '../api/client';
import { useAuth } from './AuthContext';

export interface CartItem {
  cartItemId: number;
  jewelryId: number;
  name: string;
  category: string;
  imageUrl: string | null;
  status: string;
  silverWeightGrams: number;
  makingCharge: number;
  price: number;
}

interface CartContextValue {
  items: CartItem[];
  loading: boolean;
  subtotal: number;
  addToCart: (jewelryId: number) => Promise<void>;
  removeFromCart: (jewelryId: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  // Starts true so consumers can tell "not fetched yet" apart from "genuinely empty" —
  // otherwise a page that redirects on an empty cart (e.g. Checkout) can fire before
  // the first fetch resolves, especially right after auth itself resolves.
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const data = await apiGet('/cart');
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    refresh();
  }, [user, authLoading, refresh]);

  const addToCart = async (jewelryId: number) => {
    await apiPost('/cart', { jewelryId });
    await refresh();
  };

  const removeFromCart = async (jewelryId: number) => {
    await apiDelete(`/cart/${jewelryId}`);
    await refresh();
  };

  const subtotal = items.reduce((sum, it) => sum + it.price, 0);

  return (
    <CartContext.Provider value={{ items, loading, subtotal, addToCart, removeFromCart, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
