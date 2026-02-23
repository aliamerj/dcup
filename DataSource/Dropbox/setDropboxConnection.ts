import { databaseDrizzle } from "@/db";
import { eq } from "drizzle-orm";
import { connectionConfig } from "../utils";
import { connections } from "@/db/schema";

export const setDropboxConnection = async (formData: FormData) => {
  const config = connectionConfig.safeParse({
    connectionId: formData.get("connectionId"),
    identifier: formData.get("identifier"),
    folderName: formData.get("folderName"),
    folderId: formData.get("folderId"),
    metadata: formData.get("metadata"),
    pageLimit: formData.get("pageLimit"),
    fileLimit: formData.get("fileLimit"),
  })

  if (!config.success) {
    throw new Error(`Validation errors - ${config.error.message}`)
  }

  await databaseDrizzle.update(connections).set({
    identifier: config.data.identifier,
    folderName: config.data.folderName,
    connectionMetadata: config.data.folderId ? {
      folderId: config.data.folderId,
    } : undefined,
    metadata: config.data.metadata,
    isConfigSet: true,
    limitFiles: config.data.fileLimit,
    limitPages: config.data.pageLimit,
  }).where(eq(connections.id, config.data.connectionId))

  return {
    connectionId: config.data.connectionId,
    service: "DROPBOX",
    pageLimit: config.data.pageLimit,
    fileLimit: config.data.fileLimit,
    metadata: config.data.metadata,
    files: [],
    links: [],
    texts: [],
  }
}
