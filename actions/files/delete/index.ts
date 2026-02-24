"use server"
import { databaseDrizzle } from "@/db";
import { tryAndCatch } from "@/lib/try-catch";
import { fromErrorToFormState, toFormState } from "@/lib/zodErrorHandle";
import { qdrant_collection_name, qdrantClient } from "@/qdrant";
import { auth } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { headers } from "next/headers";
import { files } from "@/db/schema";

const deleteFilesSchema = z.object({
  id: z.string().min(2),
});

type FormState = {
  message: string;
};

export async function deleteFilesAction(_: FormState, formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  try {
    if (!session?.user?.id) throw new Error("forbidden");
    const { id } = deleteFilesSchema.parse({
      id: formData.get("file_id"),
    })

    const { error, data } = await tryAndCatch(qdrantClient.delete(qdrant_collection_name, {
      filter: {
        must: [
          { key: "_file_id", match: { value: id } },
          { key: "_user_id", match: { value: session.user.id } }]
      },
      wait: true
    }))
    if (error) {
      throw new Error(error.message)
    }
    if (data.status === 'completed') {
      await databaseDrizzle
        .delete(files)
        .where(and(eq(files.id, id), eq(files.userId, session.user.id)))
    }

    revalidatePath("/connections");
    return toFormState("SUCCESS", "Connection Deleted Successfully");

  } catch (e) {
    return fromErrorToFormState(e);
  }
}
