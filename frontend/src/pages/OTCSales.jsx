import React from "react";
import { useAuth } from "../context/AuthContext";
import OTCSalePanel from "../components/OTCSalePanel";

const OTCSales = () => {
  const { activeBranch } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          OTC <span className="text-primary">Quick Sale</span>
        </h1>
        <p className="font-medium mt-2" style={{ color: "var(--text-secondary)" }}>
          Search products, add to cart, and complete sales.
          {activeBranch?.name ? ` Recording at ${activeBranch.name}.` : ""}{" "}
          Leave anytime to check a price or look something up — your cart is kept until you complete or clear the sale.
        </p>
      </div>
      <OTCSalePanel />
    </div>
  );
};

export default OTCSales;
