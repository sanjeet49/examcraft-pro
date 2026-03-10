import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: string;
            isApproved: boolean;
            isPremium: boolean;
            credits: number;
        } & DefaultSession["user"];
    }

    interface User {
        role: string;
        isApproved: boolean;
        isPremium: boolean;
        credits: number;
    }
}
