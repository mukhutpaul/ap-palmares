"use client";

import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import Select from "react-select";
import { LucideEdit2, LucideTrash2, LucideSearch } from "lucide-react";
import { useSession } from "next-auth/react";

import {
  addEtudiant,
  updateEtudiant,
  deleteEtudiant,
  getEtudiants,
} from "@/app/actions/etudiantsActions";

/* =======================
   Types
======================= */
interface Filiere {
  id: number;
  nom: string;
}

interface Classe {
  id: number;
  nom: string;
  section: string;
  filiere: Filiere | null;
}

interface Etudiant {
  id: number;
  nom: string;
  postnom: string;
  prenom: string;
  email: string;
  sexe: string;
}

interface SelectOption {
  value: number;
  label: string;
}

/* =======================
   Component
======================= */
export default function EtudiantsClient() {
  const [etudiants, setEtudiants] = useState<Etudiant[]>([]);
  const [popupOpen, setPopupOpen] = useState(false);
  const [editPopupOpen, setEditPopupOpen] = useState(false);

  const [selectedEtudiant, setSelectedEtudiant] = useState<Etudiant | null>(null);


  const [search, setSearch] = useState("");
  const [filterClasse, setFilterClasse] = useState<SelectOption | null>(null);
  const [filterFiliere, setFilterFiliere] = useState<SelectOption | null>(null);

  const { data: session } = useSession();

  /* =======================
     Chargements initiaux
  ======================= */
  useEffect(() => {
    getEtudiants()
      .then(setEtudiants)
      .catch(() => toast.error("Impossible de charger les étudiants"));
  }, []);



  /* =======================
     Options Select
  ======================= */
  /* =======================
     Filtrage
  ======================= */
  const filteredEtudiants = etudiants.filter((e) => {
    const s = search.toLowerCase();

    const matchSearch =
      e.nom.toLowerCase().includes(s) ||
      e.postnom.toLowerCase().includes(s) ||
      e.prenom.toLowerCase().includes(s) ||
      e.email.toLowerCase().includes(s);

    return matchSearch
  });

  /* =======================
     Actions
  ======================= */
  const handleOpenAddPopup = () => {
    setPopupOpen(true);
  };

  const handleAddEtudiant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session?.user?.id) return toast.error("Utilisateur non connecté");

    const formData = new FormData(e.currentTarget);
    formData.append("createdById", session.user.id);

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

  const openEditPopup = (e: Etudiant) => {
    setSelectedEtudiant(e);
    setEditPopupOpen(true);
  };

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

  /* =======================
     Render
  ======================= */
  return (
    <div className="mx-8 mt-8">
      <h1 className="text-3xl font-bold mb-6">Gestion des Étudiants</h1>

      {/* Filtres */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-base-100 shadow-sm w-72">
            <LucideSearch size={18} />
            <input
              className="w-full"
              placeholder="Recherche..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <button className="btn btn-accent" onClick={handleOpenAddPopup}>
          Ajouter
        </button>
      </div>

      {/* TABLEAU */}
      {filteredEtudiants.length === 0 ? (
        <div className="text-center text-gray-500 py-10">
          Aucun étudiant trouvé
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-base-100 shadow-sm">
          <table className="table w-full">
            <thead>
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
                  <td className="text-center">
                    <div className="flex justify-center gap-2">
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* POPUP AJOUT */}
      {popupOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box relative max-w-lg p-8 rounded-2xl shadow-2xl">

            {/* Bouton fermer (croix) */}
            <button
              type="button"
              onClick={() => setPopupOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-red-500 transition"
            >
              ✕
            </button>

            <h3 className="text-2xl font-bold mb-6 text-center">
              Ajouter un étudiant
            </h3>

            <form onSubmit={handleAddEtudiant} className="space-y-4">

              <input
                name="nom"
                placeholder="Nom"
                className="input input-bordered w-full rounded-xl"
                required
              />

              <input
                name="postnom"
                placeholder="Postnom"
                className="input input-bordered w-full rounded-xl"
                required
              />

              <input
                name="prenom"
                placeholder="Prénom"
                className="input input-bordered w-full rounded-xl"
                required
              />

              <input
                name="email"
                type="email"
                placeholder="Email"
                className="input input-bordered w-full rounded-xl"
                required
              />

              <select
                name="sexe"
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

          {/* Background overlay */}
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setPopupOpen(false)}>close</button>
          </form>
        </dialog>
      )}


      {/* POPUP EDIT */}
      {/* POPUP EDIT */}
      {editPopupOpen && selectedEtudiant && (
        <dialog className="modal modal-open">
          <div className="modal-box relative max-w-lg p-8 rounded-2xl shadow-2xl">

            {/* Bouton fermer (croix) */}
            <button
              type="button"
              onClick={() => setEditPopupOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-red-500 transition"
            >
              ✕
            </button>

            <h3 className="text-2xl font-bold mb-6 text-center">
              Modifier un étudiant
            </h3>

            <form onSubmit={handleUpdateEtudiant} className="space-y-4">
              <input type="hidden" name="id" value={selectedEtudiant.id} />

              <input
                name="nom"
                defaultValue={selectedEtudiant.nom}
                placeholder="Nom"
                className="input input-bordered w-full rounded-xl"
                required
              />

              <input
                name="postnom"
                defaultValue={selectedEtudiant.postnom}
                placeholder="Postnom"
                className="input input-bordered w-full rounded-xl"
                required
              />

              <input
                name="prenom"
                defaultValue={selectedEtudiant.prenom}
                placeholder="Prénom"
                className="input input-bordered w-full rounded-xl"
                required
              />

              <input
                name="email"
                defaultValue={selectedEtudiant.email}
                type="email"
                placeholder="Email"
                className="input input-bordered w-full rounded-xl"
                required
              />

              <select
                name="sexe"
                defaultValue={selectedEtudiant.sexe}
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

          {/* Background overlay */}
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setEditPopupOpen(false)}>close</button>
          </form>
        </dialog>
      )}

    </div>
  );
}
