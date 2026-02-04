// src/components/ThemeSwitcher.tsx
"use client"

const themes = [
  "light",
  "dark",
  "cupcake",
  "retro",
  "corporate",
  "synthwave",
  "emerald",
]

export default function ThemeSwitcher() {
  function setTheme(theme: string) {
    document.documentElement.setAttribute("data-theme", theme)
  }

  return (
    <select
      className="select  w-24 max-w-xs select-sm"
      onChange={(e) => setTheme(e.target.value)}
    >
      {themes.map((theme) => (
        <option key={theme} value={theme}>
          {theme}
        </option>
      ))}
    </select>
  )
}
