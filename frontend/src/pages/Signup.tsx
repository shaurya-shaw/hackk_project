import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Layers, Eye, EyeOff, AlertCircle } from "lucide-react";

interface SignUpValues {
  name: string;
  username: string;
  email: string;
  password: string;
}

const Signup: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);

  // Initialize form without external resolver
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>();

  const onSubmit = async (data: SignUpValues) => {
    // Simulate API Call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log("Submit successful:", data);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4 font-sans selection:bg-[#E50914]">
      <div className="w-full max-w-[420px] bg-[#141414] border border-zinc-800 p-8 md:p-12 rounded-sm shadow-2xl">
        {/* Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="text-[#E50914] w-7 h-7" strokeWidth={3} />
            <h1 className="text-xl font-black tracking-tighter text-[#E50914]">
              SUB-SPLIT
            </h1>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-6">Sign Up</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <input
              {...register("name", { required: "Name is required" })}
              placeholder="Full Name"
              className={`w-full bg-zinc-800 rounded-sm p-4 text-white placeholder-zinc-500 outline-none border-b-2 transition-all ${
                errors.name
                  ? "border-[#E50914]"
                  : "border-transparent focus:border-zinc-500"
              }`}
            />
            {errors.name && (
              <p className="text-[#E50914] text-xs flex items-center gap-1">
                <AlertCircle size={12} /> {errors.name.message}
              </p>
            )}
          </div>

          {/* Username */}
          <div className="space-y-1">
            <input
              {...register("username", {
                required: "Username is required",
                minLength: { value: 3, message: "Min 3 characters" },
              })}
              placeholder="Username"
              className={`w-full bg-zinc-800 rounded-sm p-4 text-white placeholder-zinc-500 outline-none border-b-2 transition-all ${
                errors.username
                  ? "border-[#E50914]"
                  : "border-transparent focus:border-zinc-500"
              }`}
            />
            {errors.username && (
              <p className="text-[#E50914] text-xs flex items-center gap-1">
                <AlertCircle size={12} /> {errors.username.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <input
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address",
                },
              })}
              placeholder="Email"
              className={`w-full bg-zinc-800 rounded-sm p-4 text-white placeholder-zinc-500 outline-none border-b-2 transition-all ${
                errors.email
                  ? "border-[#E50914]"
                  : "border-transparent focus:border-zinc-500"
              }`}
            />
            {errors.email && (
              <p className="text-[#E50914] text-xs flex items-center gap-1">
                <AlertCircle size={12} /> {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1">
            <div className="relative">
              <input
                {...register("password", {
                  required: "Password is required",
                  minLength: { value: 8, message: "Min 8 characters" },
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#E50914] hover:bg-[#c11119] text-white font-bold py-4 rounded-sm transition-all mt-4 disabled:opacity-50"
          >
            {isSubmitting ? "CREATING ACCOUNT..." : "SIGN UP"}
          </button>
        </form>

        <p className="text-zinc-500 text-sm mt-8 text-center">
          Already a member?{" "}
          <a href="#" className="text-white hover:underline font-bold">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
};

export default Signup;
