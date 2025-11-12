"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logger } from "@/lib/logger";
import { Eye, EyeOff } from "lucide-react";

interface LoginFormProps {
  onAuthenticated?: () => void;
}

export default function LoginForm({ onAuthenticated }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);

  const toPseudoEmail = (name: string) => `${name}@users.test`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError(
        "Supabase chưa được cấu hình. Vui lòng đặt biến môi trường NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (!username.trim()) {
        throw new Error("Vui lòng nhập username");
      }
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: toPseudoEmail(username.trim()),
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email: toPseudoEmail(username.trim()),
          password,
          options: { data: { username: username.trim() } }
        });
        if (signUpError) throw signUpError;
      }

      // Notify parent
      onAuthenticated?.();
    } catch (err: any) {
      logger.error("Auth error", err);
      const message = String(err?.message || "");
      if (message.includes("Invalid login credentials")) {
        setError(
          "Sai username hoặc mật khẩu. Nếu chưa có tài khoản, hãy chọn tab Đăng ký để tạo mới."
        );
      } else {
        setError(message || "Đã xảy ra lỗi. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <style jsx>{`
        @keyframes rgb-rotate {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .rgb-border-wrapper {
          position: relative;
          padding: 3px;
          border-radius: 16px;
        }

        .rgb-border-wrapper::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          padding: 3px;
          background: linear-gradient(
            45deg,
            #ff0000,
            #ff7f00,
            #ffff00,
            #00ff00,
            #0000ff,
            #4b0082,
            #9400d3,
            #ff0000
          );
          background-size: 400% 400%;
          animation: rgb-rotate 3s linear infinite;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          filter: blur(1px);
          z-index: 0;
        }

        .rgb-border-wrapper::after {
          content: '';
          position: absolute;
          inset: -20px;
          border-radius: 16px;
          background: linear-gradient(
            45deg,
            #ff0000,
            #ff7f00,
            #ffff00,
            #00ff00,
            #0000ff,
            #4b0082,
            #9400d3,
            #ff0000
          );
          background-size: 400% 400%;
          animation: rgb-rotate 3s linear infinite;
          opacity: 0.4;
          filter: blur(20px);
          z-index: -1;
        }

        .form-inner {
          background: white;
          border-radius: 13px;
          padding: 2rem;
          position: relative;
          z-index: 1;
        }

        :global(.dark) .form-inner {
          background: #1f2937;
        }
      `}</style>

      <div className="rgb-border-wrapper">
        <div className="form-inner">
          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Đăng nhập để sử dụng AI Chat
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Đăng nhập bằng username và mật khẩu
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex mb-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              className={`flex-1 py-2 text-sm transition-colors ${
                mode === "signin"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              }`}
              onClick={() => setMode("signin")}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm transition-colors ${
                mode === "signup"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              }`}
              onClick={() => setMode("signup")}
            >
              Đăng ký
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                Username
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                Mật khẩu
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              {loading ? "Đang xử lý..." : mode === "signin" ? "Đăng nhập" : "Đăng ký"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}


