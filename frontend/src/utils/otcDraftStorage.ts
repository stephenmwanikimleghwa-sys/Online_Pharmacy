/**
 * Persist an in-progress OTC sale across route changes / modal close
 * so cashiers can check prices or look something up without losing the cart.
 *
 * sessionStorage: same browser tab/session only; cleared on successful sale
 * or explicit "Clear sale".
 */

export const OTC_DRAFT_EVENT = "otc-draft-changed";

export type OtcDraftSetup = {
  complete: boolean;
  customerType: "walk-in" | "credit";
  patientName: string;
  creditCustomerId: string;
  pricingTier: "retail" | "wholesale";
};

export type OtcDraft = {
  branchId: number | string;
  selectedItems: Array<Record<string, unknown>>;
  setup: OtcDraftSetup;
  discount: string;
  paymentMethod: string;
  updatedAt: number;
};

const DRAFT_TTL_MS = 12 * 60 * 60 * 1000; // one pharmacy shift

function storageKey(branchId: number | string): string {
  return `otc_sale_draft_${branchId}`;
}

function emitChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OTC_DRAFT_EVENT));
}

export function loadOtcDraft(branchId: number | string | null | undefined): OtcDraft | null {
  if (branchId == null || typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(branchId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as OtcDraft;
    if (!draft || String(draft.branchId) !== String(branchId)) return null;
    if (!draft.updatedAt || Date.now() - draft.updatedAt > DRAFT_TTL_MS) {
      sessionStorage.removeItem(storageKey(branchId));
      emitChanged();
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function hasOtcDraftProgress(draft: OtcDraft | null | undefined): boolean {
  if (!draft) return false;
  return Boolean(draft.setup?.complete) || (Array.isArray(draft.selectedItems) && draft.selectedItems.length > 0);
}

export function saveOtcDraft(
  branchId: number | string | null | undefined,
  data: {
    selectedItems: Array<Record<string, unknown>>;
    setup: OtcDraftSetup;
    discount: string;
    paymentMethod: string;
  },
): void {
  if (branchId == null || typeof window === "undefined") return;
  const draft: OtcDraft = {
    branchId,
    selectedItems: data.selectedItems,
    setup: data.setup,
    discount: data.discount,
    paymentMethod: data.paymentMethod,
    updatedAt: Date.now(),
  };

  // Drop empty drafts so the nav badge stays clean
  if (!hasOtcDraftProgress(draft)) {
    clearOtcDraft(branchId);
    return;
  }

  try {
    sessionStorage.setItem(storageKey(branchId), JSON.stringify(draft));
    emitChanged();
  } catch {
    /* quota / private mode — non-fatal */
  }
}

export function clearOtcDraft(branchId: number | string | null | undefined): void {
  if (branchId == null || typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(storageKey(branchId));
    emitChanged();
  } catch {
    /* non-fatal */
  }
}

export function peekOtcDraftItemCount(branchId: number | string | null | undefined): number {
  const draft = loadOtcDraft(branchId);
  if (!hasOtcDraftProgress(draft)) return 0;
  return Array.isArray(draft?.selectedItems) ? draft!.selectedItems.length : 0;
}
