"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify"
import confetti from "canvas-confetti";

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    const fireConfetti = () => {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
      });
    };
    e.preventDefault()
    setLoading(true)

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (res?.error) {
      toast.error("Email ou mot de passe incorrect ❌")
      return
    }

    toast.success("Connexion réussie ✅")
    fireConfetti()
    router.push("/")
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="card w-96 bg-base-100 shadow-xl p-6 space-y-4"
      >
        <h2 className="text-2xl font-bold text-center">Connexion</h2>

        <input
          type="email"
          placeholder="Email"
          className="input input-bordered w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Mot de passe"
          className="input input-bordered w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" className="btn btn-accent w-full" disabled={loading}>
          {loading ? (
            <span className="loading loading-spinner loading-md"></span>
          ) : (
            "Se connecter"
          )}
        </button>
      </form>
    </div>
  )
}
