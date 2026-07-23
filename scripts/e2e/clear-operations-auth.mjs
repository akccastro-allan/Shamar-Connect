import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const storageStatePath = resolve(".auth/operations.json");

await rm(storageStatePath, { force: true });
console.log("Storage state local removido: .auth/operations.json");
