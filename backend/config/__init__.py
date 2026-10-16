"""Django project package for the HRMS backend."""

from .celery import app as celery_app

__all__ = ("celery_app",)
