"use client";

import { useState, useEffect } from "react";
import { getUsers, createUser, deleteUser, updateUser } from "@/app/actions/userActions";
import Confetti from "react-confetti";
import Swal from "sweetalert2"; // ← SweetAlert2
import { Edit, Trash2, Plus } from "lucide-react";

type Role = "ADMIN" | "ENSEIGNANT" | "USER";

type UserItem = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  createdAt: string;
};

const PAGE_SIZE = 5;

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [search, setSearch] = useState("");
  const [popupOpen, setPopupOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "USER" as Role });
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const data = await getUsers();
    setUsers(data);
    setLoading(false);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const paginatedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);

  const openPopup = (user?: UserItem) => {
    if (user) {
      setEditingUser(user);
      setForm({ name: user.name ?? "", email: user.email, password: "", role: user.role });
    } else {
      setEditingUser(null);
      setForm({ name: "", email: "", password: "", role: "USER" });
    }
    setPopupOpen(true);
  };

  const handleSave = async () => {
    if (!form.email || (!editingUser && !form.password)) {
      alert("Email et mot de passe requis !"); // garde le toast ou alert simple
      return;
    }

    try {
      if (editingUser) {
        await updateUser(editingUser.id, { name: form.name, email: form.email, role: form.role });
        setUsers((prev) =>
          prev.map((u) => (u.id === editingUser.id ? { ...u, name: form.name, email: form.email, role: form.role } : u))
        );
        alert("Utilisateur modifié !");
      } else {
        const created = await createUser(form);
        setUsers((prev) => [created, ...prev]);
        setShowConfetti(true);
        alert("Utilisateur créé !");
        setTimeout(() => setShowConfetti(false), 5000);
      }
      setPopupOpen(false);
    } catch (err) {
      alert("Erreur lors de l'enregistrement");
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Supprimer cet utilisateur ?",
      text: "Cette action est irréversible.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Oui, supprimer",
      cancelButtonText: "Annuler",
    });

    if (result.isConfirmed) {
      await deleteUser(id);
      setUsers(users.filter((u) => u.id !== id));
      Swal.fire("Supprimé !", "Utilisateur supprimé", "success");
    }
  };

  return (
    <div className="mx-[5%] py-8 space-y-6">
      {showConfetti && <Confetti recycle={false} numberOfPieces={300} />}

      <h1 className="text-3xl font-bold mb-4">Gestion des utilisateurs</h1>

      {/* Recherche + Nouveau */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <input
          type="text"
          placeholder="Rechercher un utilisateur..."
          className="input input-bordered w-full md:w-1/2"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          autoComplete="off"
        />

        <button className="btn btn-primary flex items-center gap-2" onClick={() => openPopup()}>
          <Plus size={18} /> Nouvel utilisateur
        </button>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Créé le</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-4">
                  Chargement...
                </td>
              </tr>
            ) : paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-4">
                  Aucun utilisateur trouvé
                </td>
              </tr>
            ) : (
              paginatedUsers.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="flex gap-2">
                    <button className="btn btn-xs btn-info btn-square" onClick={() => openPopup(u)} title="Modifier">
                      <Edit size={16} />
                    </button>
                    <button className="btn btn-xs btn-error btn-square" onClick={() => handleDelete(u.id)} title="Supprimer">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-4 gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              className={`btn btn-sm ${page === i + 1 ? "btn-primary" : "btn-outline"}`}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Popup DaisyUI */}
      <input type="checkbox" id="user-popup" className="modal-toggle" checked={popupOpen} readOnly />
      <div className="modal">
        <div className="modal-box relative">
          <label htmlFor="user-popup" className="btn btn-sm btn-circle absolute right-2 top-2" onClick={() => setPopupOpen(false)}>
            ✕
          </label>
          <h3 className="text-lg font-bold mb-4">{editingUser ? "Modifier utilisateur" : "Créer utilisateur"}</h3>
          <div className="grid grid-cols-1 gap-2">
            <input type="text" placeholder="Nom" className="input input-bordered w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input type="email" placeholder="Email" className="input input-bordered w-full" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            {!editingUser && (
              <input type="password" placeholder="Mot de passe" className="input input-bordered w-full" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            )}
            <select className="select select-bordered w-full" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="USER">USER</option>
              <option value="ENSEIGNANT">ENSEIGNANT</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <div className="modal-action">
            <button className="btn btn-primary" onClick={handleSave}>
              {editingUser ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
