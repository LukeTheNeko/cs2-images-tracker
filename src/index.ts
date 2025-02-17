/**
 * This code is from csfloat and ByMykel repo. I made small changes to TS.
 * https://github.com/ByMykel/counter-strike-image-tracker
 * https://github.com/csfloat/cs-files/blob/5ff0f212ff0dc2b6f6380fc6d1a93121c2b9c2cd/index.js
*/

import SteamUser from "steam-user";
import { CustomSteamUser } from "./models/SteamUserModel";
import { SteamService } from "./services/SteamService";
import { VPKDowloaderService } from "./services/VPKDowloaderService";
import { FileUtils } from "./utils/FileUtils";

if (process.argv.length !== 4) {
    console.error(`⚠️ Missing input arguments, expected 4 got ${process.argv.length}`);
    process.exit(1);
}

const directories = ["./public/static", "./temp"];
FileUtils.createDirectories(directories);

const user = new SteamUser() as CustomSteamUser;
const vpkDownloader = new VPKDowloaderService(user);
const steamService = new SteamService(user, vpkDownloader);

steamService.login(process.argv[2], process.argv[3]);