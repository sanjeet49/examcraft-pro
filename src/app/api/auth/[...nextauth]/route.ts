import NextAuth, { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            allowDangerousEmailAccountLinking: true,
            authorization: {
                params: {
                    prompt: "select_account",
                    access_type: "offline",
                    response_type: "code"
                }
            }
        }),
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Invalid credentials");
                }
                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                    include: { school: { select: { isActive: true } } }
                });
                if (!user || !user?.password) {
                    throw new Error("Invalid credentials");
                }
                if (!user.isActive) {
                    throw new Error("Your account has been revoked. Contact your administrator.");
                }
                if (user.school && user.school.isActive === false) {
                    throw new Error("Your institution's account has been suspended.");
                }
                const isCorrectPassword = await bcrypt.compare(
                    credentials.password,
                    user.password
                );
                if (!isCorrectPassword) {
                    throw new Error("Invalid credentials");
                }
                return user;
            }
        })
    ],
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async signIn({ user, account }) {
            // Allow all sign-ins — Google OAuth users will be prompted to
            // complete their profile (add role/school) via redirect logic in the app
            return true;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.isApproved = token.isApproved as boolean;
                session.user.isPremium = token.isPremium as boolean;
                session.user.credits = token.credits as number;
                session.user.schoolId = token.schoolId as string | null;
                session.user.displayId = token.displayId as string | null;
                session.user.isActive = token.isActive as boolean;
                session.user.phone = token.phone as string | null;
                session.user.image = token.picture as string | null;
                session.user.name = token.name as string | null;
            }
            return session;
        },
        async jwt({ token, user, trigger }) {
            // On initial sign-in, populate token from DB user
            if (user) {
                token.id = user.id;
                token.role = (user as any).role || "TEACHER";
                token.isApproved = (user as any).isApproved || false;
                // Wait to pull from school or force OWNER overrides during refresh
                token.isPremium = false;
                token.credits = 0;
                token.schoolId = (user as any).schoolId || null;
                token.displayId = (user as any).displayId || null;
                token.isActive = (user as any).isActive ?? true;
                token.phone = (user as any).phone || null;
                token.picture = (user as any).image || null;
                token.name = (user as any).name || null;
            }

            // On token refresh (e.g. after profile completion or approval),
            // re-fetch from DB so changes are reflected without logout
            if (trigger === "update" || (!user && token.id)) {
                try {
                    const freshUser = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        select: {
                            role: true,
                            isApproved: true,
                            isPremium: true,
                            credits: true,
                            schoolId: true,
                            displayId: true,
                            isActive: true,
                            phone: true,
                            image: true,
                            name: true,
                            school: { select: { isActive: true, isPremium: true, credits: true } }
                        }
                    });
                    if (freshUser) {
                        token.role = freshUser.role;
                        token.isApproved = freshUser.isApproved;
                        token.schoolId = freshUser.schoolId;
                        token.displayId = freshUser.displayId;
                        token.phone = freshUser.phone;
                        token.picture = freshUser.image;
                        token.name = freshUser.name;
                        
                        if (freshUser.role === "OWNER") {
                            token.isPremium = true;
                            token.credits = 999999;
                            token.isActive = freshUser.isActive;
                        } else if (freshUser.school) {
                            token.isPremium = freshUser.school.isPremium;
                            token.credits = freshUser.school.credits;
                            
                            // If the school is suspended, the user becomes effectively inactive
                            if (freshUser.school.isActive === false) {
                                token.isActive = false;
                            } else {
                                token.isActive = freshUser.isActive;
                            }
                        } else {
                            token.isPremium = false;
                            token.credits = 0;
                            token.isActive = freshUser.isActive;
                        }
                    }
                } catch {
                    // DB unavailable — keep existing token values
                }
            }

            return token;
        }
    }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
