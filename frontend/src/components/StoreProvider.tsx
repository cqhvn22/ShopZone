"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type { CartLine, Product, User } from "@/lib/types";
type Store = {
  cart: CartLine[];
  favorites: string[];
  user: User | null;
  ready: boolean;
  toast: string;
  add: (p: Product, sku?: string, qty?: number) => void;
  quantity: (sku: string, qty: number) => void;
  clear: () => void;
  toggleFavorite: (id: string) => void;
  notify: (text: string) => void;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]),
    [favorites, setFavorites] = useState<string[]>([]),
    [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [toast, setToast] = useState("");
  async function refreshSession() {
    try {
      const r = await fetch("/api/session", { cache: "no-store" });
      const body = await r.json();
      setUser(body.user || null);
    } catch {
      setUser(null);
    }
  }
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("sz-cart") || "[]");
      if (Array.isArray(raw))
        setCart(
          raw.filter(
            (x) =>
              x &&
              typeof x.sku === "string" &&
              Number.isInteger(x.quantity) &&
              x.quantity > 0 &&
              x.quantity <= 10000 &&
              Number.isFinite(x.price) &&
              x.price >= 0,
          ),
        );
      const saved = JSON.parse(localStorage.getItem("sz-favorites") || "[]");
      if (Array.isArray(saved))
        setFavorites(saved.filter((x) => typeof x === "string"));
    } catch {}
    setReady(true);
    void refreshSession();
  }, []);
  useEffect(() => {
    if (ready) {
      localStorage.setItem("sz-cart", JSON.stringify(cart));
      localStorage.setItem("sz-favorites", JSON.stringify(favorites));
    }
  }, [cart, favorites, ready]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  function add(p: Product, sku?: string, qty = 1) {
    const variant = p.variants.find((v) => v.active && (!sku || v.sku === sku));
    if (!variant) return;
    setCart((lines) => {
      const existing = lines.find((l) => l.sku === variant.sku);
      if (existing)
        return lines.map((l) =>
          l.sku === variant.sku
            ? { ...l, quantity: Math.min(10000, l.quantity + qty) }
            : l,
        );
      return [
        ...lines,
        {
          sku: variant.sku,
          productId: p.id,
          slug: p.slug,
          name: p.name,
          image: p.images[0] || "/images/product-placeholder.svg",
          price: Number(variant.price),
          quantity: qty,
        },
      ];
    });
    setToast("Đã thêm sản phẩm vào giỏ hàng");
  }
  function quantity(sku: string, qty: number) {
    setCart((lines) =>
      qty <= 0
        ? lines.filter((l) => l.sku !== sku)
        : lines.map((l) =>
            l.sku === sku
              ? {
                  ...l,
                  quantity: Math.min(10000, Math.max(1, Math.floor(qty))),
                }
              : l,
          ),
    );
  }
  function toggleFavorite(id: string) {
    setFavorites((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }
  async function logout() {
    await fetch("/api/session", { method: "DELETE" });
    setUser(null);
    setToast("Đã đăng xuất");
  }
  return (
    <Context.Provider
      value={{
        cart,
        favorites,
        user,
        ready,
        toast,
        add,
        quantity,
        clear: () => setCart([]),
        toggleFavorite,
        notify: setToast,
        refreshSession,
        logout,
      }}
    >
      {children}
      {toast && (
        <div className="toast" role="status">
          <span>✓</span>
          {toast}
        </div>
      )}
    </Context.Provider>
  );
}
export function useStore() {
  const store = useContext(Context);
  if (!store) throw Error("StoreProvider is missing");
  return store;
}
