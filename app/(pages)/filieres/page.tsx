"use client";

import { addFiliere, deleteFiliere, updateFiliere, getFilieres } from "@/app/actions/filieresActions";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import ReactConfetti from "react-confetti";
import { LucideEdit2, LucideTrash2, LucideSearch } from "lucide-react";
import Swal from "sweetalert2";

interface Filiere {
  id: number;
  nom: string;
}

export default function FilieresClient() {
  const [popupOpen, setPopupOpen] = useState(false);
  const [editPopupOpen, setEditPopupOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [filiereList, setFiliereList] = useState<Filiere[]>([]);
  const [search, setSearch] = useState("");
  const [selectedFiliere, setSelectedFiliere] = useState<Filiere | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Taille fenêtre pour confetti
  useEffect(() => {
    const updateSize = () =>
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Charger les filières depuis la BDD
  useEffect(() => {
    const fetchFilieres = async () => {
      try {
        const filieres = await getFilieres();
        setFiliereList(filieres);
      } catch (err: any) {
        console.error("Erreur lors du chargement des filières :", err);
        toast.error("Impossible de charger les filières");
      }
    };
    fetchFilieres();
  }, []);

  // Filtrage
  const filteredFilieres = filiereList
    .filter((f) => f.nom.toLowerCase().includes(search.toLowerCase()));

  // Pagination calcul
  const totalPages = Math.ceil(filteredFilieres.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedFilieres = filteredFilieres.slice(startIdx, endIdx);

  // Ajouter une filière
  const handleAddFiliere = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const newFiliere = await addFiliere(formData);
      setFiliereList([newFiliere, ...filiereList]);
      toast.success("Filière ajoutée avec succès !");
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      setPopupOpen(false);
      form.reset();
    } catch (err: any) {
      console.error("Erreur lors de l'ajout :", err);
      toast.error("Erreur lors de l'ajout : " + (err?.message || "Erreur inconnue"));
    }
  };

  // Supprimer une filière
  const handleDeleteFiliere = async (id: number) => {
    const result = await Swal.fire({
      title: "Voulez-vous vraiment supprimer cette filière ?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Oui, supprimer",
      cancelButtonText: "Annuler",
      width: 400,           // largeur réduite
      padding: "1.5rem",    // padding intérieur
      reverseButtons: true, // bouton annuler à gauche
    });

    if (result.isConfirmed) {
      try {
        await deleteFiliere(id);
        setFiliereList(filiereList.filter((f) => f.id !== id));
        toast.success("Filière supprimée !");
      } catch (err: any) {
        console.error("Erreur lors de la suppression :", err);
        toast.error("Erreur lors de la suppression : " + (err?.message || "Erreur inconnue"));
      }
    }
  };

  // Ouvrir popup modification
  const openEditPopup = (filiere: Filiere) => {
    setSelectedFiliere(filiere);
    setEditPopupOpen(true);
  };

  // Modifier une filière
  const handleUpdateFiliere = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFiliere) return;

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const nom = formData.get("nom") as string;

    if (!nom.trim()) {
      toast.error("Le nom de la filière ne peut pas être vide !");
      return;
    }

    try {
      const updated = await updateFiliere(formData);
      setFiliereList(
        filiereList.map((f) => (f.id === updated.id ? updated : f))
      );
      toast.success("Filière mise à jour !");
      setEditPopupOpen(false);
    } catch (err: any) {
      console.error("Erreur lors de la mise à jour :", err);
      toast.error("Erreur lors de la mise à jour : " + (err?.message || "Erreur inconnue"));
    }
  };

  return (
    <div className="mx-8 mt-8 relative">
      {/* Confetti */}
      {showConfetti && windowSize.width > 0 && windowSize.height > 0 && (
        <ReactConfetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={200} />
      )}

      <h1 className="text-3xl font-bold mb-6">Gestion des Filières</h1>

      {/* Recherche + ajout */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center border rounded-lg px-3 py-2 gap-2 w-1/3">
          <LucideSearch size={20} />
          <input
            type="text"
            placeholder="Rechercher une filière..."
            className="input input-ghost w-full"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1); // reset page à 1 lors d'une recherche
            }}
          />
        </div>
        <button className="btn btn-primary" onClick={() => setPopupOpen(true)}>
          Ajouter une filière
        </button>
      </div>

      {/* Popup Ajouter */}
      {popupOpen && (
        <dialog className="modal modal-open">
          <form className="modal-box flex flex-col gap-4" onSubmit={handleAddFiliere}>
            <h3 className="font-bold text-lg">Ajouter une filière</h3>
            <input type="text" name="nom" placeholder="Nom de la filière" className="input input-bordered w-full" required />
            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={() => setPopupOpen(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary">Ajouter</button>
            </div>
          </form>
        </dialog>
      )}

      {/* Popup Modifier */}
      {editPopupOpen && selectedFiliere && (
        <dialog className="modal modal-open">
          <form className="modal-box flex flex-col gap-4" onSubmit={handleUpdateFiliere}>
            <h3 className="font-bold text-lg">Modifier la filière</h3>
            <input type="hidden" name="id" value={selectedFiliere.id} />
            <input type="text" name="nom" defaultValue={selectedFiliere.nom} className="input input-bordered w-full" required />
            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={() => setEditPopupOpen(false)}>Annuler</button>
              <button type="submit" className="btn btn-warning">Modifier</button>
            </div>
          </form>
        </dialog>
      )}

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedFilieres.length > 0 ? (
              paginatedFilieres.map((f) => (
                <tr key={f.id}>
                  <td>{f.id}</td>
                  <td>{f.nom}</td>
                  <td className="flex justify-center gap-2">
                    <button className="btn btn-sm btn-warning flex items-center gap-1" onClick={() => openEditPopup(f)}>
                      <LucideEdit2 size={16} /> Modifier
                    </button>
                    <button className="btn btn-sm btn-error flex items-center gap-1" onClick={() => handleDeleteFiliere(f.id)}>
                      <LucideTrash2 size={16} /> Supprimer
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="text-center">Aucune filière trouvée</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            className="btn btn-sm"
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
          >
            Précédent
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={`btn btn-sm ${p === currentPage ? "btn-primary" : ""}`}
              onClick={() => setCurrentPage(p)}
            >
              {p}
            </button>
          ))}
          <button
            className="btn btn-sm"
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}
