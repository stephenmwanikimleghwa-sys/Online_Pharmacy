import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon, PrinterIcon } from "@heroicons/react/24/outline";
import ReceiptPrintout from "./ReceiptPrintout";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const normalizePharmacyData = (payload) => {
  if (Array.isArray(payload)) return payload[0] || null;
  if (payload?.results && Array.isArray(payload.results)) return payload.results[0] || null;
  if (payload?.data && Array.isArray(payload.data)) return payload.data[0] || null;
  if (payload?.data && payload.data && typeof payload.data === "object") {
    return payload.data;
  }
  return payload && typeof payload === "object" ? payload : null;
};

/**
 * ReceiptModal
 * Shows a receipt preview with two print buttons:
 *   [Print with pharmacy name]   [Print without pharmacy name]
 *
 * Props:
 *   order    – the order object (with .items, .total_amount, .id, .created_at, etc.)
 *   onClose  – called when the modal is dismissed
 */
const ReceiptModal = ({ order, onClose }) => {
  const [pharmacy, setPharmacy] = useState(null);
  const [withHeader, setWithHeader] = useState(true);
  const printRef = useRef(null);
  const { user } = useAuth();
  const [printedOnce, setPrintedOnce] = useState(false);

  useEffect(() => {
    try {
      const payload = JSON.parse(localStorage.getItem('printed_receipts') || '{}');
      setPrintedOnce(Boolean(payload[String(order?.id)]));
    } catch (e) {
      setPrintedOnce(false);
    }
  }, [order]);

  /* Fetch pharmacy profile once */
  useEffect(() => {
    api
      .get("/auth/pharmacies/")
      .then((res) => {
        const normalized = normalizePharmacyData(res.data);
        setPharmacy(normalized && typeof normalized === "object" ? normalized : null);
      })
      .catch(() => setPharmacy(null));
  }, []);

  /* Lock body scroll while modal is open */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  /* ----- print handler ----- */
  const handlePrint = (includeHeader) => {
    const allowedRoles = ["admin", "pharmacist", "cashier"];
    const isPrivileged = user && allowedRoles.includes(user.role);
    if (!isPrivileged && printedOnce) {
      window.alert('Printing restricted: receipt has already been printed once.');
      return;
    }
    setWithHeader(includeHeader);

    /* Give React one tick to re-render the hidden printout with correct header */
    setTimeout(() => {
      const printContent = document.getElementById("receipt-printout").innerHTML;
      const iframe = document.createElement("iframe");
      
      // Hide the iframe off-screen
      iframe.style.position = "absolute";
      iframe.style.width = "0px";
      iframe.style.height = "0px";
      iframe.style.border = "none";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      const normalizeForFile = (value, fallback = 'unknown') => {
        const text = String(value || fallback)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');
        return text || fallback;
      };
      const safeBranch = normalizeForFile(order?.branch_name || 'Transcounty Main');
      const safeDate = new Date(order?.created_at || order?.dispensed_at || Date.now())
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, '');
      const paymentMethod = (
        order?.payment_mode ||
        order?.payment_method ||
        order?.payment?.method ||
        order?.payment?.payment_mode ||
        'unknown'
      );
      const receiptTitle = `${safeBranch}_receipt_${order?.id || 'NEW'}_${normalizeForFile(paymentMethod)}_${safeDate}.pdf`;
      
      doc.write(`
        <html>
          <head>
            <title>${receiptTitle}</title>
            <style>
              @page {
                size: 80mm auto;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 8mm 3mm 4mm 3mm; /* increased top padding to prevent cutoff */
                background: #fff;
                color: #000 !important;
                font-family: 'Courier New', Courier, monospace;
                font-size: 11px;
                font-weight: 600; /* Bolder text for clearer thermal print */
                line-height: 1.4;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .receipt-paper {
                width: 100%;
                max-width: 80mm;
              }
              .r-center  { text-align: center; }
              .r-bold    { font-weight: 700; }
              .r-dash    { border-top: 1px dashed #333; margin: 5px 0; }
              .r-dash-solid { border-top: 1px solid #333; margin: 5px 0; }
              .r-row     { display: flex; justify-content: space-between; gap: 4px; }
              .r-row-right { text-align: right; }
              .r-small   { font-size: 10px; }
              .r-spacer  { height: 4px; }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      doc.close();

      iframe.contentWindow.focus();
      // Wait for iframe layout then trigger print
      setTimeout(() => {
        iframe.contentWindow.print();
        // Mark as printed for non-privileged users
        try {
          const allowedPrint = (user && ["admin","pharmacist","cashier"].includes(user.role));
          if (!allowedPrint) {
            const key = 'printed_receipts';
            const payload = JSON.parse(localStorage.getItem(key) || "{}");
            payload[String(order.id)] = true;
            localStorage.setItem(key, JSON.stringify(payload));
            setPrintedOnce(true);
          }
        } catch (e) {}

        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 250);
    }, 80);
  };

  /* Close on backdrop click */
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!order) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={handleBackdropClick}
    >
      {/* ── Hidden printout portal — only shown by @media print ── */}
      <div
        id="receipt-printout"
        style={{ display: "none" }}
        aria-hidden="true"
      >
        <ReceiptPrintout
          order={order}
          pharmacy={pharmacy}
          withHeader={withHeader}
        />
      </div>

      {/* ── Modal card ── */}
      <div
        className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-primary)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border-primary)" }}
        >
          <div className="flex items-center gap-2">
            <PrinterIcon className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
              Receipt Preview
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable receipt preview */}
        <div
          className="overflow-y-auto p-4"
          style={{ maxHeight: "55vh" }}
          ref={printRef}
        >
          <ReceiptPrintout
            order={order}
            pharmacy={pharmacy}
            withHeader={withHeader}
          />
        </div>

        {/* Toggle header preview */}
        <div
          className="px-4 pb-2 flex items-center gap-2"
          style={{ borderTop: "1px solid var(--border-primary)", paddingTop: 10 }}
        >
          <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
            Preview:
          </span>
          <button
            onClick={() => setWithHeader(true)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              withHeader
                ? "bg-purple-600 text-white border-purple-600"
                : "text-slate-500 border-slate-300 hover:border-purple-400"
            }`}
          >
            With header
          </button>
          <button
            onClick={() => setWithHeader(false)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              !withHeader
                ? "bg-purple-600 text-white border-purple-600"
                : "text-slate-500 border-slate-300 hover:border-purple-400"
            }`}
          >
            Without header
          </button>
        </div>

        {/* Print buttons */}
        <div className="p-4 pt-2 flex flex-col gap-2">
          <button
            onClick={() => handlePrint(true)}
            disabled={user && !["admin","pharmacist","cashier"].includes(user.role) && printedOnce}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white transition-all"
            style={{ background: "linear-gradient(135deg,#7c3aed,#c026d3)", opacity: (user && !["admin","pharmacist","cashier"].includes(user.role) && printedOnce) ? 0.5 : 1 }}
          >
            <PrinterIcon className="h-4 w-4" />
            Print with pharmacy name
          </button>
          <button
            onClick={() => handlePrint(false)}
            disabled={user && !["admin","pharmacist","cashier"].includes(user.role) && printedOnce}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold border transition-colors text-sm"
            style={{
              borderColor: "var(--border-primary)",
              color: "var(--text-primary)",
              background: "var(--bg-field)",
              opacity: (user && !["admin","pharmacist","cashier"].includes(user.role) && printedOnce) ? 0.5 : 1
            }}
          >
            <PrinterIcon className="h-4 w-4" />
            Print without pharmacy name
          </button>
          {user && !["admin","pharmacist","cashier"].includes(user.role) && printedOnce && (
            <div className="text-xs text-center text-red-600" style={{ marginTop: 6 }}>
              Receipt already printed once — printing disabled for this user.
            </div>
          )}
          <button
            onClick={onClose}
            className="w-full text-xs text-center py-2 rounded-xl transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ReceiptModal;
