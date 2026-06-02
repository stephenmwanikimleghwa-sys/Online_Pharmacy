import React from "react";
import { ShieldExclamationIcon } from "@heroicons/react/24/outline";

interface AccessDeniedProps {
  title?: string;
  message?: string;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({
  title = "Access not allowed",
  message = "Your role does not include permission to view this page. If you need access, ask your administrator.",
}) => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-6 text-center animate-fade-in">
    <ShieldExclamationIcon
      className="h-14 w-14 text-amber-500"
      aria-hidden
    />
    <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
      {title}
    </h2>
    <p className="text-sm max-w-md leading-relaxed" style={{ color: "var(--text-secondary)" }}>
      {message}
    </p>
  </div>
);

export default AccessDenied;
