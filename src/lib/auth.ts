import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import db from "./db";
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
                    // Diagnostic logging for Vercel
                    if (!process.env.NEXTAUTH_SECRET) console.error("CRITICAL: NEXTAUTH_SECRET is not set in environment");
                    if (!process.env.MYSQL_HOST) console.error("CRITICAL: MYSQL_HOST is not set in environment");

                    console.log("Starting authorization for:", credentials?.email);
                    if (!credentials?.email || !credentials?.password) {
                        console.warn("Invalid credentials provided");
                        throw new Error("Invalid credentials");
                    }

                    const email = credentials.email;
                    const [rows]: any = await db.execute(
                        "SELECT id, name, email, password, role FROM users WHERE email = ? LIMIT 1",
                        [email]
                    );

                    if (!rows || rows.length === 0) {
                        console.warn("User not found:", email);
                        throw new Error("User not found");
                    }

                    const user = rows[0];

                    const isPasswordValid = await bcrypt.compare(
                        credentials.password,
                        user.password
                    );

                    if (!isPasswordValid) {
                        console.warn("Invalid password for:", email);
                        throw new Error("Invalid password");
                    }

                    console.log("Authorization successful for:", email);
                    return {
                        id: user.id || user.id, // Support both if id is in data or just id
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
