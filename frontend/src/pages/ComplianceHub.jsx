import React, { Suspense, lazy, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { PanelSkeleton } from "../components/ui/Skeleton";

const DocumentRegistry = lazy(() => import("./DocumentRegistry"));
const PharmacyLicensing = lazy(() => import("./PharmacyLicensing"));

const TABS = [
  { id: "documents", label: "Documents" },
  { id: "licensing", label: "Licensing" },
];

/**
 * Merged Documents + Licensing under one Compliance sidebar entry.
 */
const ComplianceHub = () => {
  const [params, setParams] = useSearchParams();
  const tab = useMemo(() => {
    const raw = (params.get("tab") || "documents").toLowerCase();
    return TABS.some((t) => t.id === raw) ? raw : "documents";
  }, [params]);

  const setTab = (id) => {
    const next = new URLSearchParams(params);
    next.set("tab", id);
    setParams(next, { replace: true });
  };

  return (
    <div className="animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div
          className="inline-flex p-1 rounded-xl border"
          style={{ background: "var(--bg-field)", borderColor: "var(--border-primary)" }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="px-5 py-2.5 rounded-lg text-xs font-bold transition-colors"
              style={
                tab === t.id
                  ? { background: "var(--btn-gradient)", color: "#fff" }
                  : { color: "var(--text-secondary)", background: "transparent" }
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8"><PanelSkeleton /></div>}>
        {tab === "licensing" ? <PharmacyLicensing /> : <DocumentRegistry />}
      </Suspense>
    </div>
  );
};

export default ComplianceHub;
