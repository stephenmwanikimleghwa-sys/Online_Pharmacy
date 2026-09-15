import React from "react";

/**
 * Thermal 80mm sales receipt.
 * Branding is branch-specific (Peakfarm vs Transcounty Main/Annex).
 * Item columns use a fixed table — CSS grid often overlaps on thermal print engines.
 */

const BRANCH_PROFILES = {
  peakfarm: {
    name: "PEAKFARM ENTERPRISES",
    phone: "0720 - 246 - 981",
    email: "peakfarmagrovet@gmail.com",
    address: "Starehe Building, Laini Moja",
    tagline: "Dealers in seeds, fertilizers, animal feeds & farm products.",
    closing: "The Farmers' Choice",
  },
  main: {
    name: "TranscountyPharmacy_Main",
    phone: "0720 - 246 - 981",
    email: "transcountypharmacy@gmail.com",
    address: "Modern Building, Laini Moja",
    tagline: "Dealers in Human Drugs & Surgical Products",
    closing: "We Value Your Health",
  },
  annex: {
    name: "TranscountyPharmacy_Annex",
    phone: "0720 - 246 - 981",
    email: "transcountypharmacy@gmail.com",
    address: "Bamila Building, Opp. Total Filling station",
    tagline: "Dealers in Human Drugs & Surgical Products",
    closing: "We Value Your Health",
  },
};

function resolveBranchKey(branchName = "", branchType = "") {
  const n = String(branchName || "").toLowerCase();
  const t = String(branchType || "").toLowerCase();
  if (n.includes("peak") || n.includes("agrovet") || t === "agrovet") return "peakfarm";
  if (n.includes("annex")) return "annex";
  return "main";
}

function normalizeText(value, fallback = "") {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  return value || fallback;
}

function isPlaceholderValue(value) {
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
    "modern building",
    "laini moja",
  ].some((placeholder) => text.includes(placeholder));
}

function formatPhone(raw, fallbackPhone) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("254")) {
    const local = `0${digits.slice(3)}`;
    return `${local.slice(0, 4)} - ${local.slice(4, 7)} - ${local.slice(7)}`;
  }
  if (digits.length === 10 && digits.startsWith("0")) {
    return `${digits.slice(0, 4)} - ${digits.slice(4, 7)} - ${digits.slice(7)}`;
  }
  return normalizeText(raw, fallbackPhone);
}

const TABLE_STYLE = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: "10px",
};

const TH_STYLE = {
  fontWeight: 700,
  padding: "0 1px 2px 0",
  verticalAlign: "bottom",
};

const TD_STYLE = {
  padding: "1px 1px 2px 0",
  verticalAlign: "top",
  wordBreak: "break-word",
};

const NUM_STYLE = {
  ...TD_STYLE,
  textAlign: "right",
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
};

const ReceiptPrintout = ({ order, pharmacy, withHeader = true }) => {
  if (!order) return null;

  const branchName = normalizeText(
    order?.branch_name || order?.branch?.name || pharmacy?.name,
    "",
  );
  const branchType =
    order?.branch_type ||
    order?.branch?.branch_type ||
    pharmacy?.branch_type ||
    "";
  const profile = BRANCH_PROFILES[resolveBranchKey(branchName, branchType)];

  const rawPhone =
    order?.branch_contact_phone ||
    order?.branch?.contact_phone ||
    pharmacy?.contact_phone ||
    pharmacy?.phone ||
    "";

  const displayPharmacy = {
    name: profile.name,
    phone: formatPhone(
      isPlaceholderValue(rawPhone) ? profile.phone : rawPhone,
      profile.phone,
    ),
    email: profile.email,
    address: profile.address,
    tagline: profile.tagline,
    closing: profile.closing,
  };

  const items =
    (Array.isArray(order?.items) && order.items) ||
    (Array.isArray(order?.dispensation_items) && order.dispensation_items) ||
    (Array.isArray(order?.data?.items) && order.data.items) ||
    (Array.isArray(order?.dispensation?.items) && order.dispensation.items) ||
    [];
  const isOfflinePending = Boolean(order?.offline);

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
  /** Compact amounts for narrow thermal columns (avoid 1,234.00 blowing PRICE/TOT). */
  const fmtAmt = (n) => {
    const v = Number(n) || 0;
    if (Number.isInteger(v)) return String(v);
    return v.toFixed(2);
  };

  return (
    <div className="receipt-paper">
      {withHeader && (
        <>
          <div className="r-center r-bold" style={{ fontSize: 12 }}>
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

      <table className="r-items" style={TABLE_STYLE}>
        <colgroup>
          <col style={{ width: "9%" }} />
          <col style={{ width: "41%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "20%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ ...TH_STYLE, textAlign: "left" }}>No.</th>
            <th style={{ ...TH_STYLE, textAlign: "left" }}>NAME</th>
            <th style={{ ...TH_STYLE, textAlign: "right" }}>PRICE</th>
            <th style={{ ...TH_STYLE, textAlign: "right" }}>QTY</th>
            <th style={{ ...TH_STYLE, textAlign: "right" }}>TOT.</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={5} className="r-center r-small" style={TD_STYLE}>
                No items
              </td>
            </tr>
          ) : (
            items.map((item, idx) => {
              const name =
                item.product_details?.name || item.product_name || item.name || "Item";
              const qty = Number(item.quantity) || 0;
              const unitPrice =
                Number(item.price_per_unit || item.unit_price || item.unitPrice) || 0;
              const lineTot = unitPrice * qty;
              return (
                <tr key={item.id || idx}>
                  <td style={TD_STYLE}>{idx + 1}.</td>
                  <td style={TD_STYLE}>{name}</td>
                  <td style={NUM_STYLE}>{fmtAmt(unitPrice)}</td>
                  <td style={NUM_STYLE}>{qty}</td>
                  <td style={NUM_STYLE}>{fmtAmt(lineTot)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

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
      {/* Served By only with pharmacy header — omit entirely when printing without header */}
      <div
        className="r-row r-small"
        style={withHeader ? undefined : { justifyContent: "flex-end" }}
      >
        {withHeader ? <span>Served By: {servedBy}</span> : null}
        <span>Time: {timeStr}</span>
      </div>
      <div className="r-spacer" />
      <div className="r-center r-bold r-small">{displayPharmacy.closing}</div>
      <div className="r-dash" />
    </div>
  );
};

export default ReceiptPrintout;
