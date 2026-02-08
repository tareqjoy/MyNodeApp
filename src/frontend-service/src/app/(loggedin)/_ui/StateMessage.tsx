"use client";

type StateVariant = "loading" | "error" | "empty" | "info";

type StateMessageProps = {
  message: string;
  variant?: StateVariant;
  center?: boolean;
  className?: string;
};

const variantClasses: Record<StateVariant, string> = {
  loading: "text-gray-500 pulse-soft",
  error: "text-rose-500 dark:text-rose-400",
  empty: "text-gray-500 dark:text-gray-400",
  info: "text-gray-500 dark:text-gray-400",
};

export default function StateMessage({
  message,
  variant = "info",
  center = true,
  className = "",
}: StateMessageProps) {
  const centerClasses = center ? "text-center mt-4" : "";
  const classes = `${variantClasses[variant]} ${centerClasses} ${className}`.trim();

  return <p className={`${classes} text-sm fade-in`}>{message}</p>;
}
