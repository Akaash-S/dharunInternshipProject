import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import loginImg from "/login.png";
import signupImg from "/signup.png";
import { AnimatePresence, motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { Eye, EyeOff, ImagePlus } from "lucide-react";

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setAvatarPreview(null);
  }, [isLogin]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Fill in all fields");

    setLoading(true);
    try {
      if (isLogin) {
        const res = await fetch("http://localhost:8000/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Login failed");
        localStorage.setItem("user", JSON.stringify(data.user));
        toast.success("Login successful!");
        navigate("/dashboard");
      } else {
        const form = new FormData();
        form.append("email", email);
        form.append("password", password);
        if (avatarFile) form.append("avatar", avatarFile);

        const res = await fetch("http://localhost:8000/api/signup", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Signup failed");
        toast.success("Signup successful! Please log in.");
        setIsLogin(true);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-lg overflow-hidden grid grid-cols-1 md:grid-cols-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={isLogin ? "login-img" : "signup-img"}
            initial={{ x: isLogin ? 50 : -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isLogin ? -50 : 50, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="hidden md:flex items-center justify-center bg-indigo-100"
          >
            <img
              src={isLogin ? loginImg : signupImg}
              alt="Auth Illustration"
              className="w-full h-full transition-all hover:scale-105 duration-500"
            />
          </motion.div>
        </AnimatePresence>

        <div className="w-full p-8 flex flex-col justify-center items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? "login-form" : "signup-form"}
              initial={{ x: isLogin ? 50 : -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: isLogin ? -50 : 50, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="w-full"
            >
              <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">
                {isLogin ? "Welcome Back!" : "Create an Account"}
              </h2>
              <p className="text-gray-600 text-center mb-4">
                {isLogin ? "Sign in to access your dashboard" : "Sign up to get started"}
              </p>

              <div className="flex flex-col items-center mb-4">
                <label
                  htmlFor="avatar-input"
                  className="cursor-pointer w-20 h-20 mb-2 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border hover:ring-2 hover:ring-indigo-400 transition"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlus className="w-6 h-6 text-gray-500" />
                  )}
                </label>
                {!isLogin && (
                  <input
                    id="avatar-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                )}
              </div>

              <form onSubmit={handleAuth} className="w-full space-y-4">
                <div>
                  <label className="block text-gray-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-2 text-gray-600 hover:text-indigo-600"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-2 rounded-lg text-white ${loading
                    ? "bg-gray-400 cursor-wait"
                    : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {loading ? "Processing..." : isLogin ? "Sign In" : "Sign Up"}
                </Button>
              </form>

              <p className="text-center text-gray-600 mt-4">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <span
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-indigo-600 cursor-pointer font-semibold"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </span>
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <Toaster position="top-right" />
    </div>
  );
}

export default AuthPage;
