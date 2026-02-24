"use client";

import { useState, useTransition, useCallback } from "react";
import { FileRejection, useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  Link,
  X,
  FileText,
  FileSpreadsheet,
  FileJson,
  File,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

// shadcn components
import { Button } from "@/components/ui/button";
import {
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { newFilesAction } from "@/actions/files/new";
import { EMPTY_FORM_STATE } from "@/lib/zodErrorHandle";

const SUPPORTED_MIME_TYPES = new Map([
  ["application/pdf", { ext: "pdf", icon: FileText }],
  ["text/csv", { ext: "csv", icon: FileSpreadsheet }],
  ["application/vnd.ms-excel", { ext: "xls", icon: FileSpreadsheet }],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", { ext: "xlsx", icon: FileSpreadsheet }],
  ["text/markdown", { ext: "md", icon: FileText }],
  ["application/json", { ext: "json", icon: FileJson }],
]);

const SUPPORTED_EXTENSIONS = Array.from(SUPPORTED_MIME_TYPES.values()).map(v => v.ext);
const URL_REGEX = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;


interface UploadFileFormEnhancedProps {
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  currentFiles?: string[];
}

export function UploadFileForm({ setOpen, currentFiles = [] }: UploadFileFormEnhancedProps) {
  const [links, setLinks] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [removedFiles, setRemovedFiles] = useState<string[]>([]);
  const [metadata, setMetadata] = useState<Array<{ key: string; value: string }>>([
    { key: "", value: "" },
  ]);
  const [pending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Filter out empty metadata fields
    const filteredMetadata = metadata.reduce((acc, meta) =>
      meta.key.trim() && meta.value.trim() ? { ...acc, [meta.key]: meta.value } : acc
      , {});
    const metadataJson = JSON.stringify(filteredMetadata);

    const formData = new FormData();
    links.forEach(link => formData.append("links", link));
    files.forEach(file => formData.append("files", file));
    removedFiles.forEach(name => formData.append("removedFiles", name));
    formData.append("metadata", metadataJson);

    startTransition(async () => {
      try {
        const res = await newFilesAction(EMPTY_FORM_STATE, formData)
        if (res.status === "SUCCESS") {
          setLinks([]);
          setFiles([]);
          setRemovedFiles([]);
          setOpen(false);
          toast({ title: "Upload successful", variant: "default" });
        }
        if (res.status === "ERROR") {
          throw new Error(res.message);
        }
      } catch (err: any) {
        toast({ title: err.message || "Upload failed", variant: "destructive" });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <DialogHeader>
        <DialogTitle className="text-2xl">Upload Knowledge</DialogTitle>
        <DialogDescription>
          Add files or links to your knowledge base. Supported formats: PDF, CSV, Excel, JSON, Markdown.
        </DialogDescription>
      </DialogHeader>

      <Tabs defaultValue="files" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="files" className="gap-2">
            <UploadCloud className="h-4 w-4" />
            Files
          </TabsTrigger>
          <TabsTrigger value="links" className="gap-2">
            <Link className="h-4 w-4" />
            Links
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="mt-4">
          <FileDropzone
            files={files}
            setFiles={setFiles}
            currentFiles={currentFiles}
            removedFiles={removedFiles}
            setRemovedFiles={setRemovedFiles}
          />
        </TabsContent>

        <TabsContent value="links" className="mt-4">
          <LinkInput links={links} setLinks={setLinks} />
        </TabsContent>
      </Tabs>

      <Separator />

      {/* Metadata with scrollable container */}
      <MetadataEditor fields={metadata} onChange={setMetadata} />

      <DialogFooter className="gap-3 pt-2 pb-10 sm:pb-0 flex-col-reverse sm:flex-row sm:justify-end">

        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={pending || (files.length === 0 && links.length === 0)}
          className="min-w-[100px]"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading
            </>
          ) : (
            "Upload"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface MetadataField {
  key: string;
  value: string;
}

interface MetadataEditorProps {
  fields: MetadataField[];
  onChange: (fields: MetadataField[]) => void;
}

function MetadataEditor({ fields, onChange }: MetadataEditorProps) {
  const addField = () => {
    onChange([...fields, { key: "", value: "" }]);
  };

  const removeField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    onChange(newFields.length ? newFields : [{ key: "", value: "" }]);
  };

  const updateField = (index: number, key: string, value: string) => {
    const cleanKey = key.replace(/^_+/, '');
    const newFields = [...fields];
    newFields[index] = { key: cleanKey, value };
    onChange(newFields);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base">Metadata (optional)</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addField}
          className="gap-1"
        >
          <Plus className="h-3 w-3" /> Add Field
        </Button>
      </div>

      {/* Scrollable container with fixed max-height */}
      <div className="max-h-20 overflow-y-auto border rounded-lg p-3 space-y-2">
        <AnimatePresence initial={false}>
          {fields.map((field, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-2 items-start"
            >
              <div className="flex-1 min-w-0">
                <Input
                  placeholder="Key (e.g., company)"
                  value={field.key}
                  onChange={(e) => updateField(index, e.target.value, field.value)}
                  className="h-9"
                />
              </div>
              <div className="flex-1 min-w-0">
                <Input
                  placeholder="Value (optional)"
                  value={field.value}
                  onChange={(e) => updateField(index, field.key, e.target.value)}
                  className="h-9"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => removeField(index)}
                disabled={fields.length === 1 && fields[0].key === "" && fields[0].value === ""}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// File Dropzone
// ----------------------------------------------------------------------

interface FileDropzoneProps {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  currentFiles?: string[];
  removedFiles: string[];
  setRemovedFiles: React.Dispatch<React.SetStateAction<string[]>>;
}

function FileDropzone({ files, setFiles, currentFiles = [], removedFiles, setRemovedFiles }: FileDropzoneProps) {
  const [fileError, setFileError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    setFileError(null);

    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(r => r.errors.map(e => e.message).join(", ")).join("; ");
      setFileError(`Some files were rejected: ${errors}`);
    }

    const existingNames = new Set([...currentFiles, ...files.map(f => f.name)]);
    const newFiles = acceptedFiles.filter(f => !existingNames.has(f.name));

    if (newFiles.length === 0) {
      setFileError("All selected files are already added.");
      return;
    }

    setFiles(prev => [...prev, ...newFiles]);
  }, [currentFiles, files, setFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: Object.fromEntries(Array.from(SUPPORTED_MIME_TYPES.keys()).map(type => [type, []])),
  });

  const removeFile = (fileName: string) => {
    if (currentFiles.includes(fileName)) {
      setRemovedFiles(prev => [...prev, fileName]);
    } else {
      setFiles(prev => prev.filter(f => f.name !== fileName));
    }
  };

  const allFileNames = [
    ...currentFiles.filter(name => !removedFiles.includes(name)),
    ...files.map(f => f.name),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Files</CardTitle>
        <CardDescription>
          Drag & drop or browse. Supported: PDF, CSV, Excel, JSON, Markdown.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-xl p-4 text-center cursor-pointer
            transition-all duration-200
            ${isDragActive
              ? "border-amber-500 bg-amber-500/5"
              : "border-muted-foreground/20 hover:border-amber-500/50 hover:bg-amber-500/5"
            }
          `}
        >
          <input {...getInputProps()} />
          <UploadCloud className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          {isDragActive ? (
            <p className="text-amber-600 font-medium">Drop files here...</p>
          ) : (
            <>
              <p className="text-muted-foreground mb-2">
                Drag & drop files here, or click to select
              </p>
              <p className="text-xs text-muted-foreground">
                Maximum file size: 100MB
              </p>
            </>
          )}
        </div>

        {fileError && (
          <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{fileError}</span>
          </div>
        )}

        {allFileNames.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Selected files ({allFileNames.length})</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFiles([]);
                  setRemovedFiles([]);
                }}
                className="h-8 text-xs"
              >
                Clear all
              </Button>
            </div>
            <div className="max-h-28 overflow-y-auto border rounded-lg p-3 space-y-2">
              {allFileNames.map((fileName) => {
                const ext = fileName.split(".").pop()?.toLowerCase();
                const Icon = SUPPORTED_EXTENSIONS.includes(ext || "")
                  ? (SUPPORTED_MIME_TYPES.get(
                    Array.from(SUPPORTED_MIME_TYPES.keys()).find(
                      key => SUPPORTED_MIME_TYPES.get(key)?.ext === ext
                    ) || ""
                  )?.icon || File)
                  : File;

                return (
                  <motion.div
                    key={fileName}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg group"
                  >
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span className="flex-1 break-all text-sm">{fileName}</span>
                    <Badge variant="outline" className="text-xs">
                      {ext?.toUpperCase()}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFile(fileName)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------
// Link Input
// ----------------------------------------------------------------------

interface LinkInputProps {
  links: string[];
  setLinks: React.Dispatch<React.SetStateAction<string[]>>;
}

function LinkInput({ links, setLinks }: LinkInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addLink = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (!URL_REGEX.test(trimmed)) {
      setError("Invalid URL format");
      return;
    }
    if (links.includes(trimmed)) {
      setError("This link is already added");
      return;
    }
    setLinks([...links, trimmed]);
    setInputValue("");
    setError(null);
  };

  const removeLink = (link: string) => {
    setLinks(links.filter(l => l !== link));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addLink();
    }
  };

  return (
    <Card className="w-full max-w-full overflow-hidden">
      <CardHeader>
        <CardTitle>Add Links</CardTitle>
        <CardDescription>
          Enter URLs to PDF, CSV, Excel, JSON, or Markdown files.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 overflow-hidden">
        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            <Input
              type="url"
              placeholder="https://example.com/doc.pdf"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              className={error ? "border-destructive" : ""}
            />
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-destructive mt-1"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <Button type="button" onClick={addLink} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" /> Add
          </Button>
        </div>

        {links.length > 0 && (
          <div className="mt-4 w-full max-w-full overflow-hidden">
            <p className="text-sm font-medium mb-2">Added links ({links.length})</p>
            <ScrollArea className="h-48 border rounded-lg p-2 w-full max-w-full overflow-x-hidden">
              <div className="space-y-2 pr-2 w-full min-w-0 overflow-x-hidden">
                <AnimatePresence>
                  {links.map((link) => (
                    <motion.div
                      key={link}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded-lg group w-full min-w-0 overflow-hidden"
                    >
                      <Link className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span
                        className="flex-1 break-all text-sm"
                        title={link}
                      >
                        {link}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeLink(link)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
