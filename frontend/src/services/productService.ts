import api from "./api";
import { unwrapList } from "../utils/parseApiData";

export interface ProductSearchOptions {
  branchId?: number | string | null;
  perPage?: number;
  context?: "sales" | "inventory" | "store";
  /** When false (default), only fetch the first page — avoids multi-thousand product dumps. */
  fetchAllPages?: boolean;
}

/**
 * Single catalog search used across OTC, inventory, and quick sale.
 * Prefer /products/search/ then a single inventory fallback — no multi-page crawl.
 */
export async function searchProducts(
  term: string,
  options: ProductSearchOptions = {},
) {
  const q = (term || "").trim();
  const perPage = Math.min(options.perPage ?? 80, 200);
  let items: unknown[] = [];

  const productRes = await api.get("/products/search/", {
    params: {
      q: q || undefined,
      page_size: perPage,
      page: 1,
    },
    skipGlobalErrorNotification: true,
  });
  items = unwrapList(productRes.data);

  if (items.length === 0 && q.length >= 2) {
    const invRes = await api.get("/inventory/list/", {
      params: {
        search: q,
        per_page: perPage,
        branch: options.branchId || undefined,
      },
      skipGlobalErrorNotification: true,
    });
    items = (invRes.data as { products?: unknown[] })?.products ?? [];
  }

  if (items.length === 0 && q.length >= 2 && options.context === "inventory") {
    const broadRes = await api.get("/products/", {
      params: {
        context: "inventory",
        search: q,
        page_size: perPage,
      },
      skipGlobalErrorNotification: true,
    });
    items = unwrapList(broadRes.data);
  }

  return items;
}

/**
 * Branch catalog for OTC / quick sale.
 * Uses sales context (in-stock at active branch) and a single page by default.
 */
export async function fetchBranchCatalog(options: ProductSearchOptions = {}) {
  const perPage = Math.min(options.perPage ?? 200, 500);
  const context = options.context || "sales";
  const fetchAll = Boolean(options.fetchAllPages);

  let all: unknown[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const invRes = await api.get("/products/", {
      params: {
        context,
        page_size: perPage,
        page,
      },
      skipGlobalErrorNotification: true,
    });
    const data = invRes.data;
    const items = unwrapList(data);
    all = [...all, ...items];
    if (fetchAll && Array.isArray((data as { results?: unknown[] })?.results)) {
      hasNext = Boolean((data as { next?: string | null })?.next);
      page += 1;
      if (page > 20) hasNext = false; // hard safety cap
    } else {
      hasNext = false;
    }
  }

  return all;
}
