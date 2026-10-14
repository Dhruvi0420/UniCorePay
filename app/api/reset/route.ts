/**
 * ============================================================
 * API ROUTE: /api/reset — Full System Reset
 * ============================================================
 *
 * Resets the entire system state to defaults.
 * Useful for demo resets during the hackathon presentation.
 */

import { resetState } from "@/lib/store";

export async function POST() {
  const newState = resetState();
  return Response.json({
    success: true,
    message: "System fully reset to initial state",
    walletBalance: newState.wallet.balance,
  });
}
