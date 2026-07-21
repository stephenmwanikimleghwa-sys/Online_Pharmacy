import type { AxiosError } from "axios";
import type { ApiErrorDisplay } from "../services/apiErrors";
import { formatFieldErrors, truncateTitle } from "../services/apiErrors";

export const API_ERROR_CODES = {
  INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK",
  CREDIT_LIMIT_EXCEEDED: "CREDIT_LIMIT_EXCEEDED",
  DUPLICATE_ENTRY: "DUPLICATE_ENTRY",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  ACCOUNT_INACTIVE: "ACCOUNT_INACTIVE",
  NO_BRANCH_ASSIGNED: "NO_BRANCH_ASSIGNED",
  BRANCH_ACCESS_DENIED: "BRANCH_ACCESS_DENIED",
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",
  NOT_FOUND: "NOT_FOUND",
  NO_ACTIVE_BRANCH: "NO_ACTIVE_BRANCH",
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;

interface StructuredErrorBody {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
}

export function extractStructuredError(data: unknown): StructuredErrorBody["error"] | null {
  if (!data || typeof data !== "object") return null;
  const body = data as StructuredErrorBody & { code?: string; message?: string; details?: Record<string, unknown> };
  if (body.error?.code && body.error?.message) return body.error;
  if (body.code && body.message) return { code: body.code, message: body.message, details: body.details };
  return null;
}

/** Map backend business error codes to user-facing copy (Part 3). */
export function mapBusinessErrorCode(
  code: string,
  message: string,
  details: Record<string, unknown> = {},
): ApiErrorDisplay | null {
  switch (code) {
    case API_ERROR_CODES.INSUFFICIENT_STOCK:
      return {
        title: "Insufficient Stock",
        message:
          message ||
          `${details.product_name ?? "This product"} only has ${details.available ?? 0} units available at ${details.branch ?? "this branch"}. Reduce the quantity or check another branch.`,
      };
    case API_ERROR_CODES.CREDIT_LIMIT_EXCEEDED:
      return {
        title: "Credit Limit Reached",
        message:
          message ||
          `${details.customer_name ?? "This customer"} has an outstanding balance of KES ${details.balance ?? 0}. They cannot make further credit purchases until they pay.`,
        actionLabel: "Record Payment",
      };
    case API_ERROR_CODES.NO_ACTIVE_BRANCH:
      return {
        title: "No Branch Selected",
        message:
          message ||
          "Please select which branch you are working at before continuing.",
        actionLabel: "Select Branch",
      };
    case API_ERROR_CODES.INVALID_CREDENTIALS:
      return {
        title: "Login Failed",
        message: message || "Invalid username or password, try again.",
      };
    case API_ERROR_CODES.ACCOUNT_INACTIVE:
      return {
        title: "Account Deactivated",
        message:
          message ||
          "Your account has been deactivated. Please contact your administrator.",
      };
    case API_ERROR_CODES.NO_BRANCH_ASSIGNED:
      return {
        title: "No Branch Assigned",
        message:
          message ||
          "Your account has not been assigned to any branch. Contact your administrator to resolve this before you can log in.",
      };
    case API_ERROR_CODES.BRANCH_ACCESS_DENIED:
      return {
        title: "Branch Not Allowed",
        message:
          message ||
          `You are not assigned to ${details.branch_name ?? "that branch"}. Ask an admin to grant you access.`,
      };
    case API_ERROR_CODES.DUPLICATE_ENTRY:
      return {
        title: "Duplicate Entry",
        message:
          message ||
          "This record already exists in the system. Please check if it has already been added.",
      };
    case API_ERROR_CODES.NOT_FOUND:
    case API_ERROR_CODES.PRODUCT_NOT_FOUND:
      return {
        title: "Product Not Found",
        message:
          message ||
          `No product matching '${details.search_term ?? "your search"}' was found.`,
      };
  }
  return null;
}

export function getLoginErrorDisplay(errorData: unknown): ApiErrorDisplay {
  const structured = extractStructuredError(errorData);
  if (structured?.code) {
    const mapped = mapBusinessErrorCode(
      structured.code,
      structured.message ?? "",
      structured.details ?? {},
    );
    if (mapped) return mapped;
  }

  const fieldMessage = formatFieldErrors(errorData);
  const raw = errorData as Record<string, unknown> | undefined;
  const detail = typeof raw?.detail === "string" ? raw.detail : "";

  if (detail.toLowerCase().includes("disabled") || detail.toLowerCase().includes("inactive")) {
    return {
      title: "Account Deactivated",
      message:
        "Your account has been deactivated. Please contact your administrator.",
    };
  }
  if (
    detail.toLowerCase().includes("credentials") ||
    detail.toLowerCase().includes("password") ||
    detail.toLowerCase().includes("unable to log in")
  ) {
    return {
      title: "Login Failed",
      message: "Invalid username or password, try again.",
    };
  }
  if (detail.toLowerCase().includes("permission") || detail.toLowerCase().includes("not allowed")) {
    return {
      title: "Login Restricted",
      message:
        "Your account does not have permission to log in or has not been assigned to an active branch. Contact your administrator.",
    };
  }

  return {
    title: "Login Failed",
    message: fieldMessage ?? (detail || "Please check your username and password and try again."),
  };
}

export function resolveAxiosErrorDisplay(error: AxiosError): ApiErrorDisplay | null {
  const data = error.response?.data;
  const structured = extractStructuredError(data);
  if (structured?.code) {
    const mapped = mapBusinessErrorCode(
      structured.code,
      structured.message ?? "",
      (structured.details as Record<string, unknown>) ?? {},
    );
    if (mapped) {
      return { ...mapped, title: truncateTitle(mapped.title) };
    }
    if (structured.message) {
      return {
        title: truncateTitle("Request Failed"),
        message: structured.message,
      };
    }
  }
  return null;
}
