import type { Skill } from "../types";

export interface PaymentRequiredBody {
  error: "Payment Required";
  skill: string;
  paymentRequired: {
    price: string;
    currency: "WLD";
    walletAddress: string;
  };
}

export function findMatchingSkill(
  pathname: string,
  method: string,
  skills: Skill[]
): Skill | null {
  return (
    skills.find(
      (s) => s.route === pathname && s.method === method.toUpperCase()
    ) ?? null
  );
}

export function build402Body(skill: Skill, walletAddress: string): PaymentRequiredBody {
  return {
    error: "Payment Required",
    skill: skill.id,
    paymentRequired: {
      price: skill.price,
      currency: "WLD",
      walletAddress,
    },
  };
}

/**
 * Synchronous check for presence of payment header.
 * If facilitatorUrl is set, use verifyPaymentAsync for full verification.
 * If no facilitatorUrl, trusts any non-empty header value (dev mode).
 */
export function verifyPaymentHeader(
  header: string | undefined,
  facilitatorUrl: string | undefined
): boolean {
  if (!header) return false;
  if (!facilitatorUrl) return true;
  return true;
}

export async function verifyPaymentAsync(
  header: string,
  facilitatorUrl: string,
  skill: Skill
): Promise<boolean> {
  try {
    const res = await fetch(facilitatorUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment: header, skill: skill.id, price: skill.price }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
