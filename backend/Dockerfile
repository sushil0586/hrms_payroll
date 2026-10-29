FROM python:3.12-alpine@sha256:5789aa194f757888f41fa3d48e14b6feaa1b57c0af0b56fcb1372d6474d3bff0 AS builder

WORKDIR /app

RUN apk add --no-cache build-base libffi-dev openssl-dev postgresql-dev

COPY backend/requirements ./requirements
RUN python -m pip install --no-cache-dir --upgrade pip \
    && python -m pip install --no-cache-dir --prefix=/install -r requirements/production.txt

FROM python:3.12-alpine@sha256:5789aa194f757888f41fa3d48e14b6feaa1b57c0af0b56fcb1372d6474d3bff0 AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings.production

WORKDIR /app

RUN apk add --no-cache curl libpq

COPY --from=builder /install/ /usr/local/
COPY backend .

RUN python manage.py collectstatic --noinput \
    && python -m pip uninstall -y pip setuptools wheel \
    && rm -rf /usr/local/lib/python3.12/ensurepip \
    && addgroup -S hrms \
    && adduser -S -D -H -G hrms -h /app hrms \
    && chown -R hrms:hrms /app

USER hrms

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "60"]
