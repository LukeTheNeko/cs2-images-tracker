import SteamUser from "steam-user";
import fs from "fs";
import vpk from "vpk";

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
];

async function downloadVPKDir(user: CustomSteamUser, manifest: any): Promise<vpk> {
    const dirFile = manifest.manifest.files.find((file: any) =>
        file.filename.endsWith("csgo\\pak01_dir.vpk")
    );

    console.log("Downloading vpk dir");
    await user.downloadFile(appId, depotId, dirFile, `${temp}/pak01_dir.vpk`);

    const vpkDir = new vpk(`${temp}/pak01_dir.vpk`);
    vpkDir.load();
    return vpkDir;
}

function getRequiredVPKFiles(vpkDir: any): number[] {
    const requiredIndices: number[] = [];

    for (const fileName of vpkDir.files) {
        for (const folder of vpkFolders) {
            if (fileName.startsWith(folder)) {
                console.log(`Found vpk for ${folder}: ${fileName}`);

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
    const requiredIndices = getRequiredVPKFiles(vpkDir);

    console.log(`Required VPK files ${requiredIndices}`);

    for (const index of requiredIndices) {
        const paddedIndex = index.toString().padStart(3, '0');
        const fileName = `pak01_${paddedIndex}.vpk`;

        const file = manifest.manifest.files.find((f: any) =>
            f.filename.endsWith(fileName)
        );
        const filePath = `${temp}/${fileName}`;

        const status = `[${requiredIndices.indexOf(index) + 1}/${requiredIndices.length}]`;

        console.log(`${status} Downloading ${fileName}`);

        await user.downloadFile(appId, depotId, file, filePath);
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
    const cs = (await user.getProductInfo([appId], [], true)).apps[appId].appinfo;
    const commonDepot = cs.depots[depotId];
    const latestManifestId = commonDepot.manifests.public.gid;

    console.log(`Obtained latest manifest ID: ${latestManifestId}`);

    let existingManifestId = "";

    interface NodeJSError extends Error {
        code?: string;
    }
    
    try {
        existingManifestId = fs.readFileSync(manifestIdFile, 'utf8');
    } catch (err: unknown) {
        const error = err as NodeJSError;
        if (error.code === "ENOENT") {
            console.log("Manifest file not found, it will be created.");
        } else {
            throw error;
        }
    }

    if (existingManifestId === latestManifestId) {
        console.log("Latest manifest Id matches existing manifest Id, exiting");
        process.exit(0);
    }

    console.log("Latest manifest Id does not match existing manifest Id, downloading game files");

    const manifest = await user.getManifest(appId, depotId, latestManifestId, "public");

    const vpkDir = await downloadVPKDir(user, manifest);
    await downloadVPKArchives(user, manifest, vpkDir);

    try {
        fs.writeFileSync(manifestIdFile, latestManifestId);
    } catch (error) {
        throw error;
    }

    process.exit(0);
});
