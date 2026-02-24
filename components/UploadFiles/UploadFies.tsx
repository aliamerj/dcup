"use client"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { UploadFileForm } from "@/components/UploadFileForm/UploadFileForm"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export const UploadFilesDialog = () => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-test={"btn-upload-files"}>Upload Files</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Upload Files Directly</DialogTitle>
        </DialogHeader>
        <div className="max-h-screen overflow-y-auto">
          <UploadFileForm setOpen={setOpen} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
