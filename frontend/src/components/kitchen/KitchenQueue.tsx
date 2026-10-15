import type { KitchenOrder } from "../../types";

interface KitchenQueueProps { orders: KitchenOrder[]; onAdvanceStatus: (orderId: string) => void; }

const nextAction = { received: "Start prep", preparing: "Mark ready", ready: "Complete" } as const;

export function KitchenQueue({ orders, onAdvanceStatus }: KitchenQueueProps) {
  const activeOrders = orders.filter((order) => order.status !== "completed");
  return <div><div className="panel-title-row"><h3>Kitchen queue</h3><span className="muted-badge">{activeOrders.length} live</span></div><div className="queue-list">{orders.map((order) => <article className="queue-card" key={order.id}><div><span className="queue-token">{order.tokenNumber}</span> <span className={`order-status ${order.status}`}>{order.status}</span><p>{order.items.map((item) => `${item.qty} × ${item.name}`).join(", ")}</p><small>₹{order.totalPrice} · {order.paymentMethod.replace("_", " ")} · {order.time}</small></div>{order.status !== "completed" && <button className="queue-button" onClick={() => onAdvanceStatus(order.id)}>{nextAction[order.status]}</button>}</article>)}</div></div>;
}
