import type { KitchenOrder } from "../../types";
import { PaytmSoundbox } from "../common/PaytmSoundbox";

interface KitchenQueueProps {
  orders: KitchenOrder[];
  onAdvanceStatus: (orderId: string) => void;
  onDeleteOrder: (orderId: string) => void;
  onClearAllOrders: () => void;
}

const nextAction = {
  received: "Start prep 👨‍🍳",
  preparing: "Mark ready 🔔",
  ready: "Complete order ✅",
} as const;

export function KitchenQueue({ orders, onAdvanceStatus, onDeleteOrder, onClearAllOrders }: KitchenQueueProps) {
  const activeOrders = orders.filter((order) => order.status !== "completed");

  return (
    <div>
      {/* Paytm Canteen Soundbox Audio Announcer */}
      <PaytmSoundbox latestOrder={orders[0]} />

      <div className="panel-title-row" style={{ marginTop: "18px" }}>
        <div>
          <h3 style={{ margin: 0 }}>Live Kitchen Queue</h3>
          <small style={{ color: "var(--muted)" }}>
            Incoming live tokens ordered by students across campus.
          </small>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span className="muted-badge">{activeOrders.length} active orders</span>
          {orders.length > 0 && (
            <button
              type="button"
              className="outline-button"
              style={{
                padding: "5px 12px",
                fontSize: "11px",
                borderRadius: "999px",
                cursor: "pointer",
              }}
              onClick={() => {
                if (window.confirm("Clear all orders from the kitchen queue?")) {
                  onClearAllOrders();
                }
              }}
              title="Mass delete all orders"
            >
              Clear Queue 🗑️
            </button>
          )}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="empty-panel-box" style={{ marginTop: "14px" }}>
          <span style={{ fontSize: "36px" }}>🧑‍🍳</span>
          <h4>Kitchen Queue is Empty</h4>
          <p>
            No orders have been placed yet. Place an order from the <b>Order Food (Student Portal)</b> to see tickets appear here!
          </p>
        </div>
      ) : (
        <div className="queue-list" style={{ marginTop: "14px" }}>
          {orders.map((order) => (
            <article className="queue-card" key={order.id}>
              <div>
                <span className="queue-token">{order.tokenNumber}</span>{" "}
                <span className={`order-status ${order.status}`}>{order.status}</span>
                <p>
                  {order.items.map((item) => `${item.qty} × ${item.name}`).join(", ")}
                </p>
                <small>
                  ₹{order.totalPrice.toFixed(2)} · {order.paymentMethod.replace("_", " ").toUpperCase()} · {order.time}
                </small>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {order.status !== "completed" && (
                  <button
                    className="queue-button"
                    onClick={() => onAdvanceStatus(order.id)}
                  >
                    {nextAction[order.status]}
                  </button>
                )}
                <button
                  type="button"
                  className="outline-button"
                  style={{
                    padding: "7px 10px",
                    fontSize: "12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    color: "var(--muted)",
                  }}
                  onClick={() => onDeleteOrder(order.id)}
                  title="Delete this order"
                  aria-label="Delete order"
                >
                  ✕
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
