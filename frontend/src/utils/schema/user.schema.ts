export type User = {
    email: string;
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}