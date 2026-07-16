export interface AuthSession {
    username: string;
}
export declare function validateCredentials(username: string, password: string): boolean;
export declare function getSession(): AuthSession | null;
export declare function setSession(username: string): void;
export declare function clearSession(): void;
