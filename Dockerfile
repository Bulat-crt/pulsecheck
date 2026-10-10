FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt .
COPY frontend ./frontend

RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini .
COPY main.py .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]