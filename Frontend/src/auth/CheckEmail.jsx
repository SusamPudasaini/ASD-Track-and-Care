import { Link, useLocation } from "react-router-dom";

export default function CheckEmail() {
  const location = useLocation();
  const email = location.state?.email;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full rounded bg-white p-6 shadow">
        <h1 className="text-xl font-semibold text-gray-900">Verify your email</h1>

        <p className="mt-3 text-sm text-gray-700">
          We sent a verification link{email ? ` to ${email}` : ""}. Please open your email and click the link to verify your account.
        </p>

        <p className="mt-3 text-sm text-gray-500">
          After verification, you can login.
        </p>

        <div className="mt-6 flex gap-4">
          <Link to="/login" className="text-blue-600 hover:underline text-sm">
            Go to Login
          </Link>
          <Link to="/signup" className="text-blue-600 hover:underline text-sm">
            Back to Signup
          </Link>
        </div>
      </div>
    </div>
  );
}
