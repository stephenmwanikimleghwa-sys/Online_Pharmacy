/** Normalize list payloads from DRF pagination, api_response wrapper, or inventory list. */
export function unwrapList<T = unknown>(payload: unknown): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as T[];
  if (typeof payload !== "object") return [];

  const obj = payload as Record<string, unknown>;
  if (Array.isArray(obj.data)) return obj.data as T[];
  if (Array.isArray(obj.results)) return obj.results as T[];
  if (Array.isArray(obj.products)) return obj.products as T[];

  return [];
}

export function getProductDisplayPrice(product: {
  price?: number | string;
  pricing_tier?: {
    retail_price?: number | string;
    wholesale_price?: number | string;
    buying_price?: number | string;
  } | null;
}): number {
  const tier = product.pricing_tier;
  const retail = tier?.retail_price;
  if (retail !== undefined && retail !== null && retail !== "") {
    const n = Number(retail);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  const price = product.price;
  if (price !== undefined && price !== null && price !== "") {
    const n = Number(price);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return 0;
}

export function getProductBranchQuantity(
  product: {
    stock_quantity?: number;
    branch_stocks?: { branch_id: number; quantity: number }[];
  },
  branchId?: number | null,
): number {
  if (branchId && product.branch_stocks?.length) {
    const match = product.branch_stocks.find((b) => b.branch_id === branchId);
    if (match) return Number(match.quantity) || 0;
  }
  return Number(product.stock_quantity) || 0;
}
