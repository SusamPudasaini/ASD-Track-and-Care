import { Link, useLocation } from "react-router-dom";
import Navbar from "../components/navbar/Navbar";
import { FaEnvelopeCircleCheck, FaArrowRight, FaArrowLeft } from "react-icons/fa6";

export default function CheckEmail() {
  const location = useLocation();
  const email = location.state?.email;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-120px] top-[30%] h-[300px] w-[300px] rotate-12 bg-blue-50" />
          <div className="absolute right-[-150px] bottom-[20%] h-[350px] w-[350px] -rotate-12 bg-blue-50" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-90px)] max-w-6xl items-center justify-center px-6 py-12">
          <div className="w-full max-w-[460px] rounded-2xl border border-blue-100 bg-white px-8 py-10 shadow-md">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-[#4a6cf7]">
              <FaEnvelopeCircleCheck className="text-3xl" />
            </div>

            <h1 className="mt-6 text-center text-[24px] font-semibold text-gray-900">
              Verify your email
            </h1>

            <p className="mt-3 text-center text-sm leading-6 text-gray-600">
              We sent a verification link
              {email ? (
                <>
                  {" "}
                  to{" "}
                  <span className="font-semibold text-gray-900 break-all">
                    {email}
                  </span>
                </>
              ) : (
                ""
              )}
              . Please open your inbox and click the verification link to activate
              your account.
            </p>

            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Once your email is verified, you can sign in to your account.
            </div>

            <div className="mt-8 space-y-3">
              <Link
                to="/login"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4a6cf7] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#3f5ee0]"
              >
                Go to Login
                <FaArrowRight className="text-xs" />
              </Link>

              <Link
                to="/signup"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <FaArrowLeft className="text-xs" />
                Back to Signup
              </Link>
            </div>

            <p className="mt-6 text-center text-xs leading-5 text-gray-500">
              Did not receive the email? Check your spam folder or try signing up again.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}