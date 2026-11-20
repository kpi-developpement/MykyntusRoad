"use client";

import { MotionConfig } from "motion/react";
import { AuthProvider } from "../../../context/AuthContext";
import { ConfirmProvider } from "../../confirm/ConfirmProvider/ConfirmProvider";
import { ToastProvider } from "../../toast/ToastProvider/ToastProvider";

/** Global providers: animations, authentication, notifications, confirmations. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
