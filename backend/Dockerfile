FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY app ./app
COPY __init__.py ./__init__.py
COPY docker ./docker

RUN pip install --upgrade pip && \
    pip install \
      "fastapi>=0.110" \
      "uvicorn[standard]>=0.30" \
      "sqlalchemy>=2.0" \
      "passlib[bcrypt]>=1.7" \
      "bcrypt==4.0.1" \
      "python-jose[cryptography]>=3.3" \
      "PyYAML>=6.0"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
