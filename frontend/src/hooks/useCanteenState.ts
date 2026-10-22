import { useState, useEffect, useCallback } from "react";
import type {
  FoodItem,
  OrderItem,
  KitchenOrder,
  ChatMessage,
  Incident,
  SystemHealthState,
  SystemMetrics,
  CircuitState,
  PaymentMethod,
  OrderStatus,
  WalletTransaction,
} from "../types";

const STUDENT_ID = "STU-2026-001";

export function useCanteenState() {
  // Real dynamic states loaded from backend (NO DEMO DATA)
  const [menu, setMenu] = useState<FoodItem[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0.0);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrder[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [circuitState, setCircuitState] = useState<CircuitState>("CLOSED");
  const [activeChaos, setActiveChaos] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalOrders: 0,
    failuresInjected: 0,
    autoRecoveries: 0,
    doubleChargesPrevented: 0,
  });

  const [health, setHealth] = useState<SystemHealthState>({
    aiAgent: "healthy",
    upiGateway: "healthy",
    campusWallet: "healthy",
    database: "healthy",
  });

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "ai",
      content:
        "👋 Namaste! Main hun **UniCorePay AI Canteen Agent**!\n\nAap Admin desk se menu mein items add kar sakte ho aur wallet recharge kar sakte ho.\n\nMujhe batao kya order karna hai ya pucho:\n• \"menu dikha\"\n• \"wallet balance check kar\"",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  // ============================================================
  // BACKEND SYNC FUNCTIONS
  // ============================================================

  const fetchMenu = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/menu");
      if (res.ok) {
        const data: FoodItem[] = await res.json();
        setMenu(data);
      }
    } catch (err) {
      console.warn("Could not fetch menu from backend:", err);
    }
  }, []);

  const fetchWallet = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/wallet/${STUDENT_ID}`);
      if (res.ok) {
        const data = await res.json();
        setWalletBalance(data.balance ?? 0.0);
        setWalletTransactions(data.transactions ?? []);
      }
    } catch (err) {
      console.warn("Could not fetch wallet:", err);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/orders");
      if (res.ok) {
        const data = await res.json();
        // Transform backend order to KitchenOrder
        const transformed: KitchenOrder[] = data.map((o: any) => {
          const rawCreated = o.created_at || "";
          const utcString = rawCreated.includes("Z") || rawCreated.includes("+")
            ? rawCreated
            : rawCreated + "Z";
          const orderDate = new Date(utcString);
          const timeFormatted = isNaN(orderDate.getTime())
            ? new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
            : orderDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });

          return {
            id: o.id,
            tokenNumber: o.token_number || `#T-${o.id.slice(-4)}`,
            items: o.items || [],
            totalPrice: o.total_price || 0,
            paymentMethod: o.payment_method || "upi",
            status: (o.prep_status || "received") as OrderStatus,
            time: timeFormatted,
          };
        });
        setKitchenOrders(transformed);
      }
    } catch (err) {
      console.warn("Could not fetch orders:", err);
    }
  }, []);

  const fetchSystemStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/system/status");
      if (res.ok) {
        const data = await res.json();
        setCircuitState(data.circuit_state || "CLOSED");
        setActiveChaos(data.active_chaos || null);
        if (data.metrics) setMetrics(data.metrics);
        if (data.health) {
          setHealth({
            aiAgent: data.health.aiAgent || data.health.ai_agent || "healthy",
            upiGateway: data.health.upiGateway || data.health.upi_gateway || "healthy",
            campusWallet: data.health.campusWallet || data.health.campus_wallet || "healthy",
            database: data.health.database || "healthy",
          });
        }
      }

      const incRes = await fetch("/api/v1/system/incidents");
      if (incRes.ok) {
        const incData = await incRes.json();
        const mapped: Incident[] = incData.map((inc: any) => ({
          id: inc.id,
          timestamp: inc.timestamp,
          detected: inc.detected,
          diagnosed: inc.diagnosed,
          actionTaken: inc.action_taken,
          recovered: Boolean(inc.recovered),
          rootCause: inc.root_cause_explanation || "",
          ttdMs: inc.ttd_ms || 120,
          ttrMs: inc.ttr_ms || 340,
          severity: inc.severity || "HIGH",
        }));
        setIncidents(mapped);
        if (mapped.length > 0 && !selectedIncident) {
          setSelectedIncident(mapped[0]);
        }
      }
    } catch (err) {
      console.warn("Could not fetch system status:", err);
    }
  }, [selectedIncident]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchMenu(), fetchWallet(), fetchOrders(), fetchSystemStatus()]);
  }, [fetchMenu, fetchWallet, fetchOrders, fetchSystemStatus]);

  // Initial load on mount & periodic sync
  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 4000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  // ============================================================
  // CART ACTIONS (STUDENT)
  // ============================================================

  const addToCart = (food: FoodItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.name === food.name);
      if (existing) {
        return prev.map((item) =>
          item.name === food.name ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { name: food.name, qty: 1, price: food.price, emoji: food.emoji }];
    });
  };

  const removeFromCart = (foodName: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.name === foodName);
      if (!existing) return prev;
      if (existing.qty > 1) {
        return prev.map((item) =>
          item.name === foodName ? { ...item, qty: item.qty - 1 } : item
        );
      }
      return prev.filter((item) => item.name !== foodName);
    });
  };

  const clearCart = () => setCart([]);

  // ============================================================
  // PLACE ORDER (BACKEND API INTEGRATION)
  // ============================================================

  const placeOrder = async (preferredPayment: PaymentMethod = "upi"): Promise<boolean> => {
    if (cart.length === 0 || isProcessing) return false;

    setIsProcessing(true);
    try {
      const payload = {
        student_id: STUDENT_ID,
        items: cart,
        payment_method: preferredPayment,
        idempotency_key: `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };

      const res = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        // Show error message
        const errMsg = data.detail || "Order failed to place.";
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-err-${Date.now()}`,
            role: "ai",
            content: `❌ **Order Unsuccessful!**\n\n${errMsg}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        setIsProcessing(false);
        return false;
      }

      // Success
      const orderToken = data.token_number || `#T-${data.id.slice(-4)}`;
      const itemsList = cart.map((i) => `${i.emoji} ${i.qty}x ${i.name}`).join(", ");
      const notes = data.self_healing_notes?.length
        ? `\n\n🔧 *Self-Healing:* ${data.self_healing_notes.join(" ➔ ")}`
        : "";

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "ai",
          content: `✅ **Order Confirmed!**\n\n🎫 Token Number: **${orderToken}**\n📦 Items: ${itemsList}\n💰 Total: **₹${data.total_price.toFixed(2)}**\n💳 Paid via: **${data.payment_method === "upi" ? "UPI Gateway" : "Campus Wallet"}**${notes}\n\nKitchen screen pe order bhej diya gaya hai! 🍳`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          tokenNumber: orderToken,
          orderSuccess: true,
        },
      ]);

      clearCart();
      await Promise.all([fetchWallet(), fetchOrders(), fetchSystemStatus()]);
      setIsProcessing(false);
      return true;
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: "ai",
          content: `❌ **Network Error:** Server se connect nahi ho paya. Please ensure backend is running.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setIsProcessing(false);
      return false;
    }
  };

  // ============================================================
  // CONVERSATIONAL ASSISTANT (CHAT)
  // ============================================================

  const sendMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    const lower = text.toLowerCase();

    // 1. Balance query
    if (/balance|wallet|paisa|kitna/i.test(lower)) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "ai",
          content: `💰 Aapka Campus Wallet balance hai: **₹${walletBalance.toFixed(2)}**\n\n(Yeh automatic fallback ke liye 100% ready hai agar UPI down ho!)`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setIsProcessing(false);
      return;
    }

    // 2. Menu query
    if (/menu|items|khana|kya hai/i.test(lower)) {
      if (menu.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "ai",
            content: `📋 **Canteen Menu abhi khali hai!**\n\nKitchen Desk (Admin portal) se dishes add karein, fir yahan dikhengi! ✨`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else {
        const menuList = menu
          .map((m) => `${m.emoji} **${m.name}** — ₹${m.price.toFixed(2)} (${m.available ? "Available" : "Sold Out"})`)
          .join("\n");
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "ai",
            content: `📋 **Today's Live Canteen Menu:**\n\n${menuList}\n\nKya khana pasand karoge? Just add to cart ya mujhe bolo! 😋`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
      setIsProcessing(false);
      return;
    }

    // 3. Search item in live menu and add to cart
    const matchedItem = menu.find((item) => lower.includes(item.name.toLowerCase()));
    if (matchedItem) {
      if (!matchedItem.available) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "ai",
            content: `⚠️ Sorry! **${matchedItem.name}** abhi sold out hai. Dusra item try karo!`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        setIsProcessing(false);
        return;
      }

      // Add to cart
      addToCart(matchedItem);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "ai",
          content: `🛒 **${matchedItem.emoji} ${matchedItem.name}** tray mein add kar diya hai (₹${matchedItem.price.toFixed(2)})!\n\nAap sidebar se **"Place Order"** button dabakar order confirm kar sakte ho.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setIsProcessing(false);
      return;
    }

    // Default guidance
    setMessages((prev) => [
      ...prev,
      {
        id: `ai-${Date.now()}`,
        role: "ai",
        content: `🤔 Samjha nahi! Try karo:\n• *"menu dikha"*\n• *"wallet balance check kar"*\n• Ya menu card par **"Add to tray"** click karo!`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setIsProcessing(false);
  };

  // ============================================================
  // ADMIN ACTIONS (FOOD ITEM CRUD & WALLET TOPUP)
  // ============================================================

  const addMenuItem = async (item: {
    name: string;
    description: string;
    price: number;
    emoji: string;
    category: string;
  }): Promise<boolean> => {
    try {
      const res = await fetch("/api/v1/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, available: true }),
      });
      if (res.ok) {
        await fetchMenu();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to add menu item:", err);
      return false;
    }
  };

  const deleteMenuItem = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/v1/menu/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchMenu();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to delete menu item:", err);
      return false;
    }
  };

  const toggleMenuItemAvailability = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/v1/menu/${id}/toggle`, { method: "PATCH" });
      if (res.ok) {
        await fetchMenu();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to toggle availability:", err);
      return false;
    }
  };

  const topupWallet = async (amount: number, note?: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/v1/wallet/${STUDENT_ID}/topup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, note: note || "Admin Top-up" }),
      });
      if (res.ok) {
        const data = await res.json();
        setWalletBalance(data.balance);
        setWalletTransactions(data.transactions || []);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to topup wallet:", err);
      return false;
    }
  };

  const setWalletBalanceAdmin = async (newBalance: number, note?: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/v1/wallet/${STUDENT_ID}/set-balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ balance: newBalance, note: note || "Admin Direct Set" }),
      });
      if (res.ok) {
        const data = await res.json();
        setWalletBalance(data.balance);
        setWalletTransactions(data.transactions || []);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to set wallet balance:", err);
      return false;
    }
  };

  // Kitchen advances status
  const advanceKitchenStatus = async (orderId: string) => {
    const order = kitchenOrders.find((o) => o.id === orderId);
    if (!order) return;
    const nextStatus: OrderStatus =
      order.status === "received"
        ? "preparing"
        : order.status === "preparing"
        ? "ready"
        : "completed";

    try {
      const res = await fetch(`/api/v1/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prep_status: nextStatus }),
      });
      if (res.ok) {
        await fetchOrders();
      }
    } catch (err) {
      console.error("Failed to advance status:", err);
    }
  };

  const deleteOrder = async (orderId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/v1/orders/${orderId}`, { method: "DELETE" });
      if (res.ok) {
        await fetchOrders();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to delete order:", err);
      return false;
    }
  };

  const clearAllOrders = async (scope: string = "all"): Promise<boolean> => {
    try {
      const res = await fetch(`/api/v1/orders?scope=${scope}`, { method: "DELETE" });
      if (res.ok) {
        await fetchOrders();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to clear orders:", err);
      return false;
    }
  };

  // Chaos Monkey triggers
  const triggerChaos = async (type: string) => {
    try {
      const res = await fetch("/api/v1/system/chaos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: type }),
      });
      if (res.ok) {
        await fetchSystemStatus();
      }
    } catch (err) {
      console.error("Failed to trigger chaos:", err);
    }
  };

  const resetAll = async () => {
    try {
      await fetch("/api/v1/system/reset", { method: "POST" });
      await Promise.all([fetchSystemStatus(), fetchOrders()]);
      setMessages([
        {
          id: "reset",
          role: "system",
          content: "System state and incidents restored to baseline.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err) {
      console.error("Failed to reset:", err);
    }
  };

  return {
    // Menu & Cart
    menu,
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    placeOrder,
    addMenuItem,
    deleteMenuItem,
    toggleMenuItemAvailability,

    // Wallet
    walletBalance,
    walletTransactions,
    topupWallet,
    setWalletBalanceAdmin,

    // Kitchen & Orders
    kitchenOrders,
    advanceKitchenStatus,
    deleteOrder,
    clearAllOrders,

    // SRE & Chaos
    circuitState,
    activeChaos,
    metrics,
    health,
    incidents,
    selectedIncident,
    setSelectedIncident,
    triggerChaos,
    resetAll,

    // Chat & State
    messages,
    isProcessing,
    sendMessage,
    refreshAll,
  };
}
