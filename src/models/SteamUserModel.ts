import SteamUser from "steam-user";

export interface CustomSteamUser extends SteamUser {
    downloadFile(appId: number, depotId: number, file: any, filePath: string): Promise<void>;
    getManifest(appId: number, depotId: number, manifestId: string, access: string): Promise<any>;
}