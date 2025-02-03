// src/services/SteamService.ts
import { CustomSteamUser } from "../models/SteamUserModel";
import { VPKDowloaderService } from "./VPKDowloaderService";
import fs from "fs";

export class SteamService {
    private appId: number = 730;
    private depotId: number = 2347770;
    private dir: string = "./public/static";
    private manifestIdFile: string = `${this.dir}/manifestId.txt`;

    constructor(private user: CustomSteamUser, private vpkDownloader: VPKDowloaderService) {}

    async login(accountName: string, password: string) {
        console.log("🔑 Logging into Steam...");

        this.user.logOn({
            accountName,
            password,
            logonID: 2121,
        });

        this.user.once("loggedOn", async () => {
            try {
                const cs = (await this.user.getProductInfo([this.appId], [], true)).apps[this.appId].appinfo;
                const commonDepot = cs.depots[this.depotId];
                const latestManifestId = commonDepot.manifests.public.gid;

                console.log(`📦 Obtained latest manifest ID: ${latestManifestId}`);

                let existingManifestId = "";

                try {
                    existingManifestId = fs.readFileSync(this.manifestIdFile, 'utf8');
                } catch (err: unknown) {
                    const error = err as NodeJS.ErrnoException;
                    if (error.code === "ENOENT") {
                        console.log("Manifest file not found, it will be created.");
                    } else {
                        throw error;
                    }
                }

                if (existingManifestId == latestManifestId) {
                    console.log("⚠️ Latest manifest ID matches existing manifest ID, exiting.");
                    process.exit(0);
                }

                console.log("🔄 Manifest ID changed, downloading new files...");

                const manifest = await this.user.getManifest(this.appId, this.depotId, latestManifestId, "public");

                const vpkDir = await this.vpkDownloader.downloadVPKDir(manifest);

                await this.vpkDownloader.downloadVPKArchives(manifest, vpkDir);

                try {
                    fs.writeFileSync(this.manifestIdFile, latestManifestId);
                    console.log("✅ Updated manifest ID file.");
                } catch (error) {
                    console.error(`❌ Failed to write manifest ID file: ${error}`);
                }

                console.log("🎉 Done!");
                process.exit(0);
            } catch (error) {
                console.error(`❌ An error occurred: ${error}`);
                process.exit(1);
            }
        });
    }
}