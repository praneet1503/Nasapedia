from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class ProjectOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    trl: Optional[int] = None
    organization: Optional[str] = None
    technology_area: Optional[str] = None
    last_updated: Optional[datetime] = None
