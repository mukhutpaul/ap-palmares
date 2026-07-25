"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import confetti from "canvas-confetti";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    const fireConfetti = () => {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
      });
    };
    e.preventDefault();
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      toast.error("Email ou mot de passe incorrect ❌");
      return;
    }

    toast.success("Connexion réussie ✅");
    fireConfetti();
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 px-4">
      <form
        onSubmit={handleSubmit}
        className="
        card 
        w-full 
        max-w-md 
        bg-base-100 
        shadow-2xl 
        rounded-3xl 
        p-8 
        space-y-5
      "
      >
        {/* LOGO */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="
          w-24 
          h-24 
          rounded-full 
          bg-white 
          shadow-md 
          flex 
          items-center 
          justify-center
          overflow-hidden
        "
          >
            <img
              src="/logo-leon.png"
              alt="Logo Ap.Palmares"
              className="
              w-full 
              h-full 
              object-contain
              p-2
            "
            />
          </div>

          <h1 className="text-2xl font-bold text-center">EduTrack</h1>

          <p className="text-sm text-gray-500 text-center">
            Connectez-vous à votre espace
          </p>
        </div>

        {/* TITRE */}
        <h2 className="text-xl font-semibold text-center">Connexion</h2>

        {/* EMAIL */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Email</label>

          <input
            type="email"
            placeholder="Votre email"
            className="input input-bordered w-full rounded-xl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {/* PASSWORD */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Mot de passe</label>

          <input
            type="password"
            placeholder="Votre mot de passe"
            className="input input-bordered w-full rounded-xl"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {/* BUTTON */}
        <button
          type="submit"
          className="
          btn 
          btn-accent 
          w-full 
          rounded-xl 
          text-base
          shadow-md
        "
          disabled={loading}
        >
          {loading ? (
            <span className="loading loading-spinner loading-md"></span>
          ) : (
            "Se connecter"
          )}
        </button>

        <p className="text-xs text-center text-gray-400">
          © {new Date().getFullYear()} Ap.Palmares
        </p>
      </form>
    </div>
  );
}
