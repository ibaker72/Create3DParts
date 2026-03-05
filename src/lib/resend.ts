import { Resend } from "resend";

export function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Missing RESEND_API_KEY");
  return new Resend(key);
}

export const FROM_ADDRESS = process.env.RESEND_FROM ?? "onboarding@resend.dev";
export const ADMIN_EMAIL  = process.env.ADMIN_EMAIL ?? "bakereyad7@gmail.com";