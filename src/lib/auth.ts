import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./firebaseAdmin";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                try {
                    console.log("Starting authorization for:", credentials?.email);
                    if (!credentials?.email || !credentials?.password) {
                        console.warn("Invalid credentials provided");
                        throw new Error("Invalid credentials");
                    }

                    const usersRef = db.collection("users");
                    const snapshot = await usersRef.where("email", "==", credentials.email).limit(1).get();

                    if (snapshot.empty) {
                        console.warn("User not found:", credentials.email);
                        throw new Error("User not found");
                    }

                    const userDoc = snapshot.docs[0];
                    const user = userDoc.data();

                    const isPasswordValid = await bcrypt.compare(
                        credentials.password,
                        user.password
                    );

                    if (!isPasswordValid) {
                        console.warn("Invalid password for:", credentials.email);
                        throw new Error("Invalid password");
                    }

                    console.log("Authorization successful for:", credentials.email);
                    return {
                        id: userDoc.id,
                        email: user.email,
                        name: user.name,
                        role: user.role as "ADMIN" | "STAFF",
                    };
                } catch (error) {
                    console.error("Auth process error:", error);
                    throw error;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
};
