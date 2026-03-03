"use client";

import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { LucideEdit2, LucideTrash2, LucideSearch } from "lucide-react";
import { useSession } from "next-auth/react";

import {
  addEtudiant,
  updateEtudiant,
  deleteEtudiant,
  getEtudiants,
} from "@/app/actions/etudiantsActions";
import EmptyStates from "@/app/components/EmptyStates";

interface Etudiant {
  id: number;
  nom: string;
  postnom: string;
  prenom: string;
  email: string;
  sexe: string;
}

export default function EtudiantsClient() {
  const [etudiants, setEtudiants] = useState<Etudiant[]>([]);
  const [popupOpen, setPopupOpen] = useState(false);
  const [editPopupOpen, setEditPopupOpen] = useState(false);
  const [selectedEtudiant, setSelectedEtudiant] = useState<Etudiant | null>(null);
  const [search, setSearch] = useState("");

  const { data: session } = useSession();

  // Charger les étudiants
  useEffect(() => {
    getEtudiants()
      .then(setEtudiants)
      .catch(() => toast.error("Impossible de charger les étudiants"));
  }, []);

  // Filtrage
  const filteredEtudiants = etudiants.filter((e) => {
    const s = search.toLowerCase();
    return (
      e.nom.toLowerCase().includes(s) ||
      e.postnom.toLowerCase().includes(s) ||
      e.prenom.toLowerCase().includes(s) ||
      e.email.toLowerCase().includes(s)
    );
  });

  // Ouvrir popup ajout
  const handleOpenAddPopup = () => setPopupOpen(true);

  // Ajouter étudiant
  const handleAddEtudiant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    //if (!session?.user?.id) return toast.error("Utilisateur non connecté");

    const formData = new FormData(e.currentTarget);
    //formData.append("createdById", session.user.id);

    try {
      const created = await addEtudiant(formData);
      setEtudiants((prev) => [created, ...prev]);
      setPopupOpen(false);
      toast.success("Étudiant ajouté");
    } catch (error) {
      console.error(error);
      toast.error("Erreur ajout étudiant");
    }
  };

  // Ouvrir popup édition
  const openEditPopup = (etudiant: Etudiant) => {
    setSelectedEtudiant(etudiant);
    setEditPopupOpen(true);
  };

  // Modifier étudiant
  const handleUpdateEtudiant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session?.user?.id) return toast.error("Utilisateur non connecté");

    const formData = new FormData(e.currentTarget);
    formData.append("createdById", session.user.id);

    try {
      const updated = await updateEtudiant(formData);
      setEtudiants((prev) =>
        prev.map((x) => (x.id === updated.id ? updated : x))
      );
      setEditPopupOpen(false);
      toast.success("Étudiant modifié");
    } catch (error) {
      console.error(error);
      toast.error("Erreur modification étudiant");
    }
  };

  // Supprimer étudiant
  const handleDeleteEtudiant = async (id: number) => {
    const res = await Swal.fire({
      title: "Supprimer cet étudiant ?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Oui",
      cancelButtonText: "Non",
    });

    if (!res.isConfirmed) return;

    try {
      await deleteEtudiant(id);
      setEtudiants((prev) => prev.filter((e) => e.id !== id));
      toast.success("Étudiant supprimé");
    } catch (error) {
      console.error(error);
      toast.error("Erreur suppression étudiant");
    }
  };

  return (
    <div className="mx-8 mt-8">
      <h1 className="text-3xl font-bold mb-6">Gestion des Étudiants</h1>

      {/* Filtres */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-base-100 shadow-sm w-72">
          <LucideSearch size={18} />
          <input
            className="w-full"
            placeholder="Recherche..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-accent" onClick={handleOpenAddPopup}>
          Ajouter
        </button>
      </div>

      {/* Tableau */}
      {filteredEtudiants.length === 0 ? (
        <EmptyStates IconComponent={"User"} message="Aucun étudiant trouvé" sm />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-base-100 shadow-sm">
          <table className="table w-full">
            <thead className="bg-base-200 text-sm">
              <tr>
                <th>Nom</th>
                <th>Postnom</th>
                <th>Prénom</th>
                <th>Email</th>
                <th>Sexe</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEtudiants.map((e) => (
                <tr key={e.id}>
                  <td>{e.nom}</td>
                  <td>{e.postnom}</td>
                  <td>{e.prenom}</td>
                  <td>{e.email}</td>
                  <td>{e.sexe}</td>
                  <td className="text-center flex justify-center gap-2">
                    <button
                      className="btn btn-xs btn-warning btn-outline"
                      onClick={() => openEditPopup(e)}
                    >
                      <LucideEdit2 size={16} />
                    </button>
                    <button
                      className="btn btn-xs btn-outline btn-error"
                      onClick={() => handleDeleteEtudiant(e.id)}
                    >
                      <LucideTrash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Popup Ajout */}
      {popupOpen && (
        <EtudiantFormPopup
          title="Ajouter un étudiant"
          onClose={() => setPopupOpen(false)}
          onSubmit={handleAddEtudiant}
        />
      )}

      {/* Popup Édition */}
      {editPopupOpen && selectedEtudiant && (
        <EtudiantFormPopup
          title="Modifier un étudiant"
          etudiant={selectedEtudiant}
          onClose={() => setEditPopupOpen(false)}
          onSubmit={handleUpdateEtudiant}
        />
      )}
    </div>
  );
}

/* Popup formulaire réutilisable */
interface FormPopupProps {
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  etudiant?: Etudiant;
}

function EtudiantFormPopup({ title, onClose, onSubmit, etudiant }: FormPopupProps) {
  return (
    <dialog className="modal modal-open">
      <div className="modal-box relative max-w-lg p-8 rounded-2xl shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-red-500 transition"
        >
          ✕
        </button>
        <h3 className="text-2xl font-bold mb-6 text-center">{title}</h3>

        <form onSubmit={onSubmit} className="space-y-4">
          {etudiant && <input type="hidden" name="id" value={etudiant.id} />}
          <input
            name="nom"
            defaultValue={etudiant?.nom || ""}
            placeholder="Nom"
            className="input input-bordered w-full rounded-xl"
            required
          />
          <input
            name="postnom"
            defaultValue={etudiant?.postnom || ""}
            placeholder="Postnom"
            className="input input-bordered w-full rounded-xl"
            required
          />
          <input
            name="prenom"
            defaultValue={etudiant?.prenom || ""}
            placeholder="Prénom"
            className="input input-bordered w-full rounded-xl"
            required
          />
          <input
            name="email"
            type="email"
            defaultValue={etudiant?.email || ""}
            placeholder="Email"
            className="input input-bordered w-full rounded-xl"
            required
          />
          <select
            name="sexe"
            defaultValue={etudiant?.sexe || ""}
            className="select select-bordered w-full rounded-xl"
            required
          >
            <option value="">Sélectionner le sexe</option>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </select>
          <button
            type="submit"
            className="btn btn-accent w-full mt-4 rounded-xl text-lg"
          >
            Enregistrer
          </button>
        </form>
      </div>
    </dialog>
  );
}