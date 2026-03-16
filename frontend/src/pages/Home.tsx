import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Layers } from "lucide-react";
import type { AuthUser } from "../lib/auth";

const Home: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const storedUser = localStorage.getItem("auth-user");
  const user = storedUser ? (JSON.parse(storedUser) as AuthUser) : null;
  const successMessage = location.state?.successMessage as string | undefined;

  const handleLogout = () => {
    localStorage.removeItem("auth-user");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-sm border border-zinc-800 bg-[#141414] p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-3">
          <Layers className="h-8 w-8 text-[#E50914]" strokeWidth={3} />
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#E50914]">
              SUB-SPLIT
            </h1>
            <p className="text-sm text-zinc-400">Authentication is now connected.</p>
          </div>
        </div>

        {successMessage && (
          <p className="mb-4 rounded-sm border border-emerald-700 bg-emerald-950/60 px-4 py-3 text-sm text-emerald-300">
            {successMessage}
          </p>
        )}

        {user ? (
          <div className="space-y-4">
            <div className="rounded-sm border border-zinc-800 bg-zinc-900/80 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                Logged in user
              </p>
              <h2 className="mt-2 text-2xl font-bold">{user.name}</h2>
              <p className="mt-1 text-zinc-300">@{user.username}</p>
              <p className="text-zinc-400">{user.email}</p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-sm bg-[#E50914] px-5 py-3 font-bold text-white transition hover:bg-[#c11119]"
              >
                Log Out
              </button>
              <Link
                to="/signup"
                className="rounded-sm border border-zinc-700 px-5 py-3 font-bold text-white transition hover:border-zinc-500"
              >
                Create Another Account
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-zinc-300">No user session found yet.</p>
            <div className="flex gap-3">
              <Link
                to="/login"
                className="rounded-sm bg-[#E50914] px-5 py-3 font-bold text-white transition hover:bg-[#c11119]"
              >
                Go to Login
              </Link>
              <Link
                to="/signup"
                className="rounded-sm border border-zinc-700 px-5 py-3 font-bold text-white transition hover:border-zinc-500"
              >
                Go to Signup
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
