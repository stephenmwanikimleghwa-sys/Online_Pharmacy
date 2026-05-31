import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, BranchInfo } from "../context/AuthContext";
import { BuildingOffice2Icon } from "@heroicons/react/24/outline";
import LoadingSpinner from "../components/LoadingSpinner";
import toast from "react-hot-toast";

const formatBranchType = (type?: string): string => {
  if (!type) return "Chemist";
  if (type === "AGROVET") return "Agrovet";
  if (type === "CHEMIST") return "Chemist";
  return type.charAt(0) + type.slice(1).toLowerCase();
};

const timeGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const BranchSelectionScreen: React.FC = () => {
  const { user, allowedBranches, requiresBranchSelection, switchBranch, loading } = useAuth();
  const navigate = useNavigate();
  const [selectingId, setSelectingId] = useState<number | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (!requiresBranchSelection) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [user, loading, requiresBranchSelection, navigate]);

  const handleSelect = async (branch: BranchInfo) => {
    setSelectingId(branch.id);
    const result = await switchBranch(branch.id);
    setSelectingId(null);
    if (result.success) {
      navigate("/admin/dashboard", { replace: true });
    } else {
      toast.error("Could not switch to that branch. Please try again.");
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-gradient)" }}>
        <LoadingSpinner />
      </div>
    );
  }

  const firstName = user.first_name?.trim() || user.username;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "var(--bg-gradient)", backgroundAttachment: "fixed" }}
    >
      <div className="w-full max-w-2xl">
        <header className="text-center mb-10">
          <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-2">
            {timeGreeting()}, {firstName}
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-300">
            Which branch are you working at today?
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-1">
          {allowedBranches.map((branch) => {
            const busy = selectingId === branch.id;
            return (
              <button
                key={branch.id}
                type="button"
                disabled={busy || selectingId !== null}
                onClick={() => handleSelect(branch)}
                className="group w-full text-left rounded-2xl p-6 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-60"
                style={{
                  background: "var(--glass-bg)",
                  border: "1.5px solid var(--border-primary)",
                  backdropFilter: "blur(16px)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: "var(--btn-gradient)" }}
                  >
                    <BuildingOffice2Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold text-gray-900 dark:text-white truncate">
                      {branch.name}
                    </p>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatBranchType(branch.type)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-primary-600 dark:text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {busy ? "…" : "Select →"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {allowedBranches.length === 0 && (
          <p className="text-center text-sm text-gray-500 mt-6">
            No branches are available for your account. Contact an administrator.
          </p>
        )}

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-10 max-w-md mx-auto leading-relaxed">
          You can switch branches anytime from the top navigation bar
        </p>
      </div>
    </div>
  );
};

export default BranchSelectionScreen;
