"use client"

import { AudioWaveform, GlobeLock, LogOut, Menu, Settings, User, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import React, { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import ThemeSwitcher from './ThemeSwitcher'
import { useSession, signOut } from "next-auth/react"

// Typage Role correspondant à ton enum Prisma
type Role = "ADMIN" | "USER" | "ENSEIGNANT"

interface NavLink {
  href: string
  label: string
  auth?: boolean
  roles?: Role[]
}

const NavBar = () => {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [pageName, setPageName] = useState<string | null>(null)

  // Notifications
  const [notifications, setNotifications] = useState(0)
  const notificationSound = useRef<HTMLAudioElement | null>(null)

  // Charger le compteur d'annonces non lues côté serveur avec polling
  // ... à ajouter si nécessaire

  // Notifications temps réel (son)
  useEffect(() => {
    notificationSound.current = new Audio("/Sonnerie2.mp3")
    notificationSound.current.preload = "auto"

    const handleNewAnnonce = (e: CustomEvent) => {
      if (!session?.user) return
      if (e.detail.userId !== session.user.id) {
        setNotifications(prev => prev + 1)
        notificationSound.current?.play().catch(() => { })
      }
    }

    window.addEventListener("new-annonce", handleNewAnnonce as EventListener)
    return () => window.removeEventListener("new-annonce", handleNewAnnonce as EventListener)
  }, [session?.user])

  // Cliquer sur la cloche : réinitialiser + redirection
  const handleClickNotifications = () => {
    setNotifications(0)
    router.push("/notifications")
  }

  // Liens de navigation
  const navLinks: NavLink[] = [
    { href: "/", label: "Accueil" },
    { href: "/dashboard", label: "Tableau de bord", auth: true, roles: ["USER", "ADMIN"] },
    { href: "/etudiants", label: "Etudiants", auth: true, roles: ["USER", "ADMIN"] },
    { href: "/filieres", label: "Filières", auth: true, roles: ["USER", "ADMIN"] },
    { href: "/sessions", label: "Sessions", auth: true, roles: ["USER", "ADMIN"] },
    { href: "/users", label: "Utilisateurs", auth: true, roles: ["USER", "ADMIN"] },
    { href: "/classes", label: "Classes", auth: true, roles: ["USER", "ADMIN"] },
    { href: "/competences", label: "Compétences", auth: true, roles: ["USER", "ADMIN"] },
    { href: "/evaluations", label: "Evaluations", auth: true, roles: ["USER", "ADMIN"] },
    { href: "/notes", label: "Notes", auth: true, roles: ["USER", "ADMIN"] },




    // { href: "/annonces", label: "Annonces", auth: true, roles: ["USER", "ADMIN"] },
    // { href: "/evenements", label: "Evenements", auth: true, roles: ["USER", "ADMIN"] },
    // { href: "/dashboard", label: "Tableau de bord", auth: true, roles: ["ADMIN"] },
  ]

  // Filtrer les liens selon l'auth et les rôles
  const filteredLinks = navLinks.filter((link) => {
    if (!link.auth) return true
    if (!session?.user) return false
    if (link.roles) {
      // Convertir session.user.role string en Role
      const userRole = session.user.role as Role
      return link.roles.includes(userRole)
    }
    return true
  })

  const isActiveLink = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  const renderLinks = (className: string) => (
    <>
      <button className="btn btn-sm btn-accent btn-circle hidden md:flex"
        onClick={() => (document.getElementById('my_modal_3') as HTMLDialogElement)?.showModal()}>
        <Settings className='w-4 h-4' />
      </button>

      {filteredLinks.map(({ href, label }) => (
        <Link key={href} href={href} className={`${className} ${isActiveLink(href) ? "btn-accent text-white" : ""} btn-sm`}>
          {label}
        </Link>
      ))}

      {pageName && (
        <Link href={`/page/${pageName}`} className={`${className} btn-sm`}>
          <GlobeLock className='w-4 h-4' />
        </Link>
      )}
    </>
  )

  return (
    <div className='border-b border-base-300 px-5 md:px-[5%] py-4 relative'>
      <div className='flex justify-between items-center'>
        <div className='flex items-center gap-2'>
          <div className='rounded-full p-2'>
            <AudioWaveform className='w-6 h-6 text-accent' />
          </div>
          <span className='font-bold text-xl'>Ap.Palmares</span>
          <ThemeSwitcher />
        </div>

        <button className='btn w-fit btn-sm sm:hidden' onClick={() => setMenuOpen(!menuOpen)}>
          <Menu className='w-4' />
        </button>

        <div className='space-x-2 flex items-center hidden sm:flex'>
          {renderLinks("btn rounded-xl")}

          {/* Sonnette notifications */}
          <div className="relative">
            <button
              className="btn btn-sm btn-warning btn-circle relative"
              onClick={handleClickNotifications}
              title="Notifications"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </button>
          </div>

          {/* Dropdown utilisateur */}
          <div className="dropdown dropdown-start">
            {session && (
              <button tabIndex={0} className="btn btn-sm btn-accent btn-circle">
                <User className='w-4 h-4' />
              </button>
            )}
            <ul tabIndex={-1} className="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm">
              <li><span><User className='w-4 h-4' /> {session?.user?.email}</span></li>
              <li><span><Settings className='w-4 h-4' /> Paramettre</span></li>
              <li>
                <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-red-600">
                  <LogOut className='w-4 h-4' /> Se déconnecter
                </button>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Menu mobile */}
      <div className={`absolute top-0 w-full bg-base-100 h-screen flex flex-col gap-2 p-4 transition-all duration-300 sm:hidden z-50 ${menuOpen ? "left-0" : "-left-full"}`}>
        <div className='flex justify-between'>
          <button className='btn w-fit btn-sm sm:hidden' onClick={() => setMenuOpen(false)}>
            <X className='w-4' />
          </button>

          {session && (
            <div className='flex gap-2'>
              <button className="btn btn-sm btn-accent btn-circle">
                <Settings className='w-4 h-4' />
              </button>
              <button className="btn btn-sm btn-accent btn-circle">
                <User className='w-4 h-4' />
              </button>
              <div className="relative">
                <button
                  className="btn btn-sm btn-warning btn-circle relative"
                  onClick={handleClickNotifications}
                  title="Notifications"
                >
                  {notifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {notifications}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {renderLinks("btn")}
      </div>
    </div>
  )
}

export default NavBar
