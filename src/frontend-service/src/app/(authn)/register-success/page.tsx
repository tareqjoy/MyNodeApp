"use client";

import { useRouter, useSearchParams } from "next/navigation";

const SignUpSuccess = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = searchParams.get('username');

  const handleSignInRedirect = () => {
    // Redirect to login page when the button is clicked
    router.push("/login");
  };

  return (
    <div className="relative h-screen w-full bg-center flex items-center justify-center">

      {/* Success Dialog */}
      <div className="relative z-10 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-semibold text-center text-gray-800 dark:text-gray-200">
          Welcome, @{username || "mate!" }
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
          Your account has been successfully created.
        </p>

        {/* Success Button */}
        <button
          onClick={handleSignInRedirect}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          Go to Sign In
        </button>
      </div>
    </div>
  );
};

export default SignUpSuccess;
