import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Layers, Eye, EyeOff, AlertCircle } from "lucide-react";
import { login, saveAuthenticatedUser } from "../lib/auth";

interface LoginValues {
  identifier: string;
  password: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const successMessage = location.state?.successMessage as string | undefined;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>();

  const onSubmit = async (data: LoginValues) => {
    setServerError("");

    try {
      const response = await login(data);
      saveAuthenticatedUser(response.user);
      navigate("/home", {
        replace: true,
        state: { successMessage: `Welcome back, ${response.user.name}!` },
      });
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Unable to log in right now",
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4 font-sans selection:bg-[#E50914]">
      <div className="w-full max-w-[420px] bg-[#141414] border border-zinc-800 p-8 md:p-12 rounded-sm shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="text-[#E50914] w-7 h-7" strokeWidth={3} />
            <h1 className="text-xl font-black tracking-tighter text-[#E50914]">
              SUB-SPLIT
            </h1>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-6">Log In</h2>

        {successMessage && (
          <p className="mb-4 rounded-sm border border-emerald-700 bg-emerald-950/60 px-4 py-3 text-sm text-emerald-300">
            {successMessage}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <input
              {...register("identifier", {
                required: "Email or username is required",
              })}
              placeholder="Email or Username"
              className={`w-full bg-zinc-800 rounded-sm p-4 text-white placeholder-zinc-500 outline-none border-b-2 transition-all ${
                errors.identifier
                  ? "border-[#E50914]"
                  : "border-transparent focus:border-zinc-500"
              }`}
            />
            {errors.identifier && (
              <p className="text-[#E50914] text-xs flex items-center gap-1">
                <AlertCircle size={12} /> {errors.identifier.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <div className="relative">
              <input
                {...register("password", {
                  required: "Password is required",
                })}
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className={`w-full bg-zinc-800 rounded-sm p-4 text-white placeholder-zinc-500 outline-none border-b-2 transition-all ${
                  errors.password
                    ? "border-[#E50914]"
                    : "border-transparent focus:border-zinc-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[#E50914] text-xs flex items-center gap-1">
                <AlertCircle size={12} /> {errors.password.message}
              </p>
            )}
          </div>

          {serverError && (
            <p className="text-[#E50914] text-sm flex items-center gap-2">
              <AlertCircle size={14} /> {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#E50914] hover:bg-[#c11119] text-white font-bold py-4 rounded-sm transition-all mt-4 disabled:opacity-50"
          >
            {isSubmitting ? "LOGGING IN..." : "LOG IN"}
          </button>
        </form>

        <p className="text-zinc-500 text-sm mt-8 text-center">
          New here?{" "}
          <Link to="/signup" className="text-white hover:underline font-bold">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
