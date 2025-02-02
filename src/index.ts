/**
 * This code is from csfloat and ByMykel repo. I made small changes to TS.
 * https://github.com/ByMykel/counter-strike-image-tracker/blob/main/index.js
 * https://github.com/csfloat/cs-files/blob/5ff0f212ff0dc2b6f6380fc6d1a93121c2b9c2cd/index.js
 */

import SteamUser from "steam-user";
import fs from "fs";
import vpk from "vpk";
import { promisify } from "util";

const delay = promisify(setTimeout);

interface CustomSteamUser extends SteamUser {
    downloadFile(appId: number, depotId: number, file: any, filePath: string): Promise<void>;
    getManifest(appId: number, depotId: number, manifestId: string, access: string): Promise<any>;
}

const appId: number = 730; 
const depotId: number = 2347770;
const dir: string = "./public/static";
const temp: string = "./temp";
const manifestIdFile: string = `${dir}/manifestId.txt`;

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

// Downloads the main VPK directory file
async function downloadVPKDir(user: CustomSteamUser, manifest: any): Promise<vpk | null> {
    const dirFile = manifest.manifest.files.find((file: any) =>
        file.filename.endsWith("csgo\\pak01_dir.vpk")
    );

    console.log("Downloading vpk dir...");

    try {
        await user.downloadFile(appId, depotId, dirFile, `${temp}/pak01_dir.vpk`);
        console.log("✅ Successfully downloaded pak01_dir.vpk");
    } catch (error) {
        console.error(`❌ Failed to download pak01_dir.vpk: ${error}`);
        return null;
    }

    const vpkDir = new vpk(`${temp}/pak01_dir.vpk`);
    vpkDir.load();
    return vpkDir;
}

function getRequiredVPKFiles(vpkDir: any): number[] {
    const requiredIndices: number[] = [];

    for (const fileName of vpkDir.files) {
        for (const folder of vpkFolders) {
            if (fileName.startsWith(folder)) {
               // console.log(`Found vpk for ${folder}: ${fileName}`);

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

async function downloadVPKArchives(user: CustomSteamUser, manifest: any, vpkDir: any) {
    if (!vpkDir) {
        console.error("⚠️ Skipping VPK archive downloads due to previous failure.");
        return;
    }

    const requiredIndices = getRequiredVPKFiles(vpkDir);
    // console.log(`Required VPK files: ${requiredIndices}`);

    for (let i = 0; i < requiredIndices.length; i++) {
        const archiveIndex = requiredIndices[i];

        // Pad index with zeros (e.g., 001, 002)
        const paddedIndex = archiveIndex.toString().padStart(3, '0'); 
        const fileName = `pak01_${paddedIndex}.vpk`;

        const file = manifest.manifest.files.find((f: any) =>
            f.filename.endsWith(fileName)
        );
        const filePath = `${temp}/${fileName}`;

        const status = `[${i + 1}/${requiredIndices.length}]`;

        console.log(`${status} Downloading ${fileName}`);

        try {
            await user.downloadFile(appId, depotId, file, filePath);
            console.log(`✅ Successfully downloaded ${fileName}`);
        } catch (error) {
            console.error(`❌ Failed to download ${fileName}: ${error}`);
        }

        // Add a delay of 3 seconds between downloads to avoid rate limiting
        await delay(3000);
    }
}

if (process.argv.length !== 4) {
    console.error(`Missing input arguments, expected 4 got ${process.argv.length}`);
    process.exit(1);
}

const directories = [dir, temp];

directories.forEach(directory => {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory);
    }
});

const user = new SteamUser() as CustomSteamUser;

console.log("Logging into Steam...");

user.logOn({
    accountName: process.argv[2],
    password: process.argv[3],
    logonID: 2121,
});

user.once("loggedOn", async () => {
    try {
        const cs = (await user.getProductInfo([appId], [], true)).apps[appId].appinfo;
        const commonDepot = cs.depots[depotId];
        const latestManifestId = commonDepot.manifests.public.gid;

        console.log(`📦 Obtained latest manifest ID: ${latestManifestId}`);

        let existingManifestId = "";

        try {
            existingManifestId = fs.readFileSync(manifestIdFile, 'utf8');
        } catch (err: unknown) {
            const error = err as NodeJS.ErrnoException;
            if (error.code === "ENOENT") {
                console.log("Manifest file not found, it will be created.");
            } else {
                throw error;
            }
        }

        if (existingManifestId === latestManifestId) {
            console.log("⚠️ Latest manifest ID matches existing manifest ID, exiting.");
            process.exit(0);
        }

        console.log("🔄 Manifest ID changed, downloading new files...");

        const manifest = await user.getManifest(appId, depotId, latestManifestId, "public");

        const vpkDir = await downloadVPKDir(user, manifest);

        await downloadVPKArchives(user, manifest, vpkDir);

        try {
            fs.writeFileSync(manifestIdFile, latestManifestId);
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