import { Dispatch, SetStateAction, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DialogClose } from '@radix-ui/react-dialog';
import { Loader2, Settings2, X } from 'lucide-react';
import { EMPTY_FORM_STATE } from '@/lib/zodErrorHandle';
import { toast } from '@/hooks/use-toast';
import { ConnectionQuery } from '@/app/(protected)/connections/page';
import { useTransition } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { setConnectionConfig } from '@/actions/connctions/set';
import { Label } from '@/components/ui/label';

type ConnectionProps = {
  connection: ConnectionQuery,
  status: "PROCESSING" | "FINISHED" | undefined,
  showPicker: () => void
  directory: { name: string, id: string | null }
  open: boolean,
  setOpen: Dispatch<SetStateAction<boolean>>

}
export const ConfigConnection = ({ connection, directory, status, open, setOpen, showPicker }: ConnectionProps) => {
  const [isConfigSet, setIsConfigSet] = useState(connection.isConfigSet)
  const [pending, startTransition] = useTransition()


  const handleSetConfig = (data: FormData) => {
    data.set("connectionId", connection.id)
    data.set("folderName", directory.name)
    data.set("service", connection.service)
    directory?.id && data.set("folderId", directory.id)
    startTransition(async () => {
      const setConfig = async () => {
        try {
          const res = await setConnectionConfig(EMPTY_FORM_STATE, data)
          if (res.status === 'SUCCESS') {
            setOpen(false)
            setIsConfigSet(true)
          }
          if (res.message) {
            toast({
              title: res.message,
            });
          }
          if (res.status === 'ERROR') {
            throw new Error(res.message)
          }
        } catch (err: any) {
          toast({
            title: err.message,
            variant: 'destructive'
          });
        }
        return;
      };
      await setConfig();
    })
  }


  return (<Dialog open={open} onOpenChange={o => setOpen(o)} >
    <DialogTrigger asChild>
      <Button size='sm' variant={isConfigSet ? 'ghost' : 'default'} disabled={status === 'PROCESSING' || (!status && connection.isSyncing)} onClick={() => setOpen(true)} >
        <Settings2 />
        Configure
      </Button>
    </DialogTrigger>
    <DialogContent className="sm:max-w-[425px]">
      <DialogClose onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogClose>
      <DialogHeader>
        <DialogTitle>Source Configuration</DialogTitle>
        <DialogDescription>
          Configure your connection settings.
        </DialogDescription>
      </DialogHeader>
      <form action={handleSetConfig}>
        <div className="grid gap-4 py-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="connectionName">Connection Name</Label>
            <Input
              id="connectionName"
              name="connectionName"
              defaultValue={connection ? connection.identifier : ""}
              placeholder="Unique connection name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Folder</label>
            <div className="flex items-center gap-2">
              <Input
                value={directory?.name || connection.folderName || ""}
                placeholder="No folder selected"
                disabled={connection.isSyncing || connection.isConfigSet}
                onClick={showPicker} type='button'
                readOnly
              />
              <Button onClick={showPicker} type="button" disabled={connection.isSyncing || connection.isConfigSet}  >
                Select Folder
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Metadata (JSON)</label>
            <Textarea
              id='metadata'
              name='metadata'
              placeholder='{"company": "dcup"}'
              defaultValue={connection.metadata || "{}"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Page Limit</label>
            <Input
              type="number"
              name='pageLimit'
              disabled={connection.isSyncing || connection.isConfigSet}
              id='pageLimit'
              defaultValue={connection.files.reduce((s, f) => s + f.totalPages, 0) !== 0 ? connection.files.reduce((s, f) => s + f.totalPages, 0) : undefined}
              placeholder="Enter page limit"
            />
            <p className="text-xs text-muted-foreground">
              Setting a page limit will stop processing further pages until the limit is increased or removed.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium">Document Limit</label>
            <Input
              name='documentLimit'
              id='documentLimit'
              disabled={connection.isSyncing || connection.isConfigSet}
              type="number"
              defaultValue={connection.files.length !== 0 ? connection.files.length : undefined}
              placeholder="Enter document limit"
            />
            <p className="text-xs text-muted-foreground">
              Limit the number of documents processed. The connection will pause once the limit is reached.
            </p>
          </div>

        </div>
        <DialogFooter>
          <Button disabled={pending} type="submit">
            {pending ? (
              <>
                {" "}
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Please wait
              </>
            ) : isConfigSet ? "Save Changes" : "Set Configuration"
            }
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
  );
}
