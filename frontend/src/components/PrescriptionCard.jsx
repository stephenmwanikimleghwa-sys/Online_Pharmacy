import React from "react";
import { formatDate } from "../utils/displayHelpers";

const PrescriptionCard = ({ prescription, onAction, showActions = true }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-amber-50 text-amber-600 border-amber-100/50";
      case "validated":
        return "bg-indigo-50 text-primary border-indigo-100/50";
      case "rejected":
        return "bg-rose-50 text-rose-600 border-rose-100/50";
      case "dispensed":
        return "bg-emerald-50 text-emerald-600 border-emerald-100/50";
      case "completed":
        return "bg-violet-50 text-violet-600 border-violet-100/50";
      default:
        return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  const getActionButtons = () => {
    if (!showActions) return null;

    switch (prescription.status) {
      case "pending":
        return (
          <div className="flex gap-2 mt-5 pt-5 border-t" style={{borderColor:'var(--border-primary)'}}>
            <button
              onClick={() => onAction(prescription.id, "validate")}
              className="flex-1 py-2.5 btn-primary text-white rounded-xl  text-sm font-bold shadow-soft hover:shadow-glow transition-all active:scale-[0.98]"
            >
              Validate
            </button>
            <button
              onClick={() => onAction(prescription.id, "reject")}
              className="px-4 py-2.5 form-cancel-btn rounded-xl text-sm transition-all active:scale-[0.98]"
            >
              Reject
            </button>
          </div>
        );
      case "validated":
        return (
          <div className="flex gap-2 mt-5 pt-5 border-t" style={{borderColor:'var(--border-primary)'}}>
            <button
              onClick={() => onAction(prescription.id, "dispense")}
              className="w-full py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm font-bold shadow-soft hover:shadow-card transition-all active:scale-[0.98]"
            >
              Start Dispensing
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 hover:border-indigo-200/50 hover:shadow-premium group transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold group-hover:text-primary transition-colors" style={{color:'var(--text-primary)'}}>
            {prescription.user?.full_name ||
              prescription.user?.username ||
              "Unknown Patient"}
          </h3>
          <div className="text-[10px] mt-1 flex items-center gap-1.5 font-bold uppercase tracking-widest" style={{color:'var(--text-secondary)'}}>
            <span className="w-1.5 h-1.5 rounded-full" style={{background:'var(--border-primary)'}}></span>
            ID: {prescription.id?.substring(0, 8).toUpperCase() || 'N/A'}
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-widest ${getStatusColor(prescription.status)}`}
        >
          {prescription.status}
        </span>
      </div>

      <div className="flex flex-col gap-3 mb-5">
        <div className="text-sm flex items-center gap-2.5" style={{color:'var(--text-secondary)'}}>
          <div className="p-1.5 rounded-lg transition-colors" style={{background:'var(--brand-mist)'}}>
            <svg className="w-4 h-4 text-slate-400 group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <span className="font-medium">{formatDate(prescription.uploaded_at, "MMM dd, yyyy • HH:mm", 'Unknown date')}</span>
        </div>

        {prescription.verified_by && (
          <div className="text-sm flex items-center gap-2.5" style={{color:'var(--text-secondary)'}}>
            <div className="p-1.5 rounded-lg" style={{background:'var(--brand-mist)'}}>
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.5 5.5a1 1 0 11-1.414 1.414 1 1 0 111.414-1.414z" /></svg>
            </div>
            <span className="font-semibold" style={{color:'var(--text-primary)'}}>
              Verified by {prescription.verified_by?.full_name || prescription.verified_by?.username}
            </span>
          </div>
        )}
      </div>

      {prescription.notes && (
        <div className="text-xs data-cell p-4 rounded-xl italic border" style={{color:'var(--text-secondary)', borderColor:'var(--border-primary)'}}>
          "{prescription.notes}"
        </div>
      )}

      {getActionButtons()}
    </div>
  );
};

export default PrescriptionCard;
