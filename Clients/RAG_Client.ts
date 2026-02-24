/* =======================
   Response Types
======================= */
interface StoreResponse {
  file_name: string,
  file_type: string,
  job_id: string,
  stage: string,
  status: string,
}

interface QueryResponse {
  text: string
  score: number
  token_count: number
  content_type: string
  metadata: Record<string, any>
  table_json: (string | null)[][]
  reference: {
    file: string
    section: string
    pages: number[]
  }
}

/* =======================
   Core Client
======================= */

class RAGClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  /* -----------------------
     STORE
  ----------------------- */

  store = {
    file: {
      all: (file: File, metadata: any) =>
        this.uploadFile<StoreResponse>("/store/upload/all", file, metadata),
      pdf: (file: File, metadata?: any) =>
        this.uploadFile<StoreResponse>("/store/upload/pdf", file, metadata),

      md: (file: File, metadata?: any) =>
        this.uploadFile("/store/upload/md", file, metadata),

      csv: (file: File, metadata?: any) =>
        this.uploadFile("/store/upload/csv", file, metadata),

      json: (file: File, metadata?: any) =>
        this.uploadFile("/store/upload/json", file, metadata),

      sheet: (file: File, metadata?: any) =>
        this.uploadFile("/store/upload/sheet", file, metadata)
    },

    url: {
      all: (url: string, metadata?: any) =>
        this.uploadUrl<StoreResponse>("/store/url/all", url, metadata),
      pdf: (url: string, metadata?: any) =>
        this.uploadUrl<StoreResponse>("/store/url/pdf", url, metadata),

      md: (url: string, metadata?: any) =>
        this.uploadUrl("/store/url/md", url, metadata),

      csv: (url: string, metadata?: any) =>
        this.uploadUrl("/store/url/csv", url, metadata),

      json: (url: string, metadata?: any) =>
        this.uploadUrl("/store/url/json", url, metadata),

      sheet: (url: string, metadata?: any) =>
        this.uploadUrl("/store/url/sheet", url, metadata)
    }
  }

  getProgressUrl(userId: string) {
    return `${this.baseUrl}/progress/${userId}`;
  }
  /* -----------------------
     QUERY
  ----------------------- */

  async query(
    queries: string[],
    opts: {
      metadata: string
      top_result?: number | null
    }
  ): Promise<QueryResponse[]> {
    const body = new URLSearchParams()

    queries.forEach(q => body.append("queries", q))
    if (opts.metadata) body.append("metadata", opts.metadata)
    if (opts?.top_result != null)
      body.append("top_result", String(opts.top_result))

    return this.request("/query", {
      method: "POST",
      body
    })
  }

  /* =======================
     Internal helpers
======================= */

  private async uploadFile<T = any>(
    path: string,
    file: File,
    metadata: any
  ): Promise<T> {
    const form = new FormData()
    form.append("upload", file)
    form.append("metadata", JSON.stringify(metadata))

    return this.request(path, {
      method: "POST",
      body: form
    })
  }

  private async uploadUrl<T = any>(
    path: string,
    url: string,
    metadata: any
  ): Promise<T> {
    const body = new URLSearchParams()
    body.append("url", url)
    body.append("metadata", JSON.stringify(metadata))

    return this.request(path, {
      method: "POST",
      body
    })
  }

  private async request<T>(
    path: string,
    init: RequestInit
  ): Promise<T> {
    const res = await fetch(this.baseUrl + path, {
      ...init,
      headers: {
        ...(init.body instanceof FormData
          ? {}
          : { "Content-Type": "application/x-www-form-urlencoded" })
      }
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`API ${res.status}: ${text}`)
    }

    return res.json()
  }
}

const RAG_Client = new RAGClient(process.env.DCUP_RAG ?? "http://127.0.0.1:8000")
export default RAG_Client
