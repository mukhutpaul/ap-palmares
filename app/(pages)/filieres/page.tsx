"use client";

import {
  addFiliere,
  deleteFiliere,
  updateFiliere,
  getFilieres,
} from "@/app/actions/filieresActions";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import ReactConfetti from "react-confetti";
import { LucideEdit2, LucideTrash2, LucideSearch } from "lucide-react";
import Swal from "sweetalert2";


interface Filiere {
  id: number;
  nom: string;
  nombreHp: number;
  nombreHt: number;
  description: string | null;
  createdAt: Date; // ✅ corriger ici
  createdById: string;
}


export default function FilieresClient() {
  const [popupOpen, setPopupOpen] = useState(false);
  const [editPopupOpen, setEditPopupOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [filiereList, setFiliereList] = useState<Filiere[]>([]);
  const [search, setSearch] = useState("");
  const [selectedFiliere, setSelectedFiliere] = useState<Filiere | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const updateSize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    const fetchFilieres = async () => {
      try {
        const filieres = await getFilieres();
        setFiliereList(filieres);
      } catch {
        toast.error("Impossible de charger les filières");
      }
    };
    fetchFilieres();
  }, []);

  const filteredFilieres = filiereList.filter((f) =>
    f.nom.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredFilieres.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedFilieres = filteredFilieres.slice(
    startIdx,
    startIdx + itemsPerPage
  );

  const handleAddFiliere = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const newFiliere = await addFiliere(formData);
      setFiliereList([newFiliere, ...filiereList]);
      toast.success("Filière ajoutée !");
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      setPopupOpen(false);
      form.reset();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openEditPopup = (filiere: Filiere) => {
    setSelectedFiliere(filiere);
    setEditPopupOpen(true);
  };


  const handleUpdateFiliere = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    try {
      const updated = await updateFiliere(formData);

      setFiliereList((prev) =>
        prev.map((f) => (f.id === updated.id ? updated : f))
      );

      toast.success("Filière mise à jour !");
      setEditPopupOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };


  const handleDeleteFiliere = async (id: number) => {
    const result = await Swal.fire({
      title: "Supprimer cette filière ?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Oui",
      cancelButtonText: "Annuler",
    });

    if (result.isConfirmed) {
      await deleteFiliere(id);
      setFiliereList((prev) => prev.filter((f) => f.id !== id));
      toast.success("Filière supprimée !");
    }
  };

  return (
    <div className="mx-8 mt-8 relative">
      {showConfetti && (
        <ReactConfetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
        />
      )}

      <h1 className="text-3xl font-bold mb-6">Gestion des Filières</h1>

      <div className="flex justify-between mb-6">
        <input
          type="text"
          placeholder="Rechercher..."
          className="input input-bordered w-72"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="btn btn-accent"
          onClick={() => setPopupOpen(true)}
        >
          Ajouter
        </button>
      </div>

      {/* TABLEAU */}
      <div className="overflow-x-auto rounded-xl border shadow">
        <table className="table w-full">
          <thead className="bg-base-200 text-sm">
            <tr>
              <th>ID</th>
              <th>Nom</th>
              <th>HP</th>
              <th>HT</th>
              <th>Description</th>
              <th>Date</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedFilieres.map((f) => (
              <tr key={f.id}>
                <td>{f.id}</td>
                <td>{f.nom}</td>
                <td>{f.nombreHp}</td>
                <td>{f.nombreHt}</td>
                <td>{f.description}</td>
                <td>
                  {new Date(f.createdAt).toLocaleDateString()}
                </td>
                <td className="flex justify-center gap-2">
                  <button className="btn btn-xs btn-warning btn-outline" onClick={() => openEditPopup(f)}>
                    <LucideEdit2 size={14} />
                  </button>
                  <button className="btn btn-xs btn-outline btn-error" onClick={() => handleDeleteFiliere(f.id)}>
                    <LucideTrash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* POPUP AJOUT */}
      {popupOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box w-full max-w-lg relative p-6">

            {/* Bouton fermeture (croix en haut à droite) */}
            <button
              type="button"
              onClick={() => setPopupOpen(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
            >
              ✕
            </button>

            <h3 className="font-bold text-xl mb-6 text-center">
              Ajouter une filière
            </h3>

            <form
              className="flex flex-col gap-4"
              onSubmit={handleAddFiliere}
            >
              <input
                name="nom"
                placeholder="Nom"
                className="input input-bordered w-full"
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  name="nombreHp"
                  type="number"
                  placeholder="Nombre HP"
                  className="input input-bordered w-full"
                />

                <input
                  name="nombreHt"
                  type="number"
                  placeholder="Nombre HT"
                  className="input input-bordered w-full"
                />
              </div>

              <textarea
                name="description"
                placeholder="Description"
                className="textarea textarea-bordered w-full"
                rows={3}
              />

              <div className="mt-4">
                <button type="submit" className="btn btn-accent w-full">
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}


      {/* POPUP MODIFICATION */}
      {editPopupOpen && selectedFiliere && (
        <dialog className="modal modal-open">
          <div className="modal-box w-full max-w-lg relative p-6">

            {/* Bouton fermeture (croix en haut à droite) */}
            <button
              type="button"
              onClick={() => setEditPopupOpen(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
            >
              ✕
            </button>

            <h3 className="font-bold text-xl mb-6 text-center">
              Modification filière
            </h3>

            <form
              className="flex flex-col gap-4"
              onSubmit={handleUpdateFiliere}
            >
              <input type="hidden" name="id" value={selectedFiliere.id} />

              <input
                name="nom"
                defaultValue={selectedFiliere.nom}
                className="input input-bordered w-full"
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  name="nombreHp"
                  type="number"
                  defaultValue={selectedFiliere.nombreHp}
                  className="input input-bordered w-full"
                />
                <input
                  name="nombreHt"
                  type="number"
                  defaultValue={selectedFiliere.nombreHt}
                  className="input input-bordered w-full"
                />
              </div>

              <textarea
                name="description"
                defaultValue={selectedFiliere.description || ""}
                className="textarea textarea-bordered w-full"
                rows={3}
              />

              <div className="mt-4">
                <button type="submit" className="btn btn-accent w-full">
                  Modifier
                </button>
              </div>
            </form>
          </div>
        </dialog>
      )}

    </div>
  );
}
