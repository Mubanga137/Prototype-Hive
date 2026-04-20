// Per-store guest cart persisted to localStorage.
// One cart per store_id — switching stores does NOT clear other carts.
// Services are NOT cart-eligible (they require a date/notes per booking)
// so the cart only accepts physical / digital products.

import { useCallback, useEffect, useState } from "react";

export interface CartLine {
  offer_id: number;
  item_name: string;
  unit_price: number;
  image_url?: string | null;
  quantity: number;
  item_type?: string | null;
}

const KEY = (storeId: number | string) => `hive.cart.v1.${storeId}`;

const read = (storeId: number | string): CartLine[] => {
  try {
    const raw = localStorage.getItem(KEY(storeId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const write = (storeId: number | string, lines: CartLine[]) => {
  try {
    if (lines.length === 0) localStorage.removeItem(KEY(storeId));
    else localStorage.setItem(KEY(storeId), JSON.stringify(lines));
    // Cross-tab + same-tab subscribers
    window.dispatchEvent(new CustomEvent("hive-cart-changed", { detail: { storeId } }));
  } catch {
    /* ignore quota errors */
  }
};

export const useStoreCart = (storeId: number | string | null | undefined) => {
  const [lines, setLines] = useState<CartLine[]>([]);

  // Hydrate + subscribe
  useEffect(() => {
    if (storeId == null) {
      setLines([]);
      return;
    }
    setLines(read(storeId));

    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || String(detail.storeId) === String(storeId)) {
        setLines(read(storeId));
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY(storeId)) setLines(read(storeId));
    };
    window.addEventListener("hive-cart-changed", onChange as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("hive-cart-changed", onChange as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [storeId]);

  const addItem = useCallback(
    (line: Omit<CartLine, "quantity"> & { quantity?: number }) => {
      if (storeId == null) return;
      const qty = Math.max(1, line.quantity ?? 1);
      const current = read(storeId);
      const idx = current.findIndex((l) => l.offer_id === line.offer_id);
      if (idx >= 0) {
        current[idx] = { ...current[idx], quantity: Math.min(99, current[idx].quantity + qty) };
      } else {
        current.push({
          offer_id: line.offer_id,
          item_name: line.item_name,
          unit_price: line.unit_price,
          image_url: line.image_url ?? null,
          item_type: line.item_type ?? "physical",
          quantity: qty,
        });
      }
      write(storeId, current);
    },
    [storeId]
  );

  const setQuantity = useCallback(
    (offer_id: number, quantity: number) => {
      if (storeId == null) return;
      const current = read(storeId);
      const next = current
        .map((l) => (l.offer_id === offer_id ? { ...l, quantity: Math.max(0, Math.min(99, quantity)) } : l))
        .filter((l) => l.quantity > 0);
      write(storeId, next);
    },
    [storeId]
  );

  const removeItem = useCallback(
    (offer_id: number) => {
      if (storeId == null) return;
      const next = read(storeId).filter((l) => l.offer_id !== offer_id);
      write(storeId, next);
    },
    [storeId]
  );

  const clear = useCallback(() => {
    if (storeId == null) return;
    write(storeId, []);
  }, [storeId]);

  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
  const subtotal = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);

  return { lines, addItem, setQuantity, removeItem, clear, itemCount, subtotal };
};
