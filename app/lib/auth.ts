// import NextAuth from "next-auth";
// import Credentials from "next-auth/providers/credentials";
// import { PrismaClient } from "@prisma/client";
// import bcrypt from "bcryptjs";

// const prisma = new PrismaClient();

// export const { handlers, auth, signIn, signOut } = NextAuth({
//     providers: [
//         Credentials({
//             name: "Credentials",
//             credentials: {
//                 email: { label: "Email", type: "email" },
//                 password: { label: "Password", type: "password" },
//             },
//             async authorize(credentials) {
//                 const { email, password } = credentials as {
//                     email?: string;
//                     password?: string;
//                 };

//                 if (!email || !password) {
//                     throw new Error("Veuillez remplir tous les champs");
//                 }

//                 const user = await prisma.user.findUnique({
//                     where: { email },
//                 });

//                 if (!user) {
//                     throw new Error("Utilisateur introuvable");
//                 }

//                 const isValid = await bcrypt.compare(password, user.password);

//                 if (!isValid) {
//                     throw new Error("Mot de passe incorrect");
//                 }

//                 return {
//                     id: user.id,
//                     email: user.email,
//                     name: user.name,
//                     role: user.role,
//                 };
//             }

//         }),
//     ],

//     callbacks: {
//         async jwt({ token, user }) {
//             if (user) {
//                 token.id = user.id;
//                 token.role = user.role;
//             }
//             return token;
//         },


//         async session({ session, token }) {
//             if (session.user) {
//                 session.user.id = token.id as string;
//                 session.user.role = token.role as "ADMIN" | "USER";
//             }
//             return session;
//         }

//     },

// });


import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { email, password } = credentials as {
          email?: string;
          password?: string;
        };

        if (!email || !password) {
          throw new Error("Veuillez remplir tous les champs");
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          throw new Error("Utilisateur introuvable");
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
          throw new Error("Mot de passe incorrect");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "USER" | "ENSIGNANT";
      }
      return session;
    },
  },

  session: {
    strategy: "jwt",
  },

  // Permet de voir les logs en développement
  debug: process.env.NODE_ENV === "development",

  // ⚠️ Correction pour UntrustedHost (NextAuth v5)
  // NextAuth prend automatiquement NEXTAUTH_URL et NEXTAUTH_TRUST_HOSTS
  // définis dans ton .env.local
});
