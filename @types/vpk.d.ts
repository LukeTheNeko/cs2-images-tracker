declare module "vpk" {
    class vpk {
        constructor(filePath: string);
        load(): void;
        getFile(filename: string): Buffer;
        tree: Record<string, any>;
        files: string[];
    }
    export default vpk;
}