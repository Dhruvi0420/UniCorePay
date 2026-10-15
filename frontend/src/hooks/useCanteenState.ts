import { useState } from "react";
import type {
  KitchenOrder,
  ChatMessage,
  Incident,
  SystemHealthState,
  SystemMetrics,
  CircuitState,
  PaymentMethod,
  OrderStatus,
} from "../types";
import { INITIAL_WALLET_BALANCE } from "../constants";

export function useCanteenState() {
  const [walletBalance, setWalletBalance] = useState(INITIAL_WALLET_BALANCE);
  const [circuitState, setCircuitState] = useState<CircuitState>("CLOSED");
  const [activeChaos, setActiveChaos] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalOrders: 3,
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

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "ai",
      content:
        "👋 Namaste! Main hun **UniCorePay AI Canteen Agent**!\n\nMujhe Hinglish ya English mein bata kya khayega:\n• \"2 masala dosa aur 1 coffee\"\n• \"4 samosa aur 2 chai\"\n• \"wallet balance check kar\"\n\nOrder process aur self-healing sab main handle karunga! 🚀",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [isProcessing, setIsProcessing] = useState(false);

  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrder[]>([
    {
      id: "ORD-101",
      tokenNumber: "#T-401",
      items: [
        { name: "Masala Dosa", qty: 2, price: 60, emoji: "🥞" },
        { name: "Cold Coffee", qty: 1, price: 50, emoji: "☕" },
      ],
      totalPrice: 170,
      paymentMethod: "upi",
      status: "preparing",
      time: "1:45 PM",
    },
    {
      id: "ORD-102",
      tokenNumber: "#T-402",
      items: [{ name: "Veg Biryani", qty: 1, price: 120, emoji: "🍚" }],
      totalPrice: 120,
      paymentMethod: "campus_wallet",
      status: "received",
      time: "1:48 PM",
    },
  ]);

  const [incidents, setIncidents] = useState<Incident[]>([
    {
      id: "INC-001",
      timestamp: new Date(Date.now() - 1000 * 60 * 3).toLocaleTimeString(),
      detected: "UPI Gateway latency exceeded 2500ms threshold",
      diagnosed: "Transient network spike on payment aggregator",
      actionTaken: "Exponential backoff retry succeeded on attempt 2 (same idempotency key)",
      recovered: true,
      rootCause: "Aggregator bank had temporary queue backlog. Resolved via exponential retry without double-charge.",
    },
  ]);

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(incidents[0] || null);

  // Send message & place order
  const sendMessage = (text: string) => {
    if (!text.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    setTimeout(() => {
      // Balance query
      if (/balance|wallet|kitna/i.test(text)) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "ai",
            content: `💰 Tera Campus Wallet balance hai: **₹${walletBalance.toFixed(2)}**\n\n(Yeh automatic fallback ke liye 100% ready hai agar UPI down ho!)`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        setIsProcessing(false);
        return;
      }

      // Menu query
      if (/menu/i.test(text)) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "ai",
            content: `📋 **Today's Canteen Menu:**\n🥞 Masala Dosa — ₹60\n🍛 Idli Sambar — ₹40\n☕ Cold Coffee — ₹50\n🍚 Veg Biryani — ₹120\n🌯 Paneer Roll — ₹80\n🔺 Samosa — ₹20\n🍵 Chai — ₹15\n🍜 Maggi — ₹35\n\nBata kya mangta hai? 😋`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        setIsProcessing(false);
        return;
      }

      // Order generation
      const newCounter = 400 + metrics.totalOrders + 1;
      const token = `#T-${newCounter}`;
      const isCircuitOpen = circuitState === "OPEN";
      const paymentUsed: PaymentMethod = isCircuitOpen ? "campus_wallet" : "upi";
      const totalAmount = 170;

      const healingNotes: string[] = [];
      if (isCircuitOpen) {
        healingNotes.push("Circuit Breaker OPEN ➔ Seamless Campus Wallet Fallback");
        setWalletBalance((prev) => Math.max(0, prev - totalAmount));
      } else {
        healingNotes.push("Exponential Backoff + Idempotency Key verified");
      }

      // Mid-payment crash recovery demonstration
      if (activeChaos === "mid_payment") {
        setActiveChaos(null);
        setMetrics((prev) => ({
          ...prev,
          totalOrders: prev.totalOrders + 1,
          autoRecoveries: prev.autoRecoveries + 1,
        }));

        const newInc: Incident = {
          id: `INC-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          detected: "Mid-payment crash: Money deducted but token generation interrupted",
          diagnosed: "Client disconnected before token confirmation write",
          actionTaken: "Reconciliation Worker detected orphaned state ➔ Issued token autonomously",
          recovered: true,
          rootCause: "Process killed mid-flight. Reconciliation worker verified payment transaction in ledger and auto-generated missing token.",
        };

        setIncidents((prev) => [newInc, ...prev]);
        setSelectedIncident(newInc);

        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "ai",
            content: `⚠️ **Glitched Order Auto-Repaired!**\n\nPaise deduct ho gaye the par server crash ho gaya tha.\n\n🔧 **Reconciliation Worker** ne detect karke tera token bacha liya!\n\n🎫 Token: **${token}**\n💰 Total: ₹${totalAmount}\n💳 Status: **100% Healed**`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            tokenNumber: token,
            orderSuccess: true,
          },
        ]);

        setKitchenOrders((prev) => [
          {
            id: `ORD-${Date.now()}`,
            tokenNumber: token,
            items: [
              { name: "Masala Dosa", qty: 2, price: 60, emoji: "🥞" },
              { name: "Cold Coffee", qty: 1, price: 50, emoji: "☕" },
            ],
            totalPrice: totalAmount,
            paymentMethod: paymentUsed,
            status: "received",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
          ...prev,
        ]);

        setIsProcessing(false);
        return;
      }

      // Standard successful order
      setMetrics((prev) => ({
        ...prev,
        totalOrders: prev.totalOrders + 1,
      }));

      setKitchenOrders((prev) => [
        {
          id: `ORD-${Date.now()}`,
          tokenNumber: token,
          items: [
            { name: "Masala Dosa", qty: 2, price: 60, emoji: "🥞" },
            { name: "Cold Coffee", qty: 1, price: 50, emoji: "☕" },
          ],
          totalPrice: totalAmount,
          paymentMethod: paymentUsed,
          status: "received",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
        ...prev,
      ]);

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "ai",
          content: `✅ **Order Confirmed!**\n\n🎫 Token Number: **${token}**\n📦 Items: 🥞 2x Masala Dosa, ☕ 1x Cold Coffee\n💰 Total: ₹${totalAmount}\n💳 Paid via: ${paymentUsed === "upi" ? "UPI Gateway" : "Campus Wallet (Fallback)"}\n\n🔧 *Self-Healing:* ${healingNotes.join(" → ")}\n\nKitchen screen pe order chala gaya hai!`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          tokenNumber: token,
          orderSuccess: true,
        },
      ]);

      setIsProcessing(false);
    }, 600);
  };

  // Chaos Monkey triggers
  const triggerChaos = (type: string) => {
    setActiveChaos(type);

    if (type === "upi_timeout") {
      setHealth((h) => ({ ...h, upiGateway: "down" }));
      setCircuitState("OPEN");
      setMetrics((m) => ({
        ...m,
        failuresInjected: m.failuresInjected + 1,
        autoRecoveries: m.autoRecoveries + 1,
      }));

      const newInc: Incident = {
        id: `INC-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        detected: "💥 CHAOS: Primary UPI Gateway timed out (100% packet drop)",
        diagnosed: "Gateway dead — 3 consecutive failures exceeded threshold",
        actionTaken: "Circuit Breaker TRIPPED to OPEN ➔ Redirecting all traffic to Campus Wallet",
        recovered: true,
        rootCause: "Primary gateway simulated failure. Circuit breaker prevented cascading failures by switching to local Campus Wallet balance.",
      };
      setIncidents((prev) => [newInc, ...prev]);
      setSelectedIncident(newInc);
    } else if (type === "mid_payment") {
      setMetrics((m) => ({ ...m, failuresInjected: m.failuresInjected + 1 }));
      const newInc: Incident = {
        id: `INC-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        detected: "⚡ CHAOS ARMED: Mid-payment transaction corruption armed",
        diagnosed: "Next incoming payment will crash between debit and token issue",
        actionTaken: "Self-Repairing Reconciliation Worker armed on standby",
        recovered: false,
        rootCause: "Testing orphaned payment recovery. Reconciliation worker will auto-match debited transaction and grant token.",
      };
      setIncidents((prev) => [newInc, ...prev]);
      setSelectedIncident(newInc);
    } else if (type === "traffic_spike") {
      setHealth((h) => ({ ...h, database: "degraded" }));
      setMetrics((m) => ({
        ...m,
        failuresInjected: m.failuresInjected + 1,
        autoRecoveries: m.autoRecoveries + 1,
      }));
      const newInc: Incident = {
        id: `INC-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        detected: "🌊 CHAOS: Canteen Rush — 200 req/s simulated traffic spike",
        diagnosed: "Incoming request burst saturating database connection pool",
        actionTaken: "Rate limiter engaged ➔ Token bucket throttling + priority queue for active orders",
        recovered: true,
        rootCause: "Traffic burst throttled safely via rate limiter without server crash.",
      };
      setIncidents((prev) => [newInc, ...prev]);
      setSelectedIncident(newInc);

      setTimeout(() => {
        setHealth((h) => ({ ...h, database: "healthy" }));
        setActiveChaos(null);
      }, 5000);
    } else if (type === "kill_backend") {
      setHealth({
        aiAgent: "down",
        upiGateway: "down",
        campusWallet: "down",
        database: "down",
      });
      setMetrics((m) => ({
        ...m,
        failuresInjected: m.failuresInjected + 1,
        autoRecoveries: m.autoRecoveries + 1,
      }));
      const newInc: Incident = {
        id: `INC-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        detected: "💀 CHAOS: Backend process terminated by SIGKILL",
        diagnosed: "Server heartbeat lost — complete process freeze",
        actionTaken: "Watchdog timer tripped ➔ Auto-restarting container and reloading state",
        recovered: false,
        rootCause: "Process killed. Watchdog daemon detected missed heartbeats and spawned fresh worker.",
      };
      setIncidents((prev) => [newInc, ...prev]);
      setSelectedIncident(newInc);

      setTimeout(() => {
        setHealth({
          aiAgent: "healthy",
          upiGateway: "healthy",
          campusWallet: "healthy",
          database: "healthy",
        });
        setActiveChaos(null);
        setIncidents((prev) =>
          prev.map((inc) => (inc.id === newInc.id ? { ...inc, recovered: true } : inc))
        );
      }, 4000);
    }
  };

  const resetAll = () => {
    setActiveChaos(null);
    setCircuitState("CLOSED");
    setHealth({
      aiAgent: "healthy",
      upiGateway: "healthy",
      campusWallet: "healthy",
      database: "healthy",
    });
    setWalletBalance(INITIAL_WALLET_BALANCE);
    setMetrics({ totalOrders: 3, failuresInjected: 0, autoRecoveries: 0, doubleChargesPrevented: 0 });
    setKitchenOrders([
      { id: "ORD-101", tokenNumber: "#T-401", items: [{ name: "Masala Dosa", qty: 2, price: 60, emoji: "🥞" }, { name: "Cold Coffee", qty: 1, price: 50, emoji: "☕" }], totalPrice: 170, paymentMethod: "upi", status: "preparing", time: "1:45 PM" },
      { id: "ORD-102", tokenNumber: "#T-402", items: [{ name: "Veg Biryani", qty: 1, price: 120, emoji: "🍚" }], totalPrice: 120, paymentMethod: "campus_wallet", status: "received", time: "1:48 PM" },
    ]);
    setIncidents([]);
    setSelectedIncident(null);
    setMessages([
      {
        id: "reset",
        role: "system",
        content: "System state restored to baseline.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const advanceKitchenStatus = (orderId: string) => {
    setKitchenOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        const nextStatus: OrderStatus =
          order.status === "received"
            ? "preparing"
            : order.status === "preparing"
            ? "ready"
            : "completed";
        return { ...order, status: nextStatus };
      })
    );
  };

  return {
    walletBalance,
    circuitState,
    activeChaos,
    metrics,
    health,
    messages,
    isProcessing,
    kitchenOrders,
    incidents,
    selectedIncident,
    setSelectedIncident,
    sendMessage,
    triggerChaos,
    resetAll,
    advanceKitchenStatus,
  };
}
