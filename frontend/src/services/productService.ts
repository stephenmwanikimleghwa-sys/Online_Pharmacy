import api from "./api";
import { unwrapList } from "../utils/parseApiData";

export interface ProductSearchOptions {
  branchId?: number | string | null;
  perPage?: number;
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
  const perPage = options.perPage ?? 100;

  const productRes = await api.get("/products/search/", {
    params: {
      q: q || undefined,
      page_size: perPage,
    },
    skipGlobalErrorNotification: true,
  });

  let items = unwrapList(productRes.data);

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

  return items;
}

export async function fetchBranchCatalog(options: ProductSearchOptions = {}) {
  const perPage = options.perPage ?? 500;
  const invRes = await api.get("/products/", {
    params: {
      context: "sales",
      page_size: perPage,
    },
    skipGlobalErrorNotification: true,
  });
  return unwrapList(invRes.data);
}
