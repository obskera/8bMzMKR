const { execFileSync } = require("node:child_process");
const { join } = require("node:path");

exports.default = async function afterPack(context) {
    if (context.electronPlatformName !== "darwin") {
        return;
    }

    const appPath = join(
        context.appOutDir,
        `${context.packager.appInfo.productFilename}.app`,
    );

    console.log(`Clearing extended attributes from ${appPath}`);
    execFileSync("xattr", ["-cr", appPath], { stdio: "inherit" });
};
