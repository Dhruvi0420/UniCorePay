/**
 * ============================================================
 * AI AGENT — Natural Language Order Parser (Hinglish + English)
 * ============================================================
 *
 * This module simulates an "AI Agent" that understands student
 * messages in Hinglish/English and extracts order intent.
 *
 * It uses keyword matching and fuzzy pattern recognition to:
 * 1. Parse food items and quantities from natural language
 * 2. Calculate total price from the menu catalog
 * 3. Detect payment method preference (UPI / Wallet)
 * 4. Generate a friendly response in the student's language
 *
 * NOTE: In a production system, this would call an LLM API.
 * For the hackathon, we use a deterministic parser to avoid
 * external API dependencies and demonstrate the concept.
 */

import { MENU } from "./engine";

export interface ParsedOrder {
  items: { name: string; key: string; qty: number; price: number; emoji: string }[];
  totalPrice: number;
  paymentPreference: "upi" | "campus_wallet" | "auto";
  isValidOrder: boolean;
  aiResponse: string;
}

// ============================================================
// ITEM ALIASES — Maps Hinglish/English variations to menu keys
// ============================================================

const ITEM_ALIASES: Record<string, string> = {
  // Masala Dosa
  "masala dosa": "masala_dosa",
  "dosa": "masala_dosa",
  "मसाला डोसा": "masala_dosa",
  // Idli Sambar
  "idli sambar": "idli_sambar",
  "idli": "idli_sambar",
  "idly": "idli_sambar",
  // Cold Coffee
  "cold coffee": "cold_coffee",
  "iced coffee": "cold_coffee",
  "coffee": "cold_coffee",
  "कॉफ़ी": "cold_coffee",
  // Veg Biryani
  "veg biryani": "veg_biryani",
  "biryani": "veg_biryani",
  "briyani": "veg_biryani",
  "बिरयानी": "veg_biryani",
  // Paneer Roll
  "paneer roll": "paneer_roll",
  "paneer wrap": "paneer_roll",
  "roll": "paneer_roll",
  // Samosa
  "samosa": "samosa",
  "समोसा": "samosa",
  // Chai
  "chai": "chai",
  "tea": "chai",
  "चाय": "chai",
  // Maggi
  "maggi": "maggi",
  "noodles": "maggi",
  "मैगी": "maggi",
  // Chole Bhature
  "chole bhature": "chole_bhature",
  "chole": "chole_bhature",
  "bhature": "chole_bhature",
  "छोले भटूरे": "chole_bhature",
  // Pav Bhaji
  "pav bhaji": "pav_bhaji",
  "pavbhaji": "pav_bhaji",
  "पाव भाजी": "pav_bhaji",
  // French Fries
  "french fries": "french_fries",
  "fries": "french_fries",
  "फ्राइज": "french_fries",
  // Pasta
  "pasta": "pasta",
  "पास्ता": "pasta",
};

// ============================================================
// NUMBER WORD MAP (Hindi + English)
// ============================================================

const NUMBER_WORDS: Record<string, number> = {
  "ek": 1, "एक": 1, "one": 1, "1": 1,
  "do": 2, "दो": 2, "two": 2, "2": 2,
  "teen": 3, "तीन": 3, "three": 3, "3": 3,
  "char": 4, "चार": 4, "four": 4, "4": 4,
  "paanch": 5, "पांच": 5, "five": 5, "5": 5,
};

// ============================================================
// MAIN PARSER
// ============================================================

export function parseStudentMessage(message: string): ParsedOrder {
  const lowerMsg = message.toLowerCase().trim();
  const items: ParsedOrder["items"] = [];

  // Detect payment preference
  let paymentPreference: ParsedOrder["paymentPreference"] = "auto";
  if (/upi|gpay|phonep|paytm|bhim/i.test(lowerMsg)) {
    paymentPreference = "upi";
  } else if (/wallet|campus|balance|credit/i.test(lowerMsg)) {
    paymentPreference = "campus_wallet";
  }

  // Try to extract items with quantities
  // Pattern: "{number} {item}" or "{item} x{number}" or just "{item}"
  const sortedAliases = Object.keys(ITEM_ALIASES).sort((a, b) => b.length - a.length);

  for (const alias of sortedAliases) {
    if (!lowerMsg.includes(alias)) continue;

    const menuKey = ITEM_ALIASES[alias];
    const menuItem = MENU[menuKey];
    if (!menuItem) continue;

    // Check if already added (longer alias might match first)
    if (items.some((i) => i.key === menuKey)) continue;

    // Try to find quantity before the item name
    let qty = 1;
    const idx = lowerMsg.indexOf(alias);

    // Look for number before the item mention (within 15 chars)
    const beforeText = lowerMsg.slice(Math.max(0, idx - 15), idx).trim();
    // Try digit patterns
    const digitMatch = beforeText.match(/(\d+)\s*$/);
    if (digitMatch) {
      qty = parseInt(digitMatch[1], 10);
    } else {
      // Try word patterns
      for (const [word, num] of Object.entries(NUMBER_WORDS)) {
        if (beforeText.endsWith(word) || beforeText.endsWith(word + " ")) {
          qty = num;
          break;
        }
      }
    }

    // Also check for "x2" or "× 3" after the item
    const afterText = lowerMsg.slice(idx + alias.length, idx + alias.length + 10);
    const afterMatch = afterText.match(/^\s*[x×]\s*(\d+)/);
    if (afterMatch) {
      qty = parseInt(afterMatch[1], 10);
    }

    qty = Math.min(qty, 10); // Cap at 10 per item

    items.push({
      name: menuItem.name,
      key: menuKey,
      qty,
      price: menuItem.price,
      emoji: menuItem.emoji,
    });
  }

  if (items.length === 0) {
    // Check if it's a greeting or general message
    if (/hi|hello|hey|namaste|bhai|kya hal|sup/i.test(lowerMsg)) {
      return {
        items: [],
        totalPrice: 0,
        paymentPreference,
        isValidOrder: false,
        aiResponse: getGreetingResponse(),
      };
    }

    if (/menu|kya (hai|milega)|list|what.*available|items/i.test(lowerMsg)) {
      return {
        items: [],
        totalPrice: 0,
        paymentPreference,
        isValidOrder: false,
        aiResponse: getMenuResponse(),
      };
    }

    if (/balance|wallet|kitna|paisa|money|credit/i.test(lowerMsg)) {
      return {
        items: [],
        totalPrice: 0,
        paymentPreference,
        isValidOrder: false,
        aiResponse: "WALLET_CHECK", // Special flag — the component will inject the actual balance
      };
    }

    if (/status|order|token|track/i.test(lowerMsg)) {
      return {
        items: [],
        totalPrice: 0,
        paymentPreference,
        isValidOrder: false,
        aiResponse: "ORDER_STATUS", // Special flag
      };
    }

    return {
      items: [],
      totalPrice: 0,
      paymentPreference,
      isValidOrder: false,
      aiResponse: getFallbackResponse(),
    };
  }

  const totalPrice = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  return {
    items,
    totalPrice,
    paymentPreference,
    isValidOrder: true,
    aiResponse: getOrderConfirmationResponse(items, totalPrice, paymentPreference),
  };
}

// ============================================================
// RESPONSE GENERATORS
// ============================================================

function getGreetingResponse(): string {
  const greetings = [
    "Hey! 👋 Main hun tera Campus Canteen AI Agent! Bata kya khayega? Menu dekhna hai toh bol 'menu dikha'.",
    "Namaste! 🙏 UniCorePay AI Agent ready hai. Order karna hai? Bas bol de — '2 dosa aur 1 coffee' jaise!",
    "Yo! 🔥 Welcome to the smartest canteen on campus! Tell me what you'd like to eat, I'll handle everything!",
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}

function getMenuResponse(): string {
  const menuLines = Object.values(MENU)
    .map((item) => `${item.emoji} ${item.name} — ₹${item.price}`)
    .join("\n");
  return `📋 **Today's Menu:**\n\n${menuLines}\n\nBol kya mangta hai? 😋`;
}

function getFallbackResponse(): string {
  const fallbacks = [
    "Samjha nahi bhai 😅 Food order karna hai toh aise bol: '2 masala dosa aur 1 cold coffee'. Ya 'menu' bol de!",
    "Hmm, I didn't catch that 🤔 Try saying something like 'Order 1 biryani and 2 chai' or type 'menu' to see options!",
    "Arre thoda clearly bol yaar! 😄 Example: 'Bhai 3 samosa de aur 1 chai' — bas itna easy hai!",
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

function getOrderConfirmationResponse(
  items: ParsedOrder["items"],
  total: number,
  payPref: string
): string {
  const itemLines = items
    .map((i) => `   ${i.emoji} ${i.qty}x ${i.name} — ₹${i.price * i.qty}`)
    .join("\n");

  const payText =
    payPref === "upi"
      ? "UPI se payment"
      : payPref === "campus_wallet"
      ? "Campus Wallet se payment"
      : "best available method se payment";

  return `🛒 **Order samajh gaya!**\n\n${itemLines}\n\n💰 **Total: ₹${total}**\n\n${payText} process kar raha hun... ⏳`;
}
