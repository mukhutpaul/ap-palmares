"use client";

import AnnouncementEditor from "@/app/components/Editeur";
import LectureAn from "@/app/components/ListAnnonces";
import { User } from "lucide-react";
import { useSession } from "next-auth/react";

function Page() {
  const { data: session } = useSession();

  return (
    <div className="py-4 px-4 lg:mx-[10%]">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar / Profil */}
        <div className="w-full lg:w-1/4">
          <div className="w-full h-auto py-3 px-3 rounded-sm shadow-md">
            <div className="flex items-center justify-between">
              <User className="w-10 h-10 text-accent" />
              <div className="badge badge-success">
                {session?.user?.name}
              </div>
            </div>

            <div className="flex flex-col gap-1 mt-2 text-sm break-words">
              <span>{session?.user?.email}</span>
              <div className="badge badge-info w-fit">
                Rôle : {session?.user?.role}
              </div>
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="w-full lg:w-3/4">
          {/* <LectureAn /> */}
          {session?.user?.id && (
            <AnnouncementEditor userId={session.user.id} />
          )}
        </div>
      </div>
    </div>
  );
}

export default Page;
