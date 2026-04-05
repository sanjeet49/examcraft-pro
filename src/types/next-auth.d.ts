import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: string;
            isApproved: boolean;
            isPremium: boolean;
            credits: number;
            schoolId: string | null;
            displayId: string | null;
            isActive: boolean;
            phone?: string | null;
            image?: string | null;
            name?: string | null;
        } & DefaultSession["user"];
    }

    interface User {
        role: string;
        isApproved: boolean;
        isPremium: boolean;
        credits: number;
        schoolId?: string | null;
        displayId?: string | null;
        isActive?: boolean;
        phone?: string | null;
        image?: string | null;
        name?: string | null;
    }
}
