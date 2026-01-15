import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/home/home";
import Login from "./pages/auth/login/login";
import Signup from "./pages/auth/signup/signup";
import VerifyEmail from "./pages/auth/verify/verify";
import MyPosts from "./pages/navbar/myPosts/myPosts";
import MapView from "./pages/Map/MapView";
import { ChatProvider } from "./contexts/ChatContext";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("authToken");
  console.log("ProtectedRoute check - token exists:", !!token);

  if (!token) {
    console.log("No token, redirecting to /login");
    return <Navigate to="/login" replace />;
  }

  console.log("Token found, rendering protected content");
  return <>{children}</>;
}

function LoginRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("authToken");
  console.log("LoginRoute check - token exists:", !!token);

  if (token) {
    console.log("Token found, redirecting to /");
    return <Navigate to="/" replace />;
  }

  console.log("No token, rendering login page");
  return <>{children}</>;
}

export default function App() {
  return (
    <ChatProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <LoginRoute>
                <Login />
              </LoginRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <LoginRoute>
                <Signup />
              </LoginRoute>
            }
          />
          <Route
            path="/verify-email"
            element={
              <LoginRoute>
                <VerifyEmail />
              </LoginRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-posts"
            element={
              <ProtectedRoute>
                <MyPosts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/map"
            element={
              <ProtectedRoute>
                <MapView />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ChatProvider>
  );
}
