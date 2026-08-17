from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import MetaData
import uuid

# Dùng kiểu chuỗi cho SQLite (tương thích đa Database)
# Trong môi trường Postgres thật, khai báo UUID sẽ tự dùng UUID natvie

def generate_uuid():
    return str(uuid.uuid4())

class Base(DeclarativeBase):
    metadata = MetaData()
    pass
