"use client";

import { SessionProvider } from "next-auth/react";
import { ToastContainer } from "react-toastify";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>
    {children}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="colored"
      />

</SessionProvider>;
}
