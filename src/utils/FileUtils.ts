import fs from "fs";

export class FileUtils {
    static createDirectories(directories: string[]) {
        directories.forEach(directory => {
            if (!fs.existsSync(directory)) {
                fs.mkdirSync(directory);
            }
        });
    }
}