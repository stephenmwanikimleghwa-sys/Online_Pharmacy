import api from "./api";
import { unwrapList } from "../utils/parseApiData";

export interface ProductSearchOptions {
  branchId?: number | string | null;
  perPage?: number;
  context?: "sales" | "inventory" | "store";
}

/**
 * Single catalog search used across OTC, inventory, and quick sale.
 * Uses server-side search on /products/ then enriches via inventory list when needed.
 */
export async function searchProducts(
  term: string,
  options: ProductSearchOptions = {},
) {
  const q = (term || "").trim();
  const perPage = options.perPage ?? 200;
  let items: unknown[] = [];

  let nextPage = 1;
  while (nextPage) {
    const productRes = await api.get("/products/search/", {
      params: {
        q: q || undefined,
        page_size: perPage,
        page: nextPage,
      },
      skipGlobalErrorNotification: true,
    });
    const data = productRes.data;
    const pageItems = unwrapList(data);
    items = [...items, ...pageItems];
    if (Array.isArray((data as { results?: unknown[] })?.results)) {
      const hasNext = Boolean((data as { next?: string | null })?.next);
      nextPage = hasNext ? nextPage + 1 : 0;
    } else {
      nextPage = 0;
    }
  }

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
      params: { context: "inventory", search: q, page_size: perPage },
      skipGlobalErrorNotification: true,
    });
    items = unwrapList(broadRes.data);
  }

  return items;
}

export async function fetchBranchCatalog(options: ProductSearchOptions = {}) {
  const perPage = options.perPage ?? 200;
  let all: unknown[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const invRes = await api.get("/products/", {
      params: {
        context: options.context || "sales",
        page_size: perPage,
        page,
      },
      skipGlobalErrorNotification: true,
    });
    const data = invRes.data;
    const items = unwrapList(data);
    all = [...all, ...items];
    if (Array.isArray((data as { results?: unknown[] })?.results)) {
      hasNext = Boolean((data as { next?: string | null })?.next);
      page += 1;
    } else {
      hasNext = false;
    }
  }

  return all;
}
