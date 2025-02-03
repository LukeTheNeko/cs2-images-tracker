import { promisify } from "util";
import vpk from "vpk";
import { CustomSteamUser } from "../models/SteamUserModel";

const delay = promisify(setTimeout);

export class VPKDowloaderService {
    private appId: number = 730;
    private depotId: number = 2347770;
    private temp: string = "./temp";

    constructor(private user: CustomSteamUser) {}

    async downloadVPKDir(manifest: any): Promise<vpk | null> {
        const dirFile = manifest.manifest.files.find((file: any) =>
            file.filename.endsWith("csgo\\pak01_dir.vpk")
        );

        console.log("⏬ Downloading vpk dir...");

        try {
            await this.user.downloadFile(this.appId, this.depotId, dirFile, `${this.temp}/pak01_dir.vpk`);
            console.log("✅ Successfully downloaded pak01_dir.vpk");
        } catch (error) {
            console.error(`❌ Failed to download pak01_dir.vpk: ${error}`);
            return null;
        }

        const vpkDir = new vpk(`${this.temp}/pak01_dir.vpk`);
        vpkDir.load();
        return vpkDir;
    }

    getRequiredVPKFiles(vpkDir: any): number[] {
        const requiredIndices: number[] = [];
        const vpkFolders: string[] = [
            "panorama/images/econ/characters",
            "panorama/images/econ/default_generated",
            "panorama/images/econ/music_kits",
            "panorama/images/econ/patches",
            "panorama/images/econ/season_icons",
            "panorama/images/econ/set_icons",
            "panorama/images/econ/status_icons",
            "panorama/images/econ/stickers",
            "panorama/images/econ/tools",
            "panorama/images/econ/weapons",
            "panorama/images/econ/weapon_cases",
            "panorama/images/econ/tournaments",
            "panorama/images/econ/premier_seasons",
        ];

        for (const fileName of vpkDir.files) {
            for (const folder of vpkFolders) {
                if (fileName.startsWith(folder)) {
                    const archiveIndex = vpkDir.tree[fileName].archiveIndex;

                    if (!requiredIndices.includes(archiveIndex)) {
                        requiredIndices.push(archiveIndex);
                    }

                    break;
                }
            }
        }

        return requiredIndices.sort((a, b) => a - b);
    }

    async downloadVPKArchives(manifest: any, vpkDir: any) {
        if (!vpkDir) {
            console.error("⚠️ Skipping VPK archive downloads due to previous failure.");
            return;
        }

        const requiredIndices = this.getRequiredVPKFiles(vpkDir);

        for (let i = 0; i < requiredIndices.length; i++) {
            const archiveIndex = requiredIndices[i];
            const paddedIndex = archiveIndex.toString().padStart(3, '0'); 
            const fileName = `pak01_${paddedIndex}.vpk`;

            const file = manifest.manifest.files.find((f: any) =>
                f.filename.endsWith(fileName)
            );
            const filePath = `${this.temp}/${fileName}`;

            const status = `[${i + 1}/${requiredIndices.length}]`;

            console.log(`${status} Downloading ${fileName}`);

            try {
                await this.user.downloadFile(this.appId, this.depotId, file, filePath);
                console.log(`✅ Successfully downloaded ${fileName}`);
            } catch (error) {
                console.error(`❌ Failed to download ${fileName}: ${error}`);
            }

            await delay(3000);
        }
    }
}