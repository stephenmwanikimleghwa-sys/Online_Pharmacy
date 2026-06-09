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

  const items = order.items || [];
  const subtotal = items.reduce(
    (s, it) => s + Number(it.unit_price) * Number(it.quantity),
    0
  );
  const total = Number(order.total_amount ?? subtotal);
  const discount = subtotal - total > 0 ? subtotal - total : 0;

  const dateObj = order.created_at ? new Date(order.created_at) : new Date();
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
    const name = item.product_name || item.name || "Item";
    const qty = String(item.quantity);
    const price = fmt(item.unit_price);
    const tot = fmt(Number(item.unit_price) * Number(item.quantity));
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
      </div>
    );
  };

  return (
    <div className="receipt-paper">
      {/* ── HEADER ── */}
      {withHeader && (
        <>
          <div className="r-center r-bold" style={{ fontSize: 13 }}>
            {pharmacy?.name || "TRANSCOUNTY PHARMACY MAIN"}
          </div>
          {(pharmacy?.contact_phone) && (
            <div className="r-center r-small">
              Cell: {pharmacy.contact_phone}
            </div>
          )}
          {(pharmacy?.email) && (
            <div className="r-center r-small">
              Email: {pharmacy.email}
            </div>
          )}
          {(pharmacy?.address) && (
            <div className="r-center r-small">{pharmacy.address}</div>
          )}
          {(pharmacy?.tagline) && (
            <div className="r-center r-small">{pharmacy.tagline}</div>
          )}
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
          SUBTOTALS:{" "}
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

      {/* ── FOOTER ── */}
      <div className="r-row r-small">
        <span>Served By: {servedBy}</span>
        <span>Time: {timeStr}</span>
      </div>
      <div className="r-spacer" />
      <div className="r-center r-bold r-small">We Value Your Health</div>
      <div className="r-spacer" />
      <div className="r-center r-small">
        {"- ".repeat(20)}
      </div>
    </div>
  );
};

export default ReceiptPrintout;
