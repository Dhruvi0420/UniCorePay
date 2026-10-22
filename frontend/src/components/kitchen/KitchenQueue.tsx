import type { KitchenOrder } from "../../types";

interface KitchenQueueProps {
  orders: KitchenOrder[];
  onAdvanceStatus: (orderId: string) => void;
}

const nextAction = {
  received: "Start prep 👨‍🍳",
  preparing: "Mark ready 🔔",
  ready: "Complete order ✅",
} as const;

export function KitchenQueue({ orders, onAdvanceStatus }: KitchenQueueProps) {
  const activeOrders = orders.filter((order) => order.status !== "completed");

  return (
    <div>
      <div className="panel-title-row">
        <div>
          <h3 style={{ margin: 0 }}>Live Kitchen Queue</h3>
          <small style={{ color: "var(--muted)" }}>
            Incoming live tokens ordered by students across campus.
          </small>
        </div>
        <span className="muted-badge">{activeOrders.length} active orders</span>
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
              {order.status !== "completed" && (
                <button
                  className="queue-button"
                  onClick={() => onAdvanceStatus(order.id)}
                >
                  {nextAction[order.status]}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
