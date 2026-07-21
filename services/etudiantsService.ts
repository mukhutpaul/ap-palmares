export type Student = {
    id: number;
    matricule: string;
    nom: string;
    postnom: string;
    prenom: string;
    genre: "M" | "F";
    telephone: string;
    adresse: string;
    nationalite: string;
    avatar: string | null;
    filiere: string;
    session: string;
    vacation: string;
};


export type EtudiantsResponse = {
    success: boolean;
    session: {
        id: number;
        code: string;
        libelle: string;
    };
    nombre: number;
    etudiants: Student[];
};


const API_URL = process.env.NEXT_PUBLIC_API_URL;


export async function getEtudiants(): Promise<EtudiantsResponse> {
    if (!API_URL) {
        throw new Error(
            "NEXT_PUBLIC_API_URL n'est pas configuré"
        );
    }

    const response = await fetch(
        `${API_URL}/base/api/etudiants/session-active/`,
        {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
            cache: "no-store",
        }
    );

    if (!response.ok) {
        throw new Error(
            `Erreur API étudiants : ${response.status}`
        );
    }

    const data: EtudiantsResponse = await response.json();

    if (!data.success) {
        throw new Error(
            "Aucune session active trouvée"
        );
    }

    return data;
}