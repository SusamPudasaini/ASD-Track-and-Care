import { Routes, Route } from "react-router-dom";
import Login from "./auth/Login";
import Logout from "./auth/Logout";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/navbar/Navbar"; 
import Signup from "./auth/Signup";


function Home() {
  return (
    <>
      <Navbar />   
      <div className="p-6">
        <h1 className="text-xl font-semibold">Home</h1>
        <p>Welcome to the home page.</p>
      </div>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/logout" element={<Logout />} />
      <Route path="/signup" element={<Signup />} />


      {/* protected home */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
