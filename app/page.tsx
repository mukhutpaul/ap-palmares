"use client"

import Link from "next/link";
import Navbar from "./components/Navbar";
import { useSession } from "next-auth/react";
import Calendar from "./components/Calendar";

export default function Home() {
  const { data: session } = useSession();

  return (
    <div>
      <Navbar />

      {/* Espace réservé pour le Navbar fixe */}
      <main className="pt-24">
        <div className="flex items-center justify-between flex-col py-10 w-full">

          <div>
            <div className="flex flex-col">

              <h1 className="text-4xl md:text-5xl font-bold text-center">
                Prenez le contrôle <br /> du palmarès de vos apprenants
              </h1>

              <p className="py-6 text-gray-800 text-center">
                Suivez l’évolution de vos apprenants <br />
                en toute simplicité grâce à notre application intuitive !
              </p>

              <div className="flex justify-center items-center">
                {!session && (
                  <Link
                    href="/login"
                    className="btn btn-sm md:btn-md btn-outline btn-accent"
                  >
                    Se connecter
                  </Link>
                )}
              </div>

            </div>
          </div>

          <Calendar />

        </div>
      </main>
    </div>
  );
}