import React, { useRef, useState, useEffect } from 'react';
import { cn } from '../../../utils/cn';

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  value,
  onChange,
  length = 6,
  disabled = false,
}) => {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (!disabled && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [disabled]);

  // Sync state with parent value
  useEffect(() => {
    const valueDigits = value.split('').slice(0, length);
    const newDigits = [...valueDigits, ...Array(length - valueDigits.length).fill('')];
    setDigits((prev) => {
      const isIdentical = prev.length === newDigits.length && prev.every((val, i) => val === newDigits[i]);
      if (isIdentical) return prev;
      return newDigits;
    });
  }, [value, length]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    if (!/^\d*$/.test(val)) return; // Allow numeric values only

    // Extract the last character entered
    const digit = val.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    const newValue = newDigits.join('');
    onChange(newValue);

    // Auto-focus next box if digit was added
    if (digit !== '' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      const newDigits = [...digits];
      
      // If current box is empty, clear preceding box and focus it
      if (digits[index] === '' && index > 0) {
        newDigits[index - 1] = '';
        setDigits(newDigits);
        onChange(newDigits.join(''));
        inputRefs.current[index - 1]?.focus();
      } else {
        newDigits[index] = '';
        setDigits(newDigits);
        onChange(newDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d+$/.test(pastedData)) return;

    const pastedDigits = pastedData.slice(0, length).split('');
    const newDigits = [...pastedDigits, ...Array(length - pastedDigits.length).fill('')];
    setDigits(newDigits);
    onChange(newDigits.join(''));

    // Focus last filled box
    const focusIndex = Math.min(pastedDigits.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className="flex items-center justify-between gap-2 max-w-sm mx-auto" role="group" aria-label="OTP verification code entry">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          className={cn(
            "w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all bg-bg-secondary text-text-primary",
            "border-border-primary hover:border-brand-emerald/40 focus:border-brand-emerald focus:ring-2 focus:ring-brand-emerald/20",
            disabled && "bg-bg-tertiary text-text-secondary opacity-50 cursor-not-allowed"
          )}
          aria-label={`Digit ${index + 1} of ${length}`}
        />
      ))}
    </div>
  );
};

export default OTPInput;
