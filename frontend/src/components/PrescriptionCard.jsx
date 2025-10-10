import React from "react";
import { format } from "date-fns";

const PrescriptionCard = ({ prescription, onAction, showActions = true }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "validated":
        return "bg-blue-100 text-blue-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "dispensed":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getActionButtons = () => {
    if (!showActions) return null;

    switch (prescription.status) {
      case "pending":
        return (
          <div className="flex space-x-2 mt-4">
            <button
              onClick={() => onAction(prescription.id, "validate")}
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Validate
            </button>
            <button
              onClick={() => onAction(prescription.id, "reject")}
              className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            >
              Reject
            </button>
          </div>
        );
      case "validated":
        return (
          <div className="flex space-x-2 mt-4">
            <button
              onClick={() => onAction(prescription.id, "dispense")}
              className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              Dispense
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-800">
          {prescription.user?.full_name ||
            prescription.user?.username ||
            "Unknown Patient"}
        </h3>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(prescription.status)}`}
        >
          {prescription.status?.toUpperCase()}
        </span>
      </div>

      <div className="text-sm text-gray-600 mb-2">
        Uploaded:{" "}
        {format(new Date(prescription.uploaded_at), "MMM dd, yyyy HH:mm")}
      </div>

      {prescription.verified_by && (
        <div className="text-sm text-gray-600 mb-2">
          Verified by:{" "}
          {prescription.verified_by?.full_name ||
            prescription.verified_by?.username}
          {prescription.verified_at && (
            <>
              {" "}
              at{" "}
              {format(new Date(prescription.verified_at), "MMM dd, yyyy HH:mm")}
            </>
          )}
        </div>
      )}

      {prescription.notes && (
        <div className="text-sm text-gray-700 mb-3">
          <strong>Notes:</strong> {prescription.notes}
        </div>
      )}

      {getActionButtons()}
    </div>
  );
};

export default PrescriptionCard;
