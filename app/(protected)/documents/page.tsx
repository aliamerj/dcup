import { databaseDrizzle } from "@/db";
import { redirect } from 'next/navigation';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { UploadFilesDialog } from "@/components/UploadFiles/UploadFies";
import { FileTable } from "@/components/FileTable/FileTable";


export type ConnectionToken = Map<string, string | null>;

export default async function DocumentsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session?.user.id) return redirect("/login")
  const connections = await databaseDrizzle.query.users.findMany({
    where: (c, ops) => ops.eq(c.id, session.user.id!),
    with: {
      files: {
        columns: {
          totalPages: true,
          name: true,
        }
      }
    }
  })

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-linear-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Connected Services
          </h1>
          <p className="text-muted-foreground text-lg mt-2">
            Manage your data sources and keep your application in sync.
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <UploadFilesDialog />
        </div>
      </div>
      <FileTable userId={session.user.id} />
    </div>
  );
}
