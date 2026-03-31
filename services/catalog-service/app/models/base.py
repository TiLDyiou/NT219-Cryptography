from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import MetaData
import uuid
from sqlalchemy.dialects.postgresql import UUID

# Dùng kiểu chuỗi cho SQLite (tương thích đa Database)
# Trong môi trường Postgres thật, khai báo UUID sẽ tự dùng UUID natvie
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class Base(DeclarativeBase):
    metadata = MetaData()
    pass
