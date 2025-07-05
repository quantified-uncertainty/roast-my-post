import { NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const signupCookie = cookieStore.get('signup-pending');
    
    if (!signupCookie) {
      return NextResponse.json(
        { error: "No signup in progress" },
        { status: 400 }
      );
    }

    const signupData = JSON.parse(signupCookie.value);
    const { email } = signupData;

    // Trigger the magic link email
    await signIn("resend", {
      email,
      redirect: false,
      callbackUrl: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Signup completion error:", error);
    return NextResponse.json(
      { error: "Failed to send magic link" },
      { status: 500 }
    );
  }
}