/** Part 3 — inline form validation messages */

export function fieldLabel(name: string, label?: string): string {
  if (label?.trim()) return label.trim();
  return name
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function requiredMessage(name: string, label?: string): string {
  return `${fieldLabel(name, label)} is required.`;
}

const KENYAN_PHONE_RE = /^(?:\+254|254|0)(?:7|1)\d{8}$/;

export function validateKenyanPhone(value: string): string | undefined {
  const trimmed = value.replace(/\s/g, "");
  if (!trimmed) return undefined;
  if (!KENYAN_PHONE_RE.test(trimmed)) {
    return "Please enter a valid Kenyan phone number starting with 07, 01, or +254.";
  }
  return undefined;
}

export function validatePositivePrice(value: string): string | undefined {
  if (!value?.trim()) return undefined;
  const num = Number(value);
  if (Number.isNaN(num) || num <= 0) {
    return "Price must be a number greater than 0.";
  }
  return undefined;
}

export function validateMinQuantity(value: string, min = 1): string | undefined {
  if (!value?.trim()) return undefined;
  const num = parseInt(value, 10);
  if (Number.isNaN(num) || num < min) {
    return `Quantity must be at least ${min}.`;
  }
  return undefined;
}

export function validateSellingBelowCost(
  selling: string,
  cost: string,
): string | undefined {
  const sell = Number(selling);
  const buy = Number(cost);
  if (Number.isNaN(sell) || Number.isNaN(buy) || sell <= 0 || buy <= 0) {
    return undefined;
  }
  if (sell < buy) {
    return `Selling price (KES ${sell.toLocaleString()}) is less than cost price (KES ${buy.toLocaleString()}). Are you sure? This means selling at a loss.`;
  }
  return undefined;
}

/** Built-in rules from field name + type (used by FormField when no custom validate). */
export function builtInFieldValidate(
  name: string,
  label: string | undefined,
  value: string,
  options: {
    required?: boolean;
    type?: string;
    minQuantity?: number;
    compareCost?: string;
  },
): string | undefined {
  if (options.required && !value?.trim()) {
    return requiredMessage(name, label);
  }
  if (!value?.trim()) return undefined;

  const lower = name.toLowerCase();
  if (options.type === "tel" || lower.includes("phone")) {
    return validateKenyanPhone(value);
  }
  if (
    options.type === "number" &&
    (lower.includes("price") ||
      lower.includes("amount") ||
      lower.includes("cost") ||
      lower.includes("total"))
  ) {
    const priceErr = validatePositivePrice(value);
    if (priceErr) return priceErr;
    if (lower.includes("selling") && options.compareCost) {
      return validateSellingBelowCost(value, options.compareCost);
    }
  }
  if (
    lower.includes("quantity") ||
    lower.includes("qty") ||
    lower === "amount" && options.type === "number"
  ) {
    return validateMinQuantity(value, options.minQuantity ?? 1);
  }
  return undefined;
}
