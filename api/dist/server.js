import "dotenv/config";
import cors from "cors";
import express, { Router } from "express";
import { fileURLToPath } from "node:url";
import { HttpError } from "./core/http-error.js";
import { requireAuthentication } from "./core/auth.js";
import { registerAuthPostRoutes } from "./resource/auth/post.js";
import { registerActivityDeleteRoutes } from "./resource/activities/delete.js";
import { registerActivityGetRoutes } from "./resource/activities/get.js";
import { registerActivityPostRoutes } from "./resource/activities/post.js";
import { registerActivityPutRoutes } from "./resource/activities/put.js";
import { registerSettingsGetRoutes } from "./resource/settings/get.js";
import { registerSettingsPutRoutes } from "./resource/settings/put.js";
import { registerWeightDeleteRoutes } from "./resource/weights/delete.js";
import { registerWeightGetRoutes } from "./resource/weights/get.js";
import { registerWeightPostRoutes } from "./resource/weights/post.js";
import { registerWeightPutRoutes } from "./resource/weights/put.js";
import { registerFriendGetRoutes } from "./resource/friends/get.js";
import { registerFriendPostRoutes } from "./resource/friends/post.js";
import { registerFriendDeleteRoutes } from "./resource/friends/delete.js";
import { registerFriendPutRoutes } from "./resource/friends/put.js";
import { registerFriendActivityGetRoutes } from "./resource/friend-activities/get.js";
import { registerFriendActivityPostRoutes } from "./resource/friend-activities/post.js";
import { registerFriendActivityDeleteRoutes } from "./resource/friend-activities/delete.js";
import { database } from "./core/database.js";
import { registerAdminUserGetRoutes } from "./resource/admin-users/get.js";
import { registerAdminUserPutRoutes } from "./resource/admin-users/put.js";
import { registerAdminUserDeleteRoutes } from "./resource/admin-users/delete.js";
import { registerBackupGetRoutes } from "./resource/backup/get.js";
import { registerBackupPostRoutes } from "./resource/backup/post.js";
import { registerAccountPutRoutes } from "./resource/account/put.js";
import { registerAdminActivityGetRoutes } from "./resource/admin-activities/get.js";
import { registerAdminEmailPostRoutes } from "./resource/admin-emails/post.js";
const app = express();
const router = Router();
const port = Number(process.env["PORT"] ?? 3000);
app.use(cors({ allowedHeaders: ["Content-Type", "Authorization"] }));
app.use(express.json({ limit: "1mb" }));
app.get("/openapi.yaml", (_request, response) => {
    response
        .type("application/yaml")
        .sendFile(fileURLToPath(new URL("./openapi.yaml", import.meta.url)));
});
registerAuthPostRoutes(router);
router.use(requireAuthentication);
registerAdminActivityGetRoutes(router);
registerAdminEmailPostRoutes(router);
registerAdminUserGetRoutes(router);
registerAdminUserPutRoutes(router);
registerAdminUserDeleteRoutes(router);
registerBackupGetRoutes(router);
registerBackupPostRoutes(router);
registerAccountPutRoutes(router);
registerFriendGetRoutes(router);
registerFriendPostRoutes(router);
registerFriendDeleteRoutes(router);
registerFriendPutRoutes(router);
registerFriendActivityGetRoutes(router);
registerFriendActivityPostRoutes(router);
registerFriendActivityDeleteRoutes(router);
registerSettingsGetRoutes(router);
registerSettingsPutRoutes(router);
registerActivityGetRoutes(router);
registerActivityPostRoutes(router);
registerActivityPutRoutes(router);
registerActivityDeleteRoutes(router);
registerWeightGetRoutes(router);
registerWeightPostRoutes(router);
registerWeightPutRoutes(router);
registerWeightDeleteRoutes(router);
app.get("/health", async (_request, response, next) => {
    try {
        await database.query("SELECT 1");
        response.json({ status: "ok", database: "available" });
    }
    catch (error) {
        next(error);
    }
});
app.use("/api", router);
app.use((_request, response) => response.status(404).json({ error: "Endpoint not found" }));
const errorHandler = (error, _request, response, _next) => {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unexpected server error";
    const code = error instanceof HttpError ? error.code : undefined;
    response
        .status(status)
        .json(code ? { error: message, code } : { error: message });
};
app.use(errorHandler);
async function start() {
    await database.query("SELECT 1");
    app.listen(port, () => {
        console.log(`My Hike API listening on http://localhost:${port}`);
    });
}
start().catch((error) => {
    console.error("Unable to connect to MariaDB", error);
    process.exitCode = 1;
});
