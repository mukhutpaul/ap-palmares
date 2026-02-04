"use client";

import { addClasse, deleteClasse, updateClasse, getClasses } from "@/app/actions/classesActions";
import { getFilieres } from "@/app/actions/filieresActions";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import ReactConfetti from "react-confetti";
import { LucideEdit2, LucideTrash2, LucideSearch, LucideChevronUp, LucideChevronDown } from "lucide-react";
import Swal from "sweetalert2";
import { Filiere } from "@prisma/client";
import Select from "react-select";

interface Classe {
  id: number;
  nom: string;
  section: string;
  filiere: { id: number; nom: string };
}

export default function ClassesClient() {
  const [popupOpen, setPopupOpen] = useState(false);
  const [editPopupOpen, setEditPopupOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [classeList, setClasseList] = useState<Classe[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [search, setSearch] = useState("");
  const [selectedClasse, setSelectedClasse] = useState<Classe | null>(null);
  const [selectedFiliere, setSelectedFiliere] = useState<{ value: number; label: string } | null>(null);
  const [sectionFilter, setSectionFilter] = useState<string>("");
  const [filiereFilter, setFiliereFilter] = useState<string>("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [filiereSortAsc, setFiliereSortAsc] = useState<boolean | null>(null); // null = pas de tri

  // Adapter la taille du confetti
  useEffect(() => {
    const updateSize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Charger les classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classesRaw = await getClasses();
        const classes: Classe[] = classesRaw.map((c: any) => ({
          id: c.id,
          nom: c.nom,
          section: c.section,
          filiere: c.filiere ? { id: c.filiere.id, nom: c.filiere.nom } : { id: 0, nom: "Inconnue" },
        }));
        setClasseList(classes);
      } catch (err: any) {
        console.error("Erreur lors du chargement des classes :", err);
        toast.error("Impossible de charger les classes");
      }
    };
    fetchClasses();
  }, []);

  // Charger les filières
  useEffect(() => {
    const fetchFilieres = async () => {
      try {
        const f = await getFilieres();
        setFilieres(f);
      } catch (err: any) {
        console.error("Erreur lors du chargement des filières :", err);
        toast.error("Impossible de charger les filières");
      }
    };
    fetchFilieres();
  }, []);

  const filiereOptions = filieres.map(f => ({ value: f.id, label: f.nom }));
  const sections = Array.from(new Set(classeList.map(c => c.section))).sort();

  // Filtrage combiné (search + section + filiere)
  let filteredClasses = classeList.filter(
    (c) =>
      (c.nom.toLowerCase().includes(search.toLowerCase()) ||
        c.section.toLowerCase().includes(search.toLowerCase())) &&
      (sectionFilter === "" || c.section === sectionFilter) &&
      (filiereFilter === "" || c.filiere.nom === filiereFilter) // Filtrage par filière
  );

  // Tri par filière si demandé
  if (filiereSortAsc !== null) {
    filteredClasses.sort((a, b) =>
      filiereSortAsc
        ? a.filiere.nom.localeCompare(b.filiere.nom)
        : b.filiere.nom.localeCompare(a.filiere.nom)
    );
  }

  const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedClasses = filteredClasses.slice(startIdx, endIdx);

  // Ajouter une classe
  const handleAddClasse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFiliere) {
      toast.error("Veuillez sélectionner une filière !");
      return;
    }
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    formData.append("filiereId", selectedFiliere.value.toString());

    try {
      const newRaw = await addClasse(formData);
      const newClasse: Classe = {
        id: newRaw.id,
        nom: newRaw.nom,
        section: newRaw.section,
        filiere: newRaw.filiere
          ? { id: newRaw.filiere.id, nom: newRaw.filiere.nom }
          : { id: newRaw.filiereId, nom: selectedFiliere.label },
      };
      setClasseList([newClasse, ...classeList]);
      toast.success("Classe ajoutée avec succès !");
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      setPopupOpen(false);
      setSelectedFiliere(null);
      form.reset();
    } catch (err: any) {
      console.error("Erreur lors de l'ajout :", err);
      toast.error("Erreur lors de l'ajout : " + (err?.message || "Erreur inconnue"));
    }
  };

  // Supprimer une classe
  const handleDeleteClasse = async (id: number) => {
    const result = await Swal.fire({
      title: "Voulez-vous vraiment supprimer cette classe ?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Oui, supprimer",
      cancelButtonText: "Annuler",
      width: 400,
      padding: "1.5rem",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        await deleteClasse(id);
        setClasseList(classeList.filter((c) => c.id !== id));
        toast.success("Classe supprimée !");
      } catch (err: any) {
        console.error("Erreur lors de la suppression :", err);
        toast.error("Erreur lors de la suppression : " + (err?.message || "Erreur inconnue"));
      }
    }
  };

  const openEditPopup = (classe: Classe) => {
    setSelectedClasse(classe);
    setSelectedFiliere({ value: classe.filiere.id, label: classe.filiere.nom });
    setEditPopupOpen(true);
  };

  // Modifier une classe
  const handleUpdateClasse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClasse || !selectedFiliere) return;

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    formData.append("filiereId", selectedFiliere.value.toString());

    try {
      const updatedRaw = await updateClasse(formData);
      const updated: Classe = {
        id: updatedRaw.id,
        nom: updatedRaw.nom,
        section: updatedRaw.section,
        filiere: updatedRaw.filiere
          ? { id: updatedRaw.filiere.id, nom: updatedRaw.filiere.nom }
          : { id: updatedRaw.filiereId, nom: selectedFiliere.label },
      };
      setClasseList(classeList.map((c) => (c.id === updated.id ? updated : c)));
      toast.success("Classe mise à jour !");
      setEditPopupOpen(false);
      setSelectedFiliere(null);
    } catch (err: any) {
      console.error("Erreur lors de la mise à jour :", err);
      toast.error("Erreur lors de la mise à jour : " + (err?.message || "Erreur inconnue"));
    }
  };

  const toggleFiliereSort = () => {
    if (filiereSortAsc === null) setFiliereSortAsc(true);
    else if (filiereSortAsc === true) setFiliereSortAsc(false);
    else setFiliereSortAsc(null);
  };

  return (
    <div className="mx-8 mt-8 relative">
      {showConfetti && windowSize.width > 0 && windowSize.height > 0 && (
        <ReactConfetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={200} />
      )}

      <h1 className="text-3xl font-bold mb-6">Gestion des Classes</h1>

      {/* Recherche + filtres + ajout */}
      <div className="flex justify-between items-center mb-4 gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg px-3 py-2 gap-2 w-64">
            <LucideSearch size={20} />
            <input
              type="text"
              placeholder="Rechercher une classe..."
              className="input input-ghost w-full"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <select
            className="select select-bordered w-48"
            value={sectionFilter}
            onChange={(e) => {
              setSectionFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Toutes les sections</option>
            {sections.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            className="select select-bordered w-48"
            value={filiereFilter}
            onChange={(e) => {
              setFiliereFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Toutes les filières</option>
            {filieres.map((f) => (
              <option key={f.id} value={f.nom}>{f.nom}</option>
            ))}
          </select>
        </div>

        <button className="btn btn-primary" onClick={() => setPopupOpen(true)}>Ajouter une classe</button>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nom</th>
              <th>Section</th>
              <th className="cursor-pointer" onClick={toggleFiliereSort}>
                Filière{" "}
                {filiereSortAsc === true && <LucideChevronUp size={16} />}
                {filiereSortAsc === false && <LucideChevronDown size={16} />}
              </th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedClasses.length > 0 ? paginatedClasses.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.nom}</td>
                <td>{c.section}</td>
                <td>{c.filiere.nom}</td>
                <td className="flex justify-center gap-2">
                  <button className="btn btn-sm btn-warning flex items-center gap-1" onClick={() => openEditPopup(c)}>
                    <LucideEdit2 size={16} /> Modifier
                  </button>
                  <button className="btn btn-sm btn-error flex items-center gap-1" onClick={() => handleDeleteClasse(c.id)}>
                    <LucideTrash2 size={16} /> Supprimer
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="text-center">Aucune classe trouvée</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button className="btn btn-sm" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>Précédent</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} className={`btn btn-sm ${p === currentPage ? "btn-primary" : ""}`} onClick={() => setCurrentPage(p)}>{p}</button>
          ))}
          <button className="btn btn-sm" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Suivant</button>
        </div>
      )}

      {/* Popup Ajouter */}
      {popupOpen && (
        <dialog className="modal modal-open">
          <form className="modal-box flex flex-col gap-4" onSubmit={handleAddClasse}>
            <h3 className="font-bold text-lg">Ajouter une classe</h3>
            <input type="text" name="nom" placeholder="Nom" className="input input-bordered w-full" required />
            <input type="text" name="section" placeholder="Section" className="input input-bordered w-full" required />
            <Select
              options={filiereOptions}
              placeholder="Sélectionnez une filière"
              isSearchable
              value={selectedFiliere}
              onChange={(option) => setSelectedFiliere(option)}
            />
            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={() => setPopupOpen(false)}>Annuler</button>
              <button type="submit" className="btn btn-primary">Ajouter</button>
            </div>
          </form>
        </dialog>
      )}

      {/* Popup Modifier */}
      {editPopupOpen && selectedClasse && (
        <dialog className="modal modal-open">
          <form className="modal-box flex flex-col gap-4" onSubmit={handleUpdateClasse}>
            <h3 className="font-bold text-lg">Modifier la classe</h3>
            <input type="hidden" name="id" value={selectedClasse.id} />
            <input type="text" name="nom" defaultValue={selectedClasse.nom} className="input input-bordered w-full" required />
            <input type="text" name="section" defaultValue={selectedClasse.section} className="input input-bordered w-full" required />
            <Select
              options={filiereOptions}
              value={selectedFiliere}
              onChange={(option) => setSelectedFiliere(option)}
              isSearchable
            />
            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={() => setEditPopupOpen(false)}>Annuler</button>
              <button type="submit" className="btn btn-warning">Modifier</button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
}
