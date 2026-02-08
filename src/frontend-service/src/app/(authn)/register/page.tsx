"use client";
import 'reflect-metadata';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authPost, publicGet, publicPost, HttpError } from "@/lib/auth";
import debounce from 'debounce';
import { plainToInstance } from 'class-transformer';
import { CheckUsernameResponse, SignUpReq } from '@tareqjoy/models';

const userCheckUsernameUrl: string = process.env.NEXT_PUBLIC_USER_CHECK_USERNAME_URL || "/v1/user/check-username/";
const authSignUpUrl: string = process.env.NEXT_PUBLIC_AUTH_SIGN_UP_URL || "/v1/user/signup/";
const authVerifyUrl: string = process.env.NEXT_PUBLIC_AUTH_VERIFY_URL || "/v1/auth/verify/";

export default function SignUpForm() {
  const router = useRouter();

    // Check authentication on mount
    useEffect(() => {
      const isAuthed = async () => {
        console.log("Checking authentication...");
        try {
          const resp = await authPost(authVerifyUrl, {});
          if (resp.status === 200) {
            console.log("User is authenticated, redirecting to profile...");
            router.push('/home');
            return;
          }
        } catch (error) {
          console.log("User is not authenticated, showing sign up form...");
        }
      };
  
      isAuthed();
    }, [router]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    gender: "",
    birthday: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  // Error state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [usernameAvailable, setUsernameAvailable] = useState<"available" | "unavailable" | "too-short" | "too-long" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");  // Error message state

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });

    // Clear error when user types
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));

    if (e.target.name === "username") {
      debouncedCheckUsername(e.target.value);
    }
  };

  // Username availability check
  const checkUsernameAvailability = async (username: string) => {
    if (username.length < 4) {
      setUsernameAvailable("too-short");
      return;
    }
    if (username.length > 15) {
      setUsernameAvailable("too-long");
      return;
    }
    try {
      const checkUsernameAxiosResp = await publicGet(userCheckUsernameUrl, {
        params: { username },
      });
      const authSignInResObj = plainToInstance(CheckUsernameResponse, checkUsernameAxiosResp.data);
      setUsernameAvailable(authSignInResObj.available? "available": "unavailable");
    } catch (error) {
      console.error("Username check failed", error);
    }
  };

  const debouncedCheckUsername = debounce(checkUsernameAvailability, 300);

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.includes("@")) newErrors.email = "Invalid email";
    if (!["male", "female", "non-binary"].includes(formData.gender))
      newErrors.gender = "Please select a gender";
    if (!formData.birthday) newErrors.birthday = "Birthday is required";
    if (!formData.username.trim()) newErrors.username = "Username is required";
    if (!usernameAvailable) newErrors.username = "Username is already taken";
    if (formData.username.length < 4) newErrors.username = "Username is too short";
    if (formData.username.length > 15) newErrors.username = "Username is too long";
    if (formData.password.length < 6) newErrors.password = "Password too short";
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && usernameAvailable === "available";
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
      const signUpReq = new SignUpReq(formData.username, formData.email, formData.password, formData.name, formData.birthday, formData.gender);
      const signUpAxiosRes = await publicPost(authSignUpUrl, signUpReq);
      if (signUpAxiosRes.status === 200) {
        router.push("/login");
      } 
    } catch (error: any) {
      if (error instanceof HttpError) {
        const data: any = error.data;
        setErrorMessage(data?.error || "Something went wrong. Please try again later.");
      } else {
        setErrorMessage("Something went wrong. Please try again later.");
        console.error(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
<div className="relative min-h-screen w-full flex items-center justify-center px-6 py-10">
  <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
  <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.2),transparent_55%)] dark:bg-[radial-gradient(circle_at_top,rgba(129,140,248,0.18),transparent_55%)]" />

  <div className="relative card p-8 max-w-md w-full">
    <h2 className="text-3xl font-semibold text-center text-gray-900 dark:text-gray-100">Create an Account</h2>

    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      {/* Name */}
      <div>
        <label className="block text-gray-700 dark:text-gray-300">Full Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition dark:bg-gray-900/60 dark:border-white/10 dark:text-white"
          autoComplete="name"
          required
        />
        {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
      </div>

      {/* Email */}
      <div>
        <label className="block text-gray-700 dark:text-gray-300">Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition dark:bg-gray-900/60 dark:border-white/10 dark:text-white"
          autoComplete="email"
          required
        />
        {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
      </div>

      {/* Gender */}
      <div>
        <label className="block text-gray-700 dark:text-gray-300">Gender</label>
        <select
          name="gender"
          value={formData.gender}
          onChange={handleChange}
          className="w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition dark:bg-gray-900/60 dark:border-white/10 dark:text-white"
          required
        >
          <option value="">Select Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="non-binary">Non-Binary</option>
        </select>
        {errors.gender && <p className="text-red-500 text-sm">{errors.gender}</p>}
      </div>

      {/* Birthday */}
      <div>
        <label className="block text-gray-700 dark:text-gray-300">Birthday</label>
        <input
          type="date"
          name="birthday"
          value={formData.birthday}
          onChange={handleChange}
          className="w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition dark:bg-gray-900/60 dark:border-white/10 dark:text-white"
          autoComplete="bday"
          required
        />
      </div>

      {/* Username */}
      <div>
        <label className="block text-gray-700 dark:text-gray-300">Username</label>
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          className="w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition dark:bg-gray-900/60 dark:border-white/10 dark:text-white"
          autoComplete="username"
          required
        />
        {usernameAvailable === "unavailable" && <p className="text-red-500 text-sm">Username already taken</p>}
        {usernameAvailable === "available" && <p className="text-green-500 text-sm">Username available!</p>}
        {usernameAvailable === "too-short" && <p className="text-red-500 text-sm">Too short username</p>}
        {usernameAvailable === "too-long" && <p className="text-red-500 text-sm">Too long username</p>}
      </div>

      {/* Password */}
      <div>
        <label className="block text-gray-700 dark:text-gray-300">Password</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className="w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition dark:bg-gray-900/60 dark:border-white/10 dark:text-white"
          autoComplete="new-password"
          required
        />
        {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
      </div>

      {/* Confirm Password */}
      <div>
        <label className="block text-gray-700 dark:text-gray-300">Confirm Password</label>
        <input
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          className="w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition dark:bg-gray-900/60 dark:border-white/10 dark:text-white"
          autoComplete="new-password"
          required
        />
        {errors.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword}</p>}
      </div>

      {errorMessage && (
          <p className="text-red-500 text-sm text-center mb-4">
            {errorMessage}
          </p>
        )}

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full btn-primary py-2.5 text-sm font-semibold"
      >
        {isSubmitting ? "Signing Up..." : "Sign Up"}
      </button>
    </form>

    {/* Sign-in Link */}
    <p className="text-gray-600 dark:text-gray-400 text-sm text-center mt-4">
      Already have an account? <a href="/login" className="text-blue-600 hover:underline dark:text-sky-300">Sign in</a>
    </p>
  </div>
</div>

  );
}
