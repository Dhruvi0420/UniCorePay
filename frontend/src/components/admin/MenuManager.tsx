import { useState } from "react";
import type { FoodItem } from "../../types";

interface MenuManagerProps {
  menu: FoodItem[];
  onAddItem: (item: {
    name: string;
    description: string;
    price: number;
    emoji: string;
    category: string;
  }) => Promise<boolean>;
  onDeleteItem: (id: string) => Promise<boolean>;
  onToggleAvailability: (id: string) => Promise<boolean>;
}

const EMOJI_PRESETS = ["🥞", "☕", "🍚", "🌯", "🔺", "🍜", "🍕", "🥪", "🍛", "🥤", "🧃", "🍰", "🥗", "🍔"];
const CATEGORIES = ["Meals", "Bites", "Drinks", "Snacks", "Combos", "Desserts"];

export function MenuManager({
  menu,
  onAddItem,
  onDeleteItem,
  onToggleAvailability,
}: MenuManagerProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [emoji, setEmoji] = useState("🥞");
  const [category, setCategory] = useState("Meals");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = parseFloat(price);
    if (!name.trim() || isNaN(numPrice) || numPrice <= 0) return;

    setIsSubmitting(true);
    const ok = await onAddItem({
      name: name.trim(),
      description: description.trim(),
      price: numPrice,
      emoji: emoji || "🍽️",
      category: category || "Meals",
    });

    if (ok) {
      setName("");
      setDescription("");
      setPrice("");
      setSuccessMsg(`✅ "${name.trim()}" successfully added to the menu!`);
      setTimeout(() => setSuccessMsg(""), 3500);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="menu-manager">
      <div className="panel-title-row">
        <div>
          <h3 style={{ margin: 0 }}>Canteen Menu Manager</h3>
          <small style={{ color: "var(--muted)" }}>
            Add new food items or toggle stock availability in real time.
          </small>
        </div>
        <span className="muted-badge">{menu.length} Items Listed</span>
      </div>

      {/* Add New Item Form */}
      <form onSubmit={handleSubmit} className="admin-add-form">
        <h4 style={{ margin: "0 0 12px", fontSize: "13px", letterSpacing: "0.02em" }}>
          + Add New Food Item
        </h4>

        {successMsg && <div className="form-success-banner">{successMsg}</div>}

        <div className="form-row-grid">
          <div className="form-field">
            <label>Item Name *</label>
            <input
              type="text"
              placeholder="e.g. Masala Dosa, Cold Coffee"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label>Price (₹) *</label>
            <input
              type="number"
              step="1"
              min="1"
              placeholder="e.g. 60"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-field" style={{ marginTop: "12px" }}>
          <label>Emoji Icon</label>
          <div className="emoji-picker-row">
            {EMOJI_PRESETS.map((em) => (
              <button
                type="button"
                key={em}
                className={`emoji-btn ${emoji === em ? "selected" : ""}`}
                onClick={() => setEmoji(em)}
              >
                {em}
              </button>
            ))}
            <input
              type="text"
              className="emoji-custom-input"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              maxLength={4}
              title="Custom emoji"
            />
          </div>
        </div>

        <div className="form-field" style={{ marginTop: "12px" }}>
          <label>Short Description (Optional)</label>
          <input
            type="text"
            placeholder="e.g. Crisp, golden & comforting, served with sambar"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="primary-button"
          disabled={isSubmitting || !name.trim() || !price}
          style={{ marginTop: "16px", width: "auto", padding: "10px 22px" }}
        >
          {isSubmitting ? "Adding..." : "+ Add to Canteen Menu"}
        </button>
      </form>

      {/* Live Menu Items List */}
      <div style={{ marginTop: "28px" }}>
        <h4 style={{ margin: "0 0 14px", fontSize: "14px" }}>Active Menu Items</h4>

        {menu.length === 0 ? (
          <div className="empty-panel-box">
            <span style={{ fontSize: "36px" }}>🍽️</span>
            <h4>No items on the menu yet!</h4>
            <p>Use the form above to add your first canteen food item.</p>
          </div>
        ) : (
          <div className="admin-menu-list">
            {menu.map((item) => (
              <article key={item.id} className="admin-menu-card">
                <span className="admin-item-emoji">{item.emoji}</span>
                <div className="admin-item-info">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <strong>{item.name}</strong>
                    <span className="category-pill">{item.category}</span>
                    <span className={`status-pill ${item.available ? "in-stock" : "out-of-stock"}`}>
                      {item.available ? "In Stock" : "Sold Out"}
                    </span>
                  </div>
                  {item.description && <p>{item.description}</p>}
                </div>
                <span className="admin-item-price">₹{item.price.toFixed(2)}</span>
                <div className="admin-item-actions">
                  <button
                    type="button"
                    className="toggle-stock-btn"
                    onClick={() => onToggleAvailability(item.id)}
                    title="Toggle stock availability"
                  >
                    {item.available ? "Mark Sold Out" : "Mark Available"}
                  </button>
                  <button
                    type="button"
                    className="delete-item-btn"
                    onClick={() => onDeleteItem(item.id)}
                    title="Delete item from menu"
                  >
                    ✕
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
