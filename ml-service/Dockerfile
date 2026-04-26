FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY src ./src
RUN mkdir -p models

EXPOSE 7000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "7000"]
