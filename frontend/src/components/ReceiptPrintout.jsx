import React from "react";

/**
 * ReceiptPrintout
 * Renders a thermal‑style 80mm receipt layout.
 * withHeader=true → includes pharmacy name / contact / address / tagline block.
 * This component is rendered both inside the modal preview AND in the hidden
 * #receipt-printout div that the @media print CSS reveals.
 */
const ReceiptPrintout = ({ order, pharmacy, withHeader = true }) => {
  if (!order) return null;

  const DEFAULT_RECEIPT_DETAILS = {
    name: "Transcounty Main",
    phone: "+254726246981",
    email: "transcountypharm@yahoo.com",
    address: "Modern Building - Laini Moja Kitale",
    tagline: "Dealers in Human Drugs & Surgical products",
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
    if (isPlaceholderValue(text)) {
      return fallback;
    }
    return text || fallback;
  };

  const items = order.items || [];
  const branchName = normalizeText(order?.branch_name, "");
  const branchAddress = safeText(
    order?.branch_address || order?.branch?.address || order?.location?.address,
    pharmacy?.address || ""
  );
  const branchPhone = safeText(
    order?.branch_contact_phone || order?.branch?.contact_phone || order?.contact_phone,
    pharmacy?.contact_phone || ""
  );
  const branchEmail = safeText(
    order?.branch_email || order?.branch?.email || order?.email,
    pharmacy?.email || ""
  );
  const branchTagline = safeText(
    order?.branch_tagline || order?.branch?.tagline,
    pharmacy?.tagline || ""
  );

  const displayPharmacy = {
    name: normalizeText(branchName || pharmacy?.name, DEFAULT_RECEIPT_DETAILS.name),
    phone: normalizeText(branchPhone, DEFAULT_RECEIPT_DETAILS.phone),
    email: normalizeText(branchEmail, DEFAULT_RECEIPT_DETAILS.email),
    address: normalizeText(branchAddress, DEFAULT_RECEIPT_DETAILS.address),
    tagline: normalizeText(branchTagline, DEFAULT_RECEIPT_DETAILS.tagline),
  };
  
  const subtotal = items.reduce(
    (s, it) => s + (Number(it.price_per_unit || it.unit_price || it.unitPrice) || 0) * (Number(it.quantity) || 0),
    0
  );
  
  const totalQuantity = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  
  // Total amount from backend or calculated subtotal
  const total = Number(order.total_amount) || subtotal;
  
  // Discount is calculated or from backend
  const discount = order.discount_amount ? Number(order.discount_amount) : (subtotal - total > 0 ? subtotal - total : 0);

  const dateObj = order.created_at || order.dispensed_at ? new Date(order.created_at || order.dispensed_at) : new Date();
  const dateStr = dateObj.toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = dateObj.toLocaleTimeString("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const servedBy =
    order.dispensed_by_name ||
    order.user_full_name ||
    order.user_name ||
    order.user ||
    "Staff";

  const refNo = String(order.id || "").padStart(4, "0");

  /* ── format currency ── */
  const fmt = (n) => Number(n).toFixed(2);

  /* ── column widths for item table ──
     No. | NAME (variable) | QTY | PRICE | TOT
     We work in character units; 40 chars ≈ 80mm at 11 px courier */
  const LINE_WIDTH = 40;

  const renderItemRow = (item, idx) => {
    const name = item.product_details?.name || item.product_name || item.name || "Item";
    const qty = String(Number(item.quantity) || 0);
    const unitPrice = Number(item.price_per_unit || item.unit_price || item.unitPrice) || 0;
    const price = fmt(unitPrice);
    const tot = fmt(unitPrice * (Number(item.quantity) || 0));
    const numCol = String(idx + 1) + ".";

    // Right portion: "QTY  PRICE   TOT"
    const rightPart = `${qty.padStart(3)}  ${price.padStart(7)}  ${tot.padStart(7)}`;
    const nameWidth = LINE_WIDTH - numCol.length - 1 - rightPart.length;

    // Split name into lines if too long
    const words = name.split(" ");
    const nameLines = [];
    let currentLine = "";
    for (const word of words) {
      if ((currentLine + (currentLine ? " " : "") + word).length <= nameWidth) {
        currentLine += (currentLine ? " " : "") + word;
      } else {
        if (currentLine) nameLines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) nameLines.push(currentLine);

    const batch = item.batch_number || item.batch || item.batchNumber || "";
    const expiryRaw = item.expiry_date || item.expiry || item.expiryDate || null;
    const expiryFmt = expiryRaw ? new Date(expiryRaw).toLocaleDateString("en-KE", { day: '2-digit', month: 'short', year: 'numeric' }) : "";

    return (
      <div key={item.id || idx} style={{ marginBottom: 1 }}>
        {/* First line: No + first name line + QTY PRICE TOT */}
        <div className="r-row">
          <span style={{ whiteSpace: "pre" }}>
            {numCol.padEnd(numCol.length + 1)}
            {(nameLines[0] || "").padEnd(nameWidth)}
          </span>
          <span style={{ whiteSpace: "pre", flexShrink: 0 }}>{rightPart}</span>
        </div>
        {/* Continuation lines for long names (indented, no amounts) */}
        {nameLines.slice(1).map((l, li) => (
          <div key={li} style={{ paddingLeft: numCol.length + 1 + "ch" }}>
            {l}
          </div>
        ))}
        {/* Batch and Expiry info line */}
        <div className="r-row r-small" style={{ marginTop: 2 }}>
          <span style={{ whiteSpace: "pre" }}>
            {`Batch: ${batch || '-'}  Exp: ${expiryFmt || '-'}`}
          </span>
          <span style={{ whiteSpace: "pre", flexShrink: 0 }} />
        </div>
      </div>
    );
  };

  return (
    <div className="receipt-paper">
      {/* ── HEADER ── */}
      {withHeader && (
        <>
          <div className="r-center r-bold" style={{ fontSize: 13 }}>
            {displayPharmacy.name}
          </div>
          {order?.branch_name && order.branch_name !== displayPharmacy.name && (
            <div className="r-center r-bold" style={{ fontSize: 11, marginTop: '2px' }}>
              Branch: {order.branch_name}
            </div>
          )}
          <div className="r-center r-small">
            Cell: {displayPharmacy.phone}
          </div>
          <div className="r-center r-small">
            Email: {displayPharmacy.email}
          </div>
          <div className="r-center r-small">
            {displayPharmacy.address}
          </div>
          <div className="r-center r-small">
            {displayPharmacy.tagline}
          </div>
          <div className="r-dash-solid" />
        </>
      )}

      {/* ── TITLE ── */}
      <div className="r-center r-bold" style={{ letterSpacing: 2 }}>
        SALES RECEIPT
      </div>
      <div className="r-dash" />

      {/* ── BILL TO / REF / DATE ── */}
      <div className="r-small">
        Bill To: Walk In Customer
      </div>
      <div className="r-row r-small">
        <span>Ref No: #{refNo}</span>
        <span>Date: {dateStr}</span>
      </div>
      <div className="r-dash" />

      {/* ── COLUMN HEADERS ── */}
      <div className="r-row" style={{ fontWeight: 700 }}>
        <span style={{ whiteSpace: "pre" }}>{"No. NAME                  "}</span>
        <span style={{ whiteSpace: "pre", flexShrink: 0 }}>{"QTY    PRICE      TOT"}</span>
      </div>
      <div className="r-row r-small" style={{ fontWeight: 700 }}>
        <span style={{ whiteSpace: "pre" }}>{"(Batch / Expiry shown per item)"}</span>
        <span style={{ whiteSpace: "pre", flexShrink: 0 }} />
      </div>
      <div className="r-dash" />

      {/* ── ITEMS ── */}
      <div>
        {items.length === 0 ? (
          <div className="r-center r-small">No items</div>
        ) : (
          items.map((item, idx) => renderItemRow(item, idx))
        )}
      </div>
      <div className="r-dash" />

      {/* ── TOTALS ── */}
      <div className="r-row r-small">
        <span />
        <span>
          SUBTOTAL:{" "}
          <strong>KES {fmt(subtotal)}</strong>
        </span>
      </div>
      {discount > 0 && (
        <div className="r-row r-small">
          <span />
          <span>
            DISCOUNT: &nbsp;KES {fmt(discount)}
          </span>
        </div>
      )}
      <div className="r-row" style={{ fontWeight: 700 }}>
        <span />
        <span>
          TOTAL:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;KES {fmt(total)}
        </span>
      </div>
      <div className="r-dash" />
      <div className="r-row r-small" style={{ fontWeight: 700 }}>
        <span>Total Items Sold:</span>
        <span>{totalQuantity}</span>
      </div>
      <div className="r-dash" />

      {/* ── FOOTER ── */}
      <div className="r-row r-small">
        <span>Served By: {servedBy}</span>
        <span>Time: {timeStr}</span>
      </div>
      <div className="r-spacer" />
      <div className="r-center r-small" style={{ fontStyle: 'italic', marginTop: '4px', marginBottom: '4px' }}>
        The amount is in KSHS. and VAT inclusive where applicable.
      </div>
      <div className="r-center r-bold r-small">We Value Your Health</div>
      <div className="r-spacer" />
      <div className="r-center r-small">
        {"- ".repeat(20)}
      </div>
    </div>
  );
};

export default ReceiptPrintout;
