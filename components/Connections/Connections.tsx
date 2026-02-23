"use client"
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { timeAgo } from "@/lib/utils";
import { useEffect, useState } from "react";
import { ConnectionQuery, ConnectionToken } from "@/app/(protected)/connections/page";
import { getServiceIcon } from "@/lib/helepers";
import { Check, X, Pickaxe, AlertCircle, Table } from "lucide-react";
import { DataSource } from "@/DataSource";
import { ConnectionProgress } from "@/events";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useRouter } from "next/navigation";
import RAG_Client from "@/Clients/RAG_Client";
import { FiDatabase } from "react-icons/fi";

export default function Connections({ connections, tokens, userId }: { connections: ConnectionQuery[], tokens: ConnectionToken, userId: string }) {
  const [isMounted, setIsMounted] = useState(false)
  const route = useRouter()
  const [connProgress, setConnProgress] = useState<ConnectionProgress | null>(null);

  useEffect(() => {
    setIsMounted(true)
    console.log({ userId })
    const eventSource = new EventSource(RAG_Client.getProgressUrl(userId))
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log({ data })
    }

    eventSource.onerror = () => {
      eventSource.close()
      setConnProgress(null)
    }

    return () => eventSource.close()

  }, [])

  useEffect(() => {
    if (connProgress?.status === 'FINISHED') {
      route.refresh();
    }
  }, [connProgress, route]);

  return connections.map(connection => {
    const progress = connection.id === connProgress?.connectionId ? connProgress : null;
    if (connections.length === 0) return <EmptyState />
    return (
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Active Connections</h2>
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-50">Source</TableHead>
                <TableHead>Directory</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Pages</TableHead>
                <TableHead>Date Added</TableHead>
                <TableHead>Last Synced</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow key={connection.id}>
                <TableCell className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {getServiceIcon(connection.service)}
                    <span data-test="service" className="capitalize">
                      {connection.service.toLowerCase().replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    {connection.identifier}
                  </p>
                </TableCell>
                <TableCell data-test="folderName" >{connection.folderName || 'Untitled'}</TableCell>
                <TableCell data-test="processedFile" >{progress?.processedFile ?? connection.files.length}</TableCell>
                <TableCell data-test="processedPage" >{progress?.processedPage ?? connection.files.reduce((sum, file) => sum + file.totalPages, 0)}</TableCell>
                <TableCell>
                  <span>{!isMounted ? "Loading..." : timeAgo(connection.createdAt)}</span>
                </TableCell>
                <TableCell>
                  {!isMounted ? "Loading..." : <LastSync lastSync={progress?.lastAsync ?? connection.lastSynced} />}
                </TableCell>
                <TableCell>
                  <ConnectionStatus status={progress?.status} connection={connection} errorMessage={progress?.errorMessage} />
                </TableCell>
                <TableCell>
                  <DataSource connection={connection} token={tokens.get(connection.id)} status={progress?.status} />
                </TableCell>
                {progress?.errorMessage && <TableCell>
                  <Alert variant="destructive" className="w-full">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      {progress?.errorMessage}
                    </AlertDescription>
                  </Alert>
                </TableCell>}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    )
  });
}

const LastSync = ({ lastSync }: { lastSync: Date | undefined | null }) => {
  if (!lastSync) return <span className="text-muted-foreground">Never</span>
  return <span>{timeAgo(lastSync)}</span>
}

const ConnectionStatus = ({ status, connection, errorMessage }: { status?: "PROCESSING" | "FINISHED", connection: ConnectionQuery, errorMessage?: string }) => {
  return (<TooltipProvider>
    <Tooltip>
      <TooltipTrigger>
        {status === 'PROCESSING' || (!status && connection.jobId) ? (
          <Pickaxe className="animate-bounce text-blue-500" />
        ) : errorMessage ? (<X className="text-red-500" />) : (<Check className={connection.isConfigSet || status ? 'text-green-500' : 'text-muted-foreground'} />)}
      </TooltipTrigger>
      <TooltipContent>
        {status === 'FINISHED' || (!status && !connection.jobId) ? errorMessage ? "Sync Failed" : "Sync completed" : "Currently syncing"}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>)
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full text-center p-6">
      <div className="bg-muted p-4 rounded-full mb-4">
        <FiDatabase className="h-12 w-12 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-semibold">No Connected Sources</h2>
      <p className="text-muted-foreground max-w-md">
        Connect your first data source to start syncing documents and pages with your application. We support Google Drive, Notion, AWS, and more.
      </p>
    </div>
  );
}
