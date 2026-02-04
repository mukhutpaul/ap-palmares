"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name })
    })

    if (res.ok) router.push("/login")
    else toast.error("Erreur lors de l'inscription")
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="card w-96 bg-base-100 shadow-xl p-6 space-y-4">
        <h2 className="text-2xl font-bold text-center">Inscription</h2>
        <input
          type="text"
          placeholder="Nom"
          className="input input-bordered w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="email"
          placeholder="Email"
          className="input input-bordered w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Mot de passe"
          className="input input-bordered w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="btn btn-secondary w-full">Créer un compte</button>
      </form>
    </div>
  )
}
