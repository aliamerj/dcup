"use client"
import RAG_Client from "@/Clients/RAG_Client"
import { useEffect } from "react"

export const FileTable = ({ userId }: { userId: string }) => {
  useEffect(() => {
    console.log({ userId })
    const eventSource = new EventSource(RAG_Client.getProgressUrl(userId))
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log({ data })
    }

    eventSource.onerror = () => {
      eventSource.close()
    }

    return () => eventSource.close()

  }, [])
  return (
    <div>
      <h1>TABLE ..</h1>
    </div>
  )
}
