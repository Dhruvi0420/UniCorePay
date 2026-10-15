import { useState } from "react";
import { useCanteen } from "../../context/CanteenContext";

const foods = [
  { name: "Masala Dosa", description: "Crisp, golden & comforting", price: 60, emoji: "🥞", prompt: "2 masala dosa aur 1 cold coffee UPI se" },
  { name: "Veg Biryani", description: "Fragrant rice, slow cooked", price: 120, emoji: "🍚", prompt: "1 veg biryani aur 1 cold coffee" },
  { name: "Paneer Roll", description: "Fresh from the tawa", price: 80, emoji: "🌯", prompt: "1 paneer roll order kar" },
  { name: "Cold Coffee", description: "Chilled, creamy & bold", price: 50, emoji: "☕", prompt: "1 cold coffee order kar" },
  { name: "Samosa", description: "Spiced potato classic", price: 20, emoji: "🔺", prompt: "4 samosa aur 2 chai order kar" },
  { name: "Maggi", description: "A quick, cosy bowl", price: 35, emoji: "🍜", prompt: "2 maggi aur 1 chai" },
];

export function StudentPortalPage() {
  const {
    walletBalance,
    messages,
    isProcessing,
    kitchenOrders,
    sendMessage,
  } = useCanteen();

  const [input, setInput] = useState("");
  const [category, setCategory] = useState("All");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    sendMessage(input.trim());
    setInput("");
  };

  const activeOrders = kitchenOrders.filter((o) => o.status !== "completed");
  const latestOrder = activeOrders[0];

  return (
    <main className="student-page" id="top">
      <section className="student-intro">
        <div><p className="eyebrow">The campus kitchen · open until 7:30 pm</p><h1 className="display-title">Good food,<br /><em>on your time.</em></h1></div>
        <p className="intro-copy">Skip the queue. Pick a favourite, pay in one tap, and we’ll keep your order moving from counter to pickup.</p>
      </section>
      <section className="menu-layout">
        <div>
          <div className="menu-header"><h2 className="section-title">Today’s picks</h2><div className="category-tabs">{["All","Popular","Meals","Bites","Drinks"].map((item)=><button key={item} className={`category-tab ${category===item?"active":""}`} onClick={()=>setCategory(item)}>{item}</button>)}</div></div>
          <div className="food-grid">{foods.map((food)=><article className="food-card" key={food.name}><div className="food-visual">{food.emoji}</div><div className="food-meta"><div><h3 className="food-name">{food.name}</h3><p className="food-description">{food.description}</p></div><span className="food-price">₹{food.price}</span></div><button className="food-add" onClick={()=>sendMessage(food.prompt)} disabled={isProcessing}>Add to order</button></article>)}</div>
        </div>
        <aside className="order-rail">
          <div className="rail-card"><div className="rail-head"><h2 className="rail-title">Your usual</h2><span className="status-label">{isProcessing?"adding…":"ready"}</span></div><div className="order-item"><span className="order-icon">🥞</span><div><strong>Masala dosa</strong><small>2 portions</small></div><span className="order-price">₹120</span></div><div className="order-item"><span className="order-icon">☕</span><div><strong>Cold coffee</strong><small>1 portion</small></div><span className="order-price">₹50</span></div><div className="order-total"><span>Total</span><span>₹170</span></div><button className="primary-button" onClick={()=>sendMessage("2 masala dosa aur 1 cold coffee UPI se")} disabled={isProcessing}>{isProcessing?"Placing order…":"Order in one tap"}</button></div>
          <div className="wallet-card"><p className="wallet-label">Campus wallet</p><p className="wallet-amount">₹{walletBalance.toFixed(2)}</p><div className="wallet-footer"><span>STU-2026-042</span><b>Connected</b></div></div>
          <div className="rail-card live-order"><h3>Live pickup</h3><p>{activeOrders.length ? "Your kitchen updates appear here." : "No active order yet."}</p>{latestOrder && <div className="token-row"><b>{latestOrder.tokenNumber}</b><span>{latestOrder.status === "received" ? "In the queue" : latestOrder.status === "preparing" ? "Cooking now" : "Ready for you"}</span></div>}</div>
        </aside>
      </section>
      <section className="assistant-dock"><span className="assistant-avatar">✦</span><div><h3>Ask the canteen concierge</h3><p>Try “show menu”, “wallet balance check kar”, or tell us exactly what you’re craving.</p></div><form className="assistant-form" onSubmit={handleSubmit}><input value={input} onChange={(e)=>setInput(e.target.value)} disabled={isProcessing} placeholder="What can we make for you?"/><button disabled={isProcessing || !input.trim()}>Ask</button></form></section>
      <div className="chat-history" aria-live="polite">{messages.slice(-4).map((message)=><div key={message.id} className={`chat-message ${message.role}`}>{message.content}</div>)}</div>
    </main>
  );
}
