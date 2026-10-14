/**
 * ============================================================
 * API ROUTE: /api/order — Process Student Orders
 * ============================================================
 *
 * This endpoint is called by the AI Agent chat interface to:
 * 1. Parse the student's natural language message
 * 2. Process the order through the self-healing pipeline
 * 3. Return the result (success with token, or failure info)
 *
 * The entire self-healing flow happens here:
 * - Idempotency key generation
 * - UPI payment with retries
 * - Circuit breaker check
 * - Fallback to campus wallet
 * - Token generation
 */

import { parseStudentMessage } from "@/lib/ai-agent";
import { processOrder } from "@/lib/engine";
import { getState } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    // Step 1: Parse the student's message with the AI Agent
    const parsed = parseStudentMessage(message);

    // Handle non-order messages (greetings, menu requests, etc.)
    if (!parsed.isValidOrder) {
      // Special handling for wallet balance check
      if (parsed.aiResponse === "WALLET_CHECK") {
        const state = getState();
        return Response.json({
          type: "info",
          aiResponse: `💰 Tera Campus Wallet balance: **₹${state.wallet.balance.toFixed(2)}**\n\nLast ${Math.min(3, state.wallet.transactions.length)} transactions:\n${state.wallet.transactions
            .slice(0, 3)
            .map((t) => `  ${t.type === "credit" ? "➕" : "➖"} ₹${t.amount} — ${t.description}`)
            .join("\n")}`,
          parsed,
        });
      }

      if (parsed.aiResponse === "ORDER_STATUS") {
        const state = getState();
        const recentOrders = state.orders.slice(0, 3);
        if (recentOrders.length === 0) {
          return Response.json({
            type: "info",
            aiResponse: "Abhi tak koi order nahi hai bhai! 📭 Kuch order kar na!",
            parsed,
          });
        }
        const orderLines = recentOrders
          .map(
            (o) =>
              `  🎫 ${o.tokenNumber || "Pending"} — ₹${o.totalPrice} — ${o.paymentStatus.toUpperCase()} (${o.paymentMethod})`
          )
          .join("\n");
        return Response.json({
          type: "info",
          aiResponse: `📋 **Recent Orders:**\n\n${orderLines}`,
          parsed,
        });
      }

      return Response.json({
        type: "chat",
        aiResponse: parsed.aiResponse,
        parsed,
      });
    }

    // Step 2: Process the order through the self-healing pipeline
    const result = await processOrder(
      parsed.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price }))
    );

    if (result.success) {
      // Build success response
      const itemSummary = parsed.items.map((i) => `${i.emoji} ${i.qty}x ${i.name}`).join(", ");
      const healingNote =
        result.selfHealingUsed.length > 0
          ? `\n\n🔧 **Self-Healing Used:** ${result.selfHealingUsed.join(" → ")}`
          : "";

      return Response.json({
        type: "order_success",
        aiResponse: `✅ **Order Complete!**\n\n🎫 Token: **${result.tokenNumber}**\n📦 Items: ${itemSummary}\n💰 Total: ₹${result.totalPrice}\n💳 Paid via: ${result.paymentMethod === "upi" ? "UPI Gateway" : "Campus Wallet"}${healingNote}\n\nApna token number yaad rakhna! Counter pe dikhana. 🫡`,
        tokenNumber: result.tokenNumber,
        orderId: result.orderId,
        totalPrice: result.totalPrice,
        paymentMethod: result.paymentMethod,
        selfHealingUsed: result.selfHealingUsed,
        parsed,
      });
    } else {
      return Response.json({
        type: "order_failed",
        aiResponse: `⚠️ **Order Issue:**\n\n${result.error}\n\n🔧 **Self-Healing Active:** ${result.selfHealingUsed.join(" → ")}\n\nDon't worry, system auto-repair kar raha hai! Thoda wait kar aur retry kar. 💪`,
        error: result.error,
        orderId: result.orderId,
        totalPrice: result.totalPrice,
        selfHealingUsed: result.selfHealingUsed,
        parsed,
      });
    }
  } catch (error) {
    console.error("[API/order] Error:", error);
    return Response.json(
      { error: "Internal server error", type: "error", aiResponse: "Oops! Something went wrong server-side 😵 Retry karo!" },
      { status: 500 }
    );
  }
}
