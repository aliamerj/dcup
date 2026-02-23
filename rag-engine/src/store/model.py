from pydantic import BaseModel


class StoreResponse(BaseModel):
    file_name: str
    file_type: str
    job_id: str
    stage: str
    status: str
