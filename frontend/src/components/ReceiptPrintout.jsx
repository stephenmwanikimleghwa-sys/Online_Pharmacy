import React, { useEffect, useRef } from "react";

/**
 * Thermal 80mm sales receipt — matches Transcounty Pharmacy Main printed format:
 * header → SALES RECEIPT → Bill To / Ref / Date → No. NAME PRICE QTY TOT. →
 * SUBTOTALS / DISCOUNT / NET TOTAL → Served By / Time → We Value Your Health
 */
const ReceiptPrintout = ({ order, pharmacy, withHeader = true }) => {
  if (!order) return null;

  const DEFAULT_RECEIPT_DETAILS = {
    name: "TRANSCOUNTY PHARMACY MAIN",
    phone: "0720 - 246 - 981",
    email: "transcountypharmacy@gmail.com",
    address: "Modern Building, Laini Moja",
    tagline: "Dealers in Human Drugs & Surgical Products",
  };

  const normalizeText = (value, fallback = "") => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed || fallback;
    }
    return value || fallback;
  };

  const isPlaceholderValue = (value) => {
    const text = String(normalizeText(value, "")).toLowerCase();
    if (!text) return true;
    return [
      "123 main st",
      "123 health street",
      "123 health street, nairobi",
      "123 health street, nairobi, kenya",
      "sample address",
      "demo address",
      "placeholder",
      "n/a",
      "unknown",
    ].some((placeholder) => text.includes(placeholder));
  };

  const safeText = (value, fallback = "") => {
    const text = normalizeText(value, fallback);
    if (isPlaceholderValue(text)) return fallback;
    return text || fallback;
  };

  const formatPhone = (raw) => {
    const digits = String(raw || "").replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("254")) {
      const local = `0${digits.slice(3)}`;
      return `${local.slice(0, 4)} - ${local.slice(4, 7)} - ${local.slice(7)}`;
    }
    if (digits.length === 10 && digits.startsWith("0")) {
      return `${digits.slice(0, 4)} - ${digits.slice(4, 7)} - ${digits.slice(7)}`;
    }
    return normalizeText(raw, DEFAULT_RECEIPT_DETAILS.phone);
  };

  const items =
    (Array.isArray(order?.items) && order.items) ||
    (Array.isArray(order?.dispensation_items) && order.dispensation_items) ||
    (Array.isArray(order?.data?.items) && order.data.items) ||
    (Array.isArray(order?.dispensation?.items) && order.dispensation.items) ||
    [];
  const isOfflinePending = Boolean(order?.offline);
  const branchName = normalizeText(order?.branch_name, "");
  const branchAddress = safeText(
    order?.branch_address || order?.branch?.address || order?.location?.address,
    pharmacy?.address || "",
  );
  const branchPhone = safeText(
    order?.branch_contact_phone || order?.branch?.contact_phone || order?.contact_phone,
    pharmacy?.contact_phone || "",
  );
  const branchEmail = safeText(
    order?.branch_email || order?.branch?.email || order?.email,
    pharmacy?.email || "",
  );
  const branchTagline = safeText(
    order?.branch_tagline || order?.branch?.tagline,
    pharmacy?.tagline || "",
  );

  const persisted = useRef({});

  useEffect(() => {
    const trySet = (key, val, fallback) => {
      const current = String(persisted.current[key] || "");
      if (current && !isPlaceholderValue(current)) return;
      const candidate = normalizeText(val, fallback);
      if (candidate && !isPlaceholderValue(candidate)) persisted.current[key] = candidate;
    };

    trySet("name", branchName || pharmacy?.name, DEFAULT_RECEIPT_DETAILS.name);
    trySet(
      "phone",
      branchPhone || pharmacy?.contact_phone || pharmacy?.phone,
      DEFAULT_RECEIPT_DETAILS.phone,
    );
    trySet("email", branchEmail || pharmacy?.email, DEFAULT_RECEIPT_DETAILS.email);
    trySet("address", branchAddress || pharmacy?.address, DEFAULT_RECEIPT_DETAILS.address);
    trySet("tagline", branchTagline || pharmacy?.tagline, DEFAULT_RECEIPT_DETAILS.tagline);
  }, [branchName, branchAddress, branchPhone, branchEmail, branchTagline, pharmacy]);

  const displayPharmacy = {
    name: normalizeText(
      persisted.current.name || branchName || pharmacy?.name,
      DEFAULT_RECEIPT_DETAILS.name,
    ).toUpperCase(),
    phone: formatPhone(
      persisted.current.phone ||
        branchPhone ||
        pharmacy?.contact_phone ||
        pharmacy?.phone ||
        DEFAULT_RECEIPT_DETAILS.phone,
    ),
    email: normalizeText(
      persisted.current.email || branchEmail || pharmacy?.email,
      DEFAULT_RECEIPT_DETAILS.email,
    ),
    address: normalizeText(
      persisted.current.address || branchAddress || pharmacy?.address,
      DEFAULT_RECEIPT_DETAILS.address,
    ),
    tagline: normalizeText(
      persisted.current.tagline || branchTagline || pharmacy?.tagline,
      DEFAULT_RECEIPT_DETAILS.tagline,
    ),
  };

  const subtotal = items.reduce(
    (s, it) =>
      s +
      (Number(it.price_per_unit || it.unit_price || it.unitPrice) || 0) *
        (Number(it.quantity) || 0),
    0,
  );

  const total =
    order.total_amount !== null && order.total_amount !== undefined
      ? Number(order.total_amount)
      : subtotal;

  const discountKes =
    order.discount !== null && order.discount !== undefined && Number(order.discount) > 0
      ? Number(order.discount)
      : subtotal - total > 0
        ? subtotal - total
        : 0;

  const dateObj =
    order.created_at || order.dispensed_at
      ? new Date(order.created_at || order.dispensed_at)
      : new Date();
  const dateStr = dateObj.toISOString().slice(0, 10);
  const timeStr = dateObj.toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const servedBy =
    order.dispensed_by_name ||
    order.user_full_name ||
    order.user_name ||
    order.user ||
    "Staff";

  const refNo = order.id != null && order.id !== "" ? String(order.id) : "—";

  const fmt = (n) =>
    Number(n).toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const fmtInt = (n) => {
    const v = Number(n);
    return Number.isInteger(v) ? String(v) : v.toFixed(2);
  };

  // No. | NAME | PRICE | QTY | TOT.  (~40 chars at courier 11px / 80mm)
  const LINE_WIDTH = 42;

  const renderItemRow = (item, idx) => {
    const name = item.product_details?.name || item.product_name || item.name || "Item";
    const qty = String(Number(item.quantity) || 0);
    const unitPrice = Number(item.price_per_unit || item.unit_price || item.unitPrice) || 0;
    const lineTot = unitPrice * (Number(item.quantity) || 0);
    const numCol = `${idx + 1}.`;
    // Physical layout: PRICE then QTY then TOT.
    const rightPart = `${fmtInt(unitPrice).padStart(6)} ${qty.padStart(4)} ${fmtInt(lineTot).padStart(7)}`;
    const nameWidth = Math.max(8, LINE_WIDTH - numCol.length - 1 - rightPart.length);

    const words = String(name).split(/\s+/);
    const nameLines = [];
    let currentLine = "";
    for (const word of words) {
      const next = currentLine ? `${currentLine} ${word}` : word;
      if (next.length <= nameWidth) {
        currentLine = next;
      } else {
        if (currentLine) nameLines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) nameLines.push(currentLine);

    return (
      <div key={item.id || idx} style={{ marginBottom: 2 }}>
        <div className="r-row">
          <span style={{ whiteSpace: "pre" }}>
            {numCol.padEnd(numCol.length + 1)}
            {(nameLines[0] || "").padEnd(nameWidth)}
          </span>
          <span style={{ whiteSpace: "pre", flexShrink: 0 }}>{rightPart}</span>
        </div>
        {nameLines.slice(1).map((line, li) => (
          <div key={li} style={{ paddingLeft: `${numCol.length + 1}ch` }}>
            {line}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="receipt-paper">
      {withHeader && (
        <>
          <div className="r-center r-bold" style={{ fontSize: 13 }}>
            {displayPharmacy.name}
          </div>
          <div className="r-center r-small">Cell: {displayPharmacy.phone}</div>
          <div className="r-center r-small">Email: {displayPharmacy.email}</div>
          <div className="r-center r-small">{displayPharmacy.address}</div>
          <div className="r-center r-small">{displayPharmacy.tagline}</div>
        </>
      )}

      <div className="r-dash" />
      <div className="r-center r-bold" style={{ letterSpacing: 1 }}>
        SALES RECEIPT
      </div>
      {isOfflinePending && (
        <>
          <div className="r-center r-small" style={{ fontWeight: 700, marginTop: 4 }}>
            *** PENDING SERVER SYNC ***
          </div>
          <div className="r-center r-small">Not on sales report until this device syncs</div>
        </>
      )}
      <div className="r-dash" />

      <div className="r-small">
        Bill To:{" "}
        <span style={{ textDecoration: "underline" }}>
          {order.customer_name || order.patient_name || "Walk In Customer"}
        </span>
      </div>
      <div className="r-row r-small">
        <span>Ref. No: {refNo}</span>
        <span>Date: {dateStr}</span>
      </div>
      <div className="r-dash" />

      <div className="r-row" style={{ fontWeight: 700 }}>
        <span style={{ whiteSpace: "pre" }}>{"No. NAME"}</span>
        <span style={{ whiteSpace: "pre", flexShrink: 0 }}>{"PRICE  QTY    TOT."}</span>
      </div>
      <div className="r-dash" />

      <div>
        {items.length === 0 ? (
          <div className="r-center r-small">No items</div>
        ) : (
          items.map((item, idx) => renderItemRow(item, idx))
        )}
      </div>

      <div className="r-dash-solid" />

      <div className="r-row r-small">
        <span />
        <span>
          SUBTOTALS: <strong>{fmt(subtotal)}</strong>
        </span>
      </div>
      <div className="r-row r-small">
        <span />
        <span>
          DISCOUNT: <strong>{fmt(discountKes)}</strong>
        </span>
      </div>
      <div className="r-row" style={{ fontWeight: 700 }}>
        <span />
        <span>NET TOTAL: {fmt(total)}</span>
      </div>

      <div className="r-dash" />
      <div className="r-row r-small">
        <span>Served By: {servedBy}</span>
        <span>Time: {timeStr}</span>
      </div>
      <div className="r-spacer" />
      <div className="r-center r-bold r-small">We Value Your Health</div>
      <div className="r-dash" />
    </div>
  );
};

export default ReceiptPrintout;
