"use client";

import { useEffect, useState, useRef } from "react";
import { fetchAnnoncesFromDB, markAnnoncesAsRead } from "../actions";
import { Edit2, Trash2 } from "lucide-react";
import Pusher from "pusher-js";
import { toast } from "react-toastify";

interface Annonce {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
  };
}

export default function AnnonceList({ userId }: { userId: string }) {
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [loading, setLoading] = useState(true);
  const [canPlaySound, setCanPlaySound] = useState(false);
  const notificationSound = useRef<HTMLAudioElement | null>(null);

  // Précharger le son
  useEffect(() => {
    const audio = new Audio("/Sonnerie.mp3");
    audio.preload = "auto";
    notificationSound.current = audio;
  }, []);

  // Fetch initial des annonces
  useEffect(() => {
    let isMounted = true;

    async function fetchAnnonces() {
      try {
        const dataFromDB = await fetchAnnoncesFromDB();
        const formattedData: Annonce[] = dataFromDB.map((a) => ({
          id: a.id,
          title: a.title,
          content: a.content,
          createdAt: new Date(a.createdAt).toISOString(),
          user: a.user || { id: "unknown", name: "Utilisateur inconnu" },
        }));

        if (isMounted) {
          setAnnonces(formattedData);

          // 🔔 Marquer toutes les annonces comme lues pour que la sonnette passe à 0
          markAnnoncesAsRead(userId)
            .then(() => console.log("Toutes les annonces marquées comme lues"))
            .catch((err) => console.error("Erreur marquage lecture :", err));
        }
      } catch (err) {
        console.error(err);
        if (isMounted) setAnnonces([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchAnnonces();
    return () => { isMounted = false; };
  }, [userId]);

  // Pusher temps réel
  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe("annonces");

    channel.bind("new-annonce", (data: Annonce) => {
      const safeData: Annonce = {
        ...data,
        user: data.user || { id: "unknown", name: "Utilisateur inconnu" },
      };

      // Mise à jour instantanée
      setAnnonces((prev) => [safeData, ...prev]);

      // Jouer son si autorisé et pas l'expéditeur
      if (data.user?.id !== userId && canPlaySound) {
        notificationSound.current?.play().catch(() => {
          console.log("Impossible de jouer le son automatiquement.");
        });

        // Vibration si supportée
        if ("vibrate" in navigator) navigator.vibrate([100, 50, 100]);
      }

      // Notification système
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Nouvelle annonce", { body: data.title });
      }

      // Toast visuel
      toast.info(`Nouvelle annonce: ${data.title}`);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [userId, canPlaySound]);

  // Activer notifications
  const handleEnableNotifications = async () => {
    setCanPlaySound(true);

    // Demande permission notifications système
    if ("Notification" in window && Notification.permission !== "granted") {
      await Notification.requestPermission();
    }

    // Jouer un mini son pour confirmer
    notificationSound.current?.play().catch(() => {});
    toast.success("Notifications activées !");
  };

  useEffect(() => {
    if (!("Notification" in window)) return;

    Notification.requestPermission().then(async (permission) => {
      if (permission === "granted") {
        const token = await requestFcmToken();

        if (token) {
          await fetch("/api/save-fcm-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
        }
      }
    });
  }, []);

  if (loading)
    return <p className="text-center p-4">Chargement des annonces...</p>;
  if (annonces.length === 0)
    return <p className="text-center p-4">Aucune annonce disponible</p>;

  const handleEdit = (id: number) => console.log("Modifier annonce ID:", id);
  const handleDelete = (id: number) => console.log("Supprimer annonce ID:", id);

  return (
    <div>
      {!canPlaySound && (
        <div className="p-4 text-center">
          <button
            onClick={handleEnableNotifications}
            className="btn btn-primary"
          >
            Activer notifications
          </button>
        </div>
      )}

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {annonces.map((annonce) => (
          <div key={annonce.id} className="card bg-base-200 shadow-md">
            <div className="card-body">
              <div className="flex justify-between items-start">
                <h2 className="card-title text-lg font-bold break-words">
                  {annonce.title}
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(annonce.id)}
                    className="btn btn-ghost btn-sm p-1"
                    title="Modifier"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(annonce.id)}
                    className="btn btn-ghost btn-sm p-1"
                    title="Supprimer"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-2 break-words">
                Par {annonce.user?.name || "Utilisateur inconnu"} le{" "}
                {new Date(annonce.createdAt).toLocaleDateString("fr-FR")}
              </p>

              <div
                className="prose max-w-full break-words overflow-x-auto [&>img]:max-w-full [&>img]:h-auto"
                dangerouslySetInnerHTML={{ __html: annonce.content }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
