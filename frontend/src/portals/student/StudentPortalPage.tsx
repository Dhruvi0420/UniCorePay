import { useState } from "react";
import { Clock, RotateCcw, ShieldCheck } from "lucide-react";
import { useCanteen } from "../../context/CanteenContext";
import { PaytmPaymentModal } from "../../components/payment/PaytmPaymentModal";
import type { PaymentMethod, KitchenOrder } from "../../types";

export function StudentPortalPage() {
  const {
    menu,
    cart,
    addToCart,
    removeFromCart,
    placeOrder,
    walletBalance,
    topupWallet,
    circuitState,
    activeChaos,
    messages,
    isProcessing,
    kitchenOrders,
    sendMessage,
  } = useCanteen();

  const [input, setInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeTab, setActiveTab] = useState<"menu" | "history">("menu");
  const [paymentChoice, setPaymentChoice] = useState<PaymentMethod>("upi");
  const [isPaytmModalOpen, setIsPaytmModalOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    sendMessage(input.trim());
    setInput("");
  };

  // Derive dynamic categories from current menu items
  const menuCategories = ["All", ...Array.from(new Set(menu.map((item) => item.category)))];

  const filteredFoods =
    selectedCategory === "All"
      ? menu
      : menu.filter((item) => item.category === selectedCategory);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const activeOrders = kitchenOrders.filter((o) => o.status !== "completed");
  const latestOrder = activeOrders[0];

  const sortedOrders = [...kitchenOrders].sort((a, b) => {
    const tA = new Date(a.createdAt || 0).getTime();
    const tB = new Date(b.createdAt || 0).getTime();
    return tB - tA;
  });

  const handleReorder = (order: KitchenOrder) => {
    order.items.forEach((item) => {
      const menuItem = menu.find((m) => m.name === item.name);
      addToCart({
        id: menuItem?.id || item.name,
        name: item.name,
        price: item.price,
        emoji: item.emoji || menuItem?.emoji || "🍽️",
        description: menuItem?.description || "",
        category: menuItem?.category || "Meals",
        available: true,
      });
    });
    setActiveTab("menu");
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isProcessing) return;
    if (paymentChoice === "upi") {
      setIsPaytmModalOpen(true);
    } else {
      await placeOrder("campus_wallet");
    }
  };

  return (
    <main className="student-page" id="top">
      <section className="student-intro">
        <div>
          <p className="eyebrow">The campus kitchen · live ordering</p>
          <h1 className="display-title">
            Good food,
            <br />
            <em>on your time.</em>
          </h1>
        </div>
        <p className="intro-copy">
          Select items from the live canteen menu, pay via UPI or Campus Wallet, and track your kitchen token in real time.
        </p>
      </section>

      <section className="menu-layout">
        <div>
          <div className="menu-header">
            <div>
              <h2 className="section-title">
                {activeTab === "menu" ? "Today’s Menu" : "Previous Orders"}
              </h2>
              <p className="menu-subtitle">
                {activeTab === "menu"
                  ? "Fresh canteen dishes prepared live"
                  : `Your past food orders & kitchen tokens (${kitchenOrders.length})`}
              </p>
            </div>

            <div className="category-tabs">
              <button
                type="button"
                className={`category-tab ${activeTab === "menu" ? "active" : ""}`}
                onClick={() => setActiveTab("menu")}
              >
                🍽️ Menu
              </button>
              <button
                type="button"
                className={`category-tab ${activeTab === "history" ? "active" : ""}`}
                onClick={() => setActiveTab("history")}
              >
                🕒 Previous Orders
                {kitchenOrders.length > 0 && (
                  <span className="order-count-pill">{kitchenOrders.length}</span>
                )}
              </button>
            </div>
          </div>

          {activeTab === "menu" ? (
            <>
              {/* Compact Sub-Category Filter if menu has multiple categories */}
              {menuCategories.length > 2 && (
                <div className="menu-subfilters">
                  <span className="subfilter-label">Filter:</span>
                  {menuCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`subfilter-btn ${selectedCategory === cat ? "active" : ""}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {menu.length === 0 ? (
                <div className="empty-panel-box" style={{ padding: "60px 20px" }}>
                  <span style={{ fontSize: "44px" }}>🍳</span>
                  <h3 style={{ margin: "14px 0 6px" }}>Canteen Menu is Currently Empty</h3>
                  <p>
                    No dishes have been added yet. Switch to the <b>Kitchen Desk (Admin Portal)</b> at the top right to add food items to the menu!
                  </p>
                </div>
              ) : filteredFoods.length === 0 ? (
                <div className="empty-panel-box">
                  <h4>No items found in "{selectedCategory}"</h4>
                  <p>Try selecting "All" or add items in this category from Admin.</p>
                </div>
              ) : (
                <div className="food-grid">
                  {filteredFoods.map((food) => (
                    <article className="food-card" key={food.id}>
                      <div className="food-visual">{food.emoji}</div>
                      <div className="food-meta">
                        <div>
                          <h3 className="food-name">{food.name}</h3>
                          <p className="food-description">{food.description || "Fresh from the campus kitchen"}</p>
                        </div>
                        <span className="food-price">₹{food.price.toFixed(2)}</span>
                      </div>
                      <button
                        className="food-add"
                        onClick={() => addToCart(food)}
                        disabled={isProcessing || !food.available}
                      >
                        {!food.available ? "Sold Out" : "+ Add to tray"}
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* PREVIOUS ORDERS / ORDER HISTORY VIEW */
            <div className="history-orders-container">
              {sortedOrders.length === 0 ? (
                <div className="empty-history-box">
                  <span className="empty-icon" style={{ fontSize: "42px", display: "block", marginBottom: "12px" }}>
                    📦
                  </span>
                  <h3 style={{ margin: "0 0 8px" }}>No Previous Orders Yet</h3>
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: "14px", maxWidth: "400px" }}>
                    You haven’t placed any orders yet. Select your favorite items from Today's Menu to start!
                  </p>
                  <button
                    type="button"
                    className="primary-button"
                    style={{ marginTop: "18px", display: "inline-flex", width: "auto", padding: "10px 24px" }}
                    onClick={() => setActiveTab("menu")}
                  >
                    Browse Today's Menu
                  </button>
                </div>
              ) : (
                <div className="history-orders-list">
                  {sortedOrders.map((order) => (
                    <article className="history-order-card" key={order.id}>
                      <div className="history-order-top">
                        <div className="history-token-wrap">
                          <span className="history-token-badge">{order.tokenNumber}</span>
                          <span className="history-order-time">
                            <Clock size={12} />
                            {order.time}
                          </span>
                        </div>

                        <span className={`order-status-pill status-${order.status}`}>
                          {order.status === "received" && "🕒 In Queue"}
                          {order.status === "preparing" && "🍳 Cooking"}
                          {order.status === "ready" && "🎉 Ready for Pickup"}
                          {order.status === "completed" && "✅ Picked Up"}
                        </span>
                      </div>

                      <div className="history-order-items">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="history-item-row">
                            <span className="history-item-emoji">{item.emoji || "🍽️"}</span>
                            <span className="history-item-name">{item.name}</span>
                            <span className="history-item-qty">×{item.qty}</span>
                            <span className="history-item-price">
                              ₹{(item.price * item.qty).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {order.selfHealingNotes && order.selfHealingNotes.length > 0 && (
                        <div className="history-healing-note">
                          <ShieldCheck size={13} />
                          <span>{order.selfHealingNotes[0]}</span>
                        </div>
                      )}

                      <div className="history-order-footer">
                        <div className="history-payment-info">
                          <span className={`history-payment-pill ${order.paymentMethod}`}>
                            {order.paymentMethod === "upi" ? "📱 Paytm UPI" : "💳 Campus Wallet"}
                          </span>
                          <span className="history-order-total">
                            ₹{order.totalPrice.toFixed(2)}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="history-reorder-btn"
                          onClick={() => handleReorder(order)}
                          title="Add these items back to tray"
                        >
                          <RotateCcw size={13} />
                          <span>Reorder</span>
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Order Rail / Cart */}
        <aside className="order-rail">
          <div className="rail-card">
            <div className="rail-head">
              <h2 className="rail-title">Your Food Tray</h2>
              <span className="status-label">
                {cart.length > 0 ? `${cart.reduce((s, i) => s + i.qty, 0)} items` : "empty"}
              </span>
            </div>

            {cart.length === 0 ? (
              <p className="cart-empty-text">
                Your tray is currently empty.
                <br />
                Tap <b>"+ Add to tray"</b> on any dish to start ordering.
              </p>
            ) : (
              <div>
                {cart.map((item) => (
                  <div className="order-item" key={item.name}>
                    <span className="order-icon">{item.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong>{item.name}</strong>
                      <div className="cart-qty-row">
                        <button
                          type="button"
                          className="cart-qty-btn"
                          onClick={() => removeFromCart(item.name)}
                          title="Decrease quantity"
                        >
                          -
                        </button>
                        <small style={{ fontWeight: 600 }}>{item.qty}</small>
                        <button
                          type="button"
                          className="cart-qty-btn"
                          onClick={() =>
                            addToCart({
                              id: item.name,
                              name: item.name,
                              price: item.price,
                              emoji: item.emoji,
                              description: "",
                              category: "Meals",
                              available: true,
                            })
                          }
                          title="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <span className="order-price">₹{(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}

                <div className="order-total">
                  <span>Total Amount</span>
                  <span>₹{cartTotal.toFixed(2)}</span>
                </div>

                {/* Payment Method Selector */}
                <div className="payment-selector">
                  <label>Pay With:</label>
                  <select
                    value={paymentChoice}
                    onChange={(e) => setPaymentChoice(e.target.value as PaymentMethod)}
                    disabled={isProcessing}
                  >
                    <option value="upi">
                      UPI Gateway {circuitState === "OPEN" ? "(⚠️ Degraded - Auto Fallback)" : ""}
                    </option>
                    <option value="campus_wallet">
                      Campus Wallet (Balance: ₹{walletBalance.toFixed(2)})
                    </option>
                  </select>
                </div>

                <button
                  className={`primary-button ${paymentChoice === "upi" ? "paytm-action-btn" : ""}`}
                  onClick={handlePlaceOrder}
                  disabled={isProcessing || cart.length === 0}
                >
                  {isProcessing
                    ? "Processing..."
                    : paymentChoice === "upi"
                    ? `📱 Pay ₹${cartTotal.toFixed(2)} via Paytm UPI`
                    : `💳 Pay ₹${cartTotal.toFixed(2)} from Campus Wallet`}
                </button>
              </div>
            )}
          </div>

          {/* Connected Student Wallet */}
          <div className="wallet-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p className="wallet-label">Campus Wallet</p>
              <button
                type="button"
                className="outline-button"
                style={{
                  padding: "3px 9px",
                  fontSize: "11px",
                  color: "#fff",
                  borderColor: "rgba(255,255,255,0.25)",
                  borderRadius: "999px",
                  cursor: "pointer",
                }}
                onClick={() => {
                  const amtStr = window.prompt("Enter amount to add to your Campus Wallet (₹):", "200");
                  const amt = parseFloat(amtStr || "");
                  if (!isNaN(amt) && amt > 0) {
                    topupWallet(amt, "Student self-recharge");
                  }
                }}
                title="Top up your wallet balance"
              >
                + Add Money
              </button>
            </div>
            <p className="wallet-amount">₹{walletBalance.toFixed(2)}</p>
            <div className="wallet-footer">
              <span>STU-2026-001</span>
              <b>{walletBalance > 0 ? "Funded & Connected" : "Zero Balance"}</b>
            </div>
          </div>

          {/* Live Kitchen Pickup Status */}
          <div className="rail-card live-order">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <h3 style={{ margin: 0 }}>Live Pickup</h3>
              {kitchenOrders.length > 0 && (
                <button
                  type="button"
                  className="view-history-link"
                  onClick={() => setActiveTab("history")}
                >
                  History ({kitchenOrders.length}) →
                </button>
              )}
            </div>
            <p>{activeOrders.length ? "Your order is cooking in the kitchen." : "No active order yet."}</p>
            {latestOrder && (
              <div className="token-row">
                <b>{latestOrder.tokenNumber}</b>
                <span>
                  {latestOrder.status === "received"
                    ? "In Queue"
                    : latestOrder.status === "preparing"
                    ? "Cooking Now 🍳"
                    : "Ready for Pickup! 🎉"}
                </span>
              </div>
            )}
          </div>
        </aside>
      </section>

      {/* AI Assistant Dock */}
      <section className="assistant-dock">
        <span className="assistant-avatar">✦</span>
        <div>
          <h3>Ask the Canteen Concierge</h3>
          <p>Try “show menu”, “wallet balance check kar”, or ask what’s cooking today.</p>
        </div>
        <form className="assistant-form" onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing}
            placeholder="What would you like to ask or order?"
          />
          <button disabled={isProcessing || !input.trim()}>Ask</button>
        </form>
      </section>

      <div className="chat-history" aria-live="polite">
        {messages.slice(-4).map((message) => (
          <div key={message.id} className={`chat-message ${message.role}`}>
            {message.content}
          </div>
        ))}
      </div>

      {/* Paytm Payment Gateway Modal */}
      <PaytmPaymentModal
        isOpen={isPaytmModalOpen}
        onClose={() => setIsPaytmModalOpen(false)}
        items={cart}
        totalAmount={cartTotal}
        circuitState={circuitState}
        activeChaos={activeChaos}
        walletBalance={walletBalance}
        onConfirmOrder={async (method) => {
          return await placeOrder(method);
        }}
      />
    </main>
  );
}
