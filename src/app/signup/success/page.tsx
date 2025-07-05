import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Check Your Email - RoastMyPost",
  description: "We've sent you a magic link to complete your signup",
};

export default function SignupSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Check your email
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please check your email for a magic link to complete your signup.
            </p>
            <p className="mt-4 text-sm text-gray-500">
              Click the link in your email to create your account and get started.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              The link will expire in 24 hours.
            </p>
            <div className="mt-6">
              <p className="text-sm text-gray-500">
                Didn't receive the email? Check your spam folder or{" "}
                <a href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
                  try again
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}