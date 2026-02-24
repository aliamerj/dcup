"use server"
import { databaseDrizzle } from "@/db";
import { Plans } from "@/lib/Plans";
import { fromErrorToFormState, toFormState } from "@/lib/zodErrorHandle";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import RAG_Client from "@/Clients/RAG_Client";

type FormState = {
  message: string;
};

export async function newFilesAction(_: FormState, formData: FormData) {
  const files = formData.getAll("files") as File[]
  const links = formData.getAll("links") as string[]
  const metadata = formData.get("metadata") as string

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    if (!session?.user?.id) throw new Error("forbidden");
    const user = await databaseDrizzle.query.users.findFirst({
      where: (u, ops) => ops.eq(u.id, session.user.id!),
      columns: {
        plan: true,
      },
      with: {
        files: true,
      }
    })
    if (!user) throw new Error("no such account")
    const plan = Plans[user.plan]
    const used = user.files.length;
    if (used >= plan.connections) {
      throw new Error(
        `You’ve reached your file upload limit for the ${user.plan.toLowerCase()} plan (` +
        `${used}/${plan.connections}). ` +
        `To add more connections, please upgrade your subscription.`
      );
    }
    const metaJson = JSON.parse(metadata || "{}")
    metaJson["_user_id"] = session.user.id
    const meta = JSON.stringify(metaJson)

    const storeFiles = files.map(file => RAG_Client.store.file.all(file, meta))
    const storeLinks = links.map(link => RAG_Client.store.url.all(link, meta))
    await Promise.all([...storeFiles, ...storeLinks])

    revalidatePath("/documents");
    return toFormState("SUCCESS", "Upload successful");
  } catch (e) {
    return fromErrorToFormState(e);
  }
}
