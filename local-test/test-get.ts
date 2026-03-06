import { Daytona } from "@daytonaio/sdk";
import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config();

async function main() {
    const daytona = new Daytona({
        apiKey: process.env.DAYTONA_API_KEY,
        serverUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api"
    });

    const sandboxId = fs.readFileSync("sandbox-id.txt", "utf-8").trim();
    console.log("Getting sandbox...", sandboxId);
    
    const sandbox = await daytona.get(sandboxId);
    console.log("Sandbox state:", sandbox.state);
    
    if (sandbox.state !== "started") {
        console.log("Starting sandbox...");
        await sandbox.start();
    }
    
    console.log("Waiting until started...");
    await sandbox.waitUntilStarted(120);

    console.log("Executing...");
    const res = await sandbox.process.executeCommand("echo 'hello'");
    console.log(res);
}

main().catch(console.error);