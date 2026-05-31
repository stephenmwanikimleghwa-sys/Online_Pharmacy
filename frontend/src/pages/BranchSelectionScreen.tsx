import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, BranchInfo } from "../context/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";
import toast from "react-hot-toast";
import { getBranchIcon, getBranchSubtitle } from "../utils/branchDisplay";

const timeGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const BranchSelectionScreen: React.FC = () => {
  const { user, allowedBranches, requiresBranchSelection, activeBranch, switchBranch, loading } =
    useAuth();
  const navigate = useNavigate();
  const [selectingId, setSelectingId] = useState<number | null>(null);

  const role = user?.role?.toString?.().toLowerCase?.() ?? "";
  const isAdmin = role === "admin" || Boolean(user?.is_admin);
  const mustPickBranch =
    requiresBranchSelection || (isAdmin && !activeBranch?.id && allowedBranches.length > 1);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (!isAdmin) {
      navigate("/branch/dashboard", { replace: true });
      return;
    }
    if (!mustPickBranch) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [user, loading, isAdmin, mustPickBranch, navigate]);

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
      <div className="w-full max-w-lg">
        <header className="text-center mb-10 px-2">
          <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white mb-3">
            {timeGreeting()}, {firstName}
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-300">
            Which branch are you working at today?
          </p>
        </header>

        <div className="grid gap-4">
          {allowedBranches.map((branch) => {
            const busy = selectingId === branch.id;
            const icon = getBranchIcon(branch);
            const subtitle = getBranchSubtitle(branch);

            return (
              <button
                key={branch.id}
                type="button"
                disabled={busy || selectingId !== null}
                onClick={() => handleSelect(branch)}
                className="group w-full text-left rounded-2xl px-6 py-5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-600"
                style={{
                  background: "var(--glass-bg)",
                  border: "1.5px solid var(--border-primary)",
                  backdropFilter: "blur(16px)",
                }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl shrink-0" aria-hidden>
                    {icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {branch.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {subtitle}
                    </p>
                  </div>
                  {busy && (
                    <span className="text-sm font-medium text-indigo-600">Setting…</span>
                  )}
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

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-10 leading-relaxed px-4">
          You can switch branches anytime from the top navigation bar
        </p>
      </div>
    </div>
  );
};

export default BranchSelectionScreen;
