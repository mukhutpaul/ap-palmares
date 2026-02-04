'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import frLocale from '@fullcalendar/core/locales/fr'
import { useEffect, useState } from 'react'

export default function Calendar() {
  const [currentView, setCurrentView] = useState<'dayGridMonth' | 'listWeek'>('dayGridMonth')

  // Change la vue automatiquement selon la taille de l'écran
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCurrentView('listWeek')
      } else {
        setCurrentView('dayGridMonth')
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize() // initial
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="card bg-base-100 shadow-xl relative py-4 px-4 md:px-[10%]">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin, listPlugin]}
        initialView={currentView}
        height="auto"
        locale={frLocale}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,listWeek',
        }}
        buttonText={{
          today: "Aujourd'hui",
          month: 'Mois',
          week: 'Semaine',
          list: 'Liste',
        }}
        events={[
          { title: 'Réunion', date: '2026-02-02' },
          { title: 'Meeting équipe', date: '2026-02-15' },
        ]}
        // Pour que le calendrier s'adapte mieux sur mobile
        dayMaxEvents={true} 
      />
      <style jsx global>{`
        /* FullCalendar responsive tweaks */
        .fc {
          max-width: 100%;
          overflow-x: auto;
        }

        .fc .fc-toolbar-chunk {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap; /* permet de passer à la ligne sur mobile */
        }

        .fc .fc-toolbar-title {
          font-size: 1.25rem;
          font-weight: 600;
        }

        .fc .fc-button {
          border-radius: 0.5rem;
          padding: 0.25rem 0.75rem;
          background-color: #f3f4f6;
          color: #111827;
          border: 1px solid #d1d5db;
          font-weight: 500;
          transition: all 0.2s;
        }

        .fc .fc-button:hover {
          background-color: #e5e7eb;
        }

        /* Jour / colonnes sur mobile */
        @media (max-width: 768px) {
          .fc .fc-col-header-cell {
            font-size: 0.7rem;
            padding: 0.25rem;
            white-space: normal;
          }

          .fc .fc-daygrid-day {
            min-width: 60px;
          }

          .fc .fc-daygrid-event {
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  )
}
