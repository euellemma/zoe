import { Daytona } from "@daytonaio/sdk";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
    const daytona = new Daytona({
        apiKey: process.env.DAYTONA_API_KEY,
        serverUrl: process.env.DAYTONA_API_URL || "https://app.daytona.io/api"
    });

    console.log("Creating...");
    const sandbox = await daytona.create({
        image: "daytonaio/workspace-project:latest",
    });
    console.log("Created:", sandbox.id, sandbox.state);
    
    console.log("Waiting until started...");
    await sandbox.waitUntilStarted(120);
    console.log("Started! State:", sandbox.state);

    console.log("Executing...");
    const res = await sandbox.process.executeCommand("echo 'hello'");
    console.log(res);

    await daytona.remove(sandbox.id);
}

main().catch(console.error);