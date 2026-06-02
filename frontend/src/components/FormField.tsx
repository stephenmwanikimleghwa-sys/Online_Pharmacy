import React, { useState, useCallback, useRef } from 'react';
import { EyeIcon, EyeSlashIcon, ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { builtInFieldValidate } from '../utils/formValidators';

export interface FormFieldProps {
  name: string;
  label?: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'url' | 'search';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string;
  helperText?: string;
  autoComplete?: string;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  validate?: (value: string) => string | undefined;
  showPasswordToggle?: boolean;
  leftIcon?: React.ComponentType<{ className?: string }>;
  rightIcon?: React.ComponentType<{ className?: string }>;
  onRightIconClick?: () => void;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  type = 'text',
  placeholder,
  value = '',
  onChange,
  onBlur,
  onFocus,
  required = false,
  disabled = false,
  readOnly = false,
  error,
  helperText,
  autoComplete,
  maxLength,
  minLength,
  pattern,
  validate,
  showPasswordToggle = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  onRightIconClick,
  className = '',
  inputClassName = '',
  labelClassName = ''
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [internalError, setInternalError] = useState<string | undefined>();
  const [isTouched, setIsTouched] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const effectiveType = type === 'password' && showPassword ? 'text' : type;
  const displayError = error || internalError;
  const hasError = Boolean(displayError);
  const hasValue = value.length > 0;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange?.(newValue);

      // Validate on change if already touched
      if (isTouched && validate) {
        setInternalError(validate(newValue));
      }
    },
    [onChange, isTouched, validate]
  );

  const handleBlur = useCallback(() => {
    setIsTouched(true);
    setIsFocused(false);

    // Validate on blur
    setInternalError(runValidation(value));
    onBlur?.();
  }, [runValidation, value, onBlur]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus?.();
  }, [onFocus]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle Escape to clear
    if (e.key === 'Escape' && !readOnly && !disabled) {
      onChange?.('');
      inputRef.current?.blur();
    }
  }, [onChange, readOnly, disabled]);

  const inputId = `field-${name}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className={`block text-sm font-medium transition-colors ${
            hasError
              ? 'text-red-500'
              : ''
          } ${labelClassName}`}
          style={!hasError ? { color: 'var(--text-primary)' } : undefined}
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>
      )}

      <div className="relative">
        {LeftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }}>
            <LeftIcon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}

        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type={effectiveType}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete={autoComplete}
          maxLength={maxLength}
          minLength={minLength}
          pattern={pattern}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? errorId : helperText ? helperId : undefined
          }
          aria-required={required}
          className={`form-input
            ${LeftIcon ? 'pl-10' : ''}
            ${RightIcon || showPasswordToggle ? 'pr-10' : ''}
            ${hasError ? '!border-red-400 focus:!border-red-500 focus:!shadow-[0_0_0_3px_rgba(220,38,38,0.12)]' : ''}
            ${isFocused ? 'border-[var(--color-primary)]' : ''}
            ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
            ${inputClassName}
          `}
        />

        {/* Right icon or password toggle */}
        {(RightIcon || showPasswordToggle) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {showPasswordToggle && type === 'password' && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 rounded transition-colors focus:outline-none"
                style={{ color: 'var(--text-secondary)' }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            )}
            {RightIcon && (
              <button
                type="button"
                onClick={onRightIconClick}
                className="p-1 rounded transition-colors focus:outline-none"
                style={{ color: 'var(--text-secondary)' }}
                aria-label="Clear input"
              >
                <RightIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Status icon */}
        {isTouched && !hasError && hasValue && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#10b981' }}>
            <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Error message */}
      {hasError && (
        <p id={errorId} className="alert-error !py-1.5 !px-2 text-sm" role="alert">
          <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{displayError}</span>
        </p>
      )}

      {/* Helper text */}
      {!hasError && helperText && (
        <p id={helperId} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {helperText}
        </p>
      )}

      {/* Character count */}
      {maxLength && (
        <p className="text-xs text-right" style={{ color: 'var(--text-secondary)' }}>
          {value.length} / {maxLength}
        </p>
      )}
    </div>
  );
};

export default FormField;
