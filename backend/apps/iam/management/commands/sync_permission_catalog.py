from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.utils import OperationalError, ProgrammingError

from apps.iam.models import PermissionCatalogEntry
from apps.iam.permission_catalog import get_permission_catalog


class Command(BaseCommand):
    help = "Synchronize the platform permission catalog table from the code-backed catalog."

    def add_arguments(self, parser):
        parser.add_argument(
            "--deactivate-missing",
            action="store_true",
            help="Mark DB catalog rows inactive when the key no longer exists in the code catalog.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show the expected create/update/deactivate counts without writing rows.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        catalog = get_permission_catalog()
        catalog_by_key = {item["key"]: item for item in catalog}
        try:
            existing_by_key = {item.key: item for item in PermissionCatalogEntry.objects.all()}
        except (OperationalError, ProgrammingError) as exc:
            raise CommandError("Permission catalog table is not available. Run database migrations before syncing.") from exc
        created = 0
        updated = 0
        deactivated = 0
        dry_run = options["dry_run"]

        for key, item in catalog_by_key.items():
            defaults = {
                "label": item["label"],
                "module": item["module"],
                "description": item["description"],
                "risk_level": item["risk_level"],
                "tenant_assignable": item["tenant_assignable"],
                "required_module": item["required_module"],
                "required_plan": item["required_plan"],
                "default_role_codes": item["default_role_codes"],
                "is_active": True,
                "managed_by_platform": True,
                "source_ref": "code_catalog",
            }
            existing = existing_by_key.get(key)
            if existing is None:
                created += 1
                if not dry_run:
                    PermissionCatalogEntry.objects.create(key=key, **defaults)
                continue

            changed = any(getattr(existing, field) != value for field, value in defaults.items())
            if changed:
                updated += 1
                if not dry_run:
                    for field, value in defaults.items():
                        setattr(existing, field, value)
                    existing.save(update_fields=list(defaults.keys()) + ["updated_at"])

        if options["deactivate_missing"]:
            missing_keys = set(existing_by_key) - set(catalog_by_key)
            deactivated = len([key for key in missing_keys if existing_by_key[key].is_active])
            if missing_keys and not dry_run:
                PermissionCatalogEntry.objects.filter(key__in=missing_keys, is_active=True).update(is_active=False)

        if dry_run:
            transaction.set_rollback(True)

        self.stdout.write(
            self.style.SUCCESS(
                f"Permission catalog sync complete: created={created}, updated={updated}, deactivated={deactivated}, dry_run={dry_run}"
            )
        )
