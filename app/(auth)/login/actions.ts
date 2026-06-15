"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

/** Email/password login (Story 1.3). Returns an error message or redirects. */
export async function authenticate(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/overview",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Invalid email or password.";
    }
    throw error; // re-throw NEXT_REDIRECT and others
  }
  return undefined;
}
