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
  selling_price?: number | string;
  pricing_tier?: {
    retail_price?: number | string;
    wholesale_price?: number | string;
    buying_price?: number | string;
  } | null;
}): number {
  const tier = product.pricing_tier;
  const retail = product.selling_price ?? tier?.retail_price;
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
    branch_stocks?: { branch_id: number | string; branch_name?: string; quantity: number }[];
  },
  branchId?: number | string | null,
  branchName?: string | null,
): number {
  const normalizedBranchId = branchId != null ? Number(branchId) : null;
  if (product.branch_stocks?.length && normalizedBranchId != null && !Number.isNaN(normalizedBranchId)) {
    const match = product.branch_stocks.find((b) => Number(b.branch_id) === normalizedBranchId);
    if (match) return Number(match.quantity) || 0;
  }
  if (product.branch_stocks?.length && branchName) {
    const byName = product.branch_stocks.find(
      (b) => (b.branch_name || "").toLowerCase() === branchName.toLowerCase(),
    );
    if (byName) return Number(byName.quantity) || 0;
  }
  return Number(product.stock_quantity) || 0;
}

export type BranchAvailabilityAlt = {
  branch_id: number;
  branch_name: string;
  quantity: number;
  status: string;
};

/** Instant cross-branch hint from payload already on the product (no network). */
export function deriveOtherBranchAvailability(
  product: {
    id?: number;
    name?: string;
    branch_stocks?: { branch_id: number | string; branch_name?: string; quantity: number }[];
  },
  activeBranchId?: number | string | null,
): {
  productName: string;
  alternatives: BranchAvailabilityAlt[];
  availableElsewhere: boolean;
  hasLocalBranchData: boolean;
} | null {
  const stocks = product.branch_stocks;
  if (!Array.isArray(stocks) || stocks.length === 0) return null;

  const activeId = activeBranchId != null ? Number(activeBranchId) : null;
  const alternatives: BranchAvailabilityAlt[] = [];
  for (const bs of stocks) {
    const qty = Number(bs.quantity) || 0;
    if (qty <= 0) continue;
    if (activeId != null && !Number.isNaN(activeId) && Number(bs.branch_id) === activeId) {
      continue;
    }
    alternatives.push({
      branch_id: Number(bs.branch_id),
      branch_name: bs.branch_name || `Branch ${bs.branch_id}`,
      quantity: qty,
      status: "IN_STOCK",
    });
  }
  alternatives.sort((a, b) => a.branch_name.localeCompare(b.branch_name));
  return {
    productName: product.name || "Product",
    alternatives,
    availableElsewhere: alternatives.length > 0,
    hasLocalBranchData: true,
  };
}
