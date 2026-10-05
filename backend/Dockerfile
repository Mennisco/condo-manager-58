FROM python:3.11-slim

WORKDIR /app

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

# Expose port (Cloud Run defaults to 8080)
EXPOSE 8080

# Run FastAPI / Uvicorn server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]
