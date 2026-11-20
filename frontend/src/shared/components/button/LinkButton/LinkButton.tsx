import Link from "next/link";
import { buttonClasses, type ButtonVariant } from "../Button1/Button1";

interface LinkButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: "xs" | "sm" | "md" | "lg";
  leftIcon?: React.ReactNode;
  className?: string;
}

/** A navigation link that looks like a button. */
export function LinkButton({ href, children, variant = "primary", size = "md", leftIcon, className }: LinkButtonProps) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)}>
      {leftIcon}
      {children}
    </Link>
  );
}
