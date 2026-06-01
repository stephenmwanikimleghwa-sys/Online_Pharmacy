import React from "react";
import LoadingSpinner from "./LoadingSpinner";

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  spinnerSize?: "sm" | "md";
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  loadingText,
  spinnerSize = "sm",
  children,
  disabled,
  className = "",
  type = "button",
  ...rest
}) => {
  const isDisabled = disabled || loading;
  const label = loading && loadingText ? loadingText : children;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={`inline-flex items-center justify-center gap-2 ${className}`}
      {...rest}
    >
      {loading && <LoadingSpinner size={spinnerSize} />}
      {label}
    </button>
  );
};

export default LoadingButton;
