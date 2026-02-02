"use client";

type StateVariant = "loading" | "error" | "empty" | "info";

type StateMessageProps = {
  message: string;
  variant?: StateVariant;
  center?: boolean;
  className?: string;
};

const variantClasses: Record<StateVariant, string> = {
  loading: "text-gray-500 animate-pulse",
  error: "text-red-500",
  empty: "text-gray-500",
  info: "text-gray-500",
};

export default function StateMessage({
  message,
  variant = "info",
  center = true,
  className = "",
}: StateMessageProps) {
  const centerClasses = center ? "text-center mt-4" : "";
  const classes = `${variantClasses[variant]} ${centerClasses} ${className}`.trim();

  return <p className={classes}>{message}</p>;
}
