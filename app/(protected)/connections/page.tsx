import Link from "next/link"
import dynamic from 'next/dynamic'
import { Button } from "@/components/ui/button";
import { databaseDrizzle } from "@/db";
import { redirect } from 'next/navigation';
import { getConnectionToken } from "@/fileProcessors/connectors";
import { SetNewConfigDirect } from "@/DataSource/DirectUpload/SetNewConfigDirect/SetNewConfigDirect";
import { tryAndCatch } from "@/lib/try-catch";
import { ConnectionTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const Connections = dynamic(() => import('@/components/Connections/Connections'))

export interface ConnectionQuery extends ConnectionTable {
  files: {
    totalPages: number,
    name: string,
  }[]
}
export type ConnectionToken = Map<string, string | null>;

export default async function ConnectionsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session?.user.id) return redirect("/login")
  const connections: ConnectionQuery[] = await databaseDrizzle.query.connections.findMany({
    where: (c, ops) => ops.eq(c.userId, session.user.id!),
    with: {
      files: {
        columns: {
          totalPages: true,
          name: true,
        }
      }
    }
  })

  const tokens: ConnectionToken = new Map()
  for (const conn of connections) {
    const { data } = await tryAndCatch(getConnectionToken(conn))
    tokens.set(conn.id, data || null)
  }

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
          <SetNewConfigDirect />
          <Button asChild>
            <Link href={"/connections/new"}>
              New Connection
            </Link>
          </Button>
        </div>
      </div>
      <Connections connections={connections} tokens={tokens} userId={session.user.id} />
    </div>
  );
}
