import { Link } from "react-router-dom";

export default function Navbar() {
  const isLoggedIn = !!localStorage.getItem("token");

  return (
    <header className="w-full">
      <div className="mx-auto max-w-6xl px-6 pt-6">
        <div className="flex items-center justify-between">

          {/* logo */}
          <Link to="/" className="flex items-center">
            <img
              src="/images/logo/asd-logo.png"
              alt="ASD"
              className="h-10"
            />
          </Link>

          {/* center nav*/}
          <nav className="hidden md:flex items-center gap-10 text-base font-medium text-gray-700">
            <Link to="/">Home</Link>
            <Link to="/questionnaire">Questionnaire</Link>
            <Link to="/profile">Profile</Link>
          </nav>

          {/* auth buttons */}
          <div className="flex items-center gap-6">
            {!isLoggedIn ? (
              <>
                <Link to="/login" className="text-sm font-semibold">
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="bg-[#4a6cf7] px-6 py-2 text-sm font-semibold text-white"
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <Link
                to="/logout"
                className="text-sm font-semibold text-red-600 hover:underline"
              >
                Logout
              </Link>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
