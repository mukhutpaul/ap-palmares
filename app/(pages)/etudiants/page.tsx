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
  getClasses,
  getFilieres,
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
  classe: Classe;
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
  const [classes, setClasses] = useState<Classe[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);

  const [popupOpen, setPopupOpen] = useState(false);
  const [editPopupOpen, setEditPopupOpen] = useState(false);

  const [selectedEtudiant, setSelectedEtudiant] = useState<Etudiant | null>(null);
  const [selectedClasse, setSelectedClasse] = useState<SelectOption | null>(null);

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

  useEffect(() => {
    const load = async () => {
      try {
        const [c, f] = await Promise.all([getClasses(), getFilieres()]);
        setClasses(c);
        setFilieres(f);
      } catch {
        toast.error("Erreur chargement classes / filières");
      }
    };
    load();
  }, []);

  /* =======================
     Options Select
  ======================= */
  const classeOptions: SelectOption[] = classes.map((c) => ({
    value: c.id,
    label: `${c.nom}${c.filiere ? ` (${c.filiere.nom})` : ""}`,
  }));

  const filiereOptions: SelectOption[] = filieres.map((f) => ({
    value: f.id,
    label: f.nom,
  }));

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

    const matchClasse = filterClasse ? e.classe.id === filterClasse.value : true;
    const matchFiliere = filterFiliere
      ? e.classe.filiere?.id === filterFiliere.value
      : true;

    return matchSearch && matchClasse && matchFiliere;
  });

  /* =======================
     Actions
  ======================= */
  const handleOpenAddPopup = () => {
    if (classes.length === 0) {
      toast.info("Les classes ne sont pas encore chargées");
      return;
    }
    setSelectedClasse(null);
    setPopupOpen(true);
  };

  const handleAddEtudiant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClasse) return toast.error("Sélectionnez une classe");
    if (!session?.user?.id) return toast.error("Utilisateur non connecté");

    const formData = new FormData(e.currentTarget);
    formData.append("classeId", selectedClasse.value.toString());
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
    setSelectedClasse({
      value: e.classe.id,
      label: `${e.classe.nom}${e.classe.filiere ? ` (${e.classe.filiere.nom})` : ""}`,
    });
    setEditPopupOpen(true);
  };

  const handleUpdateEtudiant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClasse || !selectedEtudiant) return;
    if (!session?.user?.id) return toast.error("Utilisateur non connecté");

    const formData = new FormData(e.currentTarget);
    formData.append("id", selectedEtudiant.id.toString());
    formData.append("classeId", selectedClasse.value.toString());
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
      <div className="flex gap-2 mb-4">
        <div className="flex items-center border px-3 gap-2 w-1/3">
          <LucideSearch size={18} />
          <input
            className="w-full"
            placeholder="Recherche..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select
          options={classeOptions}
          isClearable
          placeholder="Classe"
          className="w-1/4"
          value={filterClasse}
          onChange={(v) => setFilterClasse(v)}
        />

        <Select
          options={filiereOptions}
          isClearable
          placeholder="Filière"
          className="w-1/4"
          value={filterFiliere}
          onChange={(v) => setFilterFiliere(v)}
        />

        <button className="btn btn-primary" onClick={handleOpenAddPopup}>
          Ajouter
        </button>
      </div>

      {/* TABLEAU */}
      {filteredEtudiants.length === 0 ? (
        <div className="text-center text-gray-500 py-10">
          Aucun étudiant trouvé
        </div>
      ) : (
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Postnom</th>
              <th>Prénom</th>
              <th>Email</th>
              <th>Sexe</th>
              <th>Classe</th>
              <th>Filière</th>
              <th />
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
                <td>{e.classe.nom}</td>
                <td>{e.classe.filiere?.nom ?? "-"}</td>
                <td className="flex gap-2">
                  <button
                    className="btn btn-sm btn-warning"
                    onClick={() => openEditPopup(e)}
                  >
                    <LucideEdit2 size={16} />
                  </button>
                  <button
                    className="btn btn-sm btn-error"
                    onClick={() => handleDeleteEtudiant(e.id)}
                  >
                    <LucideTrash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* POPUP AJOUT */}
      {popupOpen && (
        <dialog className="modal modal-open">
          <form className="modal-box" onSubmit={handleAddEtudiant}>
            <h3 className="font-bold mb-4">Ajouter étudiant</h3>

            <input name="nom" placeholder="Nom" className="input w-full mb-2" required />
            <input name="postnom" placeholder="Postnom" className="input w-full mb-2" required />
            <input name="prenom" placeholder="Prénom" className="input w-full mb-2" required />
            <input name="email" type="email" placeholder="Email" className="input w-full mb-2" required />

            <select name="sexe" className="select w-full mb-2" required>
              <option value="">Sexe</option>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>

            <Select
              options={classeOptions}
              placeholder="Classe"
              value={selectedClasse}
              onChange={(v) => setSelectedClasse(v)}
            />

            <div className="modal-action">
              <button type="button" className="btn" onClick={() => setPopupOpen(false)}>
                Annuler
              </button>
              <button type="submit" className="btn btn-primary">
                Enregistrer
              </button>
            </div>
          </form>
        </dialog>
      )}

      {/* POPUP EDIT */}
      {editPopupOpen && selectedEtudiant && (
        <dialog className="modal modal-open">
          <form className="modal-box" onSubmit={handleUpdateEtudiant}>
            <h3 className="font-bold mb-4">Modifier étudiant</h3>

            <input name="nom" defaultValue={selectedEtudiant.nom} className="input w-full mb-2" required />
            <input name="postnom" defaultValue={selectedEtudiant.postnom} className="input w-full mb-2" required />
            <input name="prenom" defaultValue={selectedEtudiant.prenom} className="input w-full mb-2" required />
            <input name="email" defaultValue={selectedEtudiant.email} type="email" className="input w-full mb-2" required />

            <select
              name="sexe"
              defaultValue={selectedEtudiant.sexe}
              className="select w-full mb-2"
              required
            >
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>

            <Select
              options={classeOptions}
              placeholder="Classe"
              value={selectedClasse}
              onChange={(v) => setSelectedClasse(v)}
            />

            <div className="modal-action">
              <button type="button" className="btn" onClick={() => setEditPopupOpen(false)}>
                Annuler
              </button>
              <button type="submit" className="btn btn-primary">
                Enregistrer
              </button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
}
