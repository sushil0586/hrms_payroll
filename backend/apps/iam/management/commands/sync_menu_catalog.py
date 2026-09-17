from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.utils import OperationalError, ProgrammingError

from apps.iam.menu_catalog import get_menu_catalog
from apps.iam.models import MenuCatalogEntry


class Command(BaseCommand):
    help = "Synchronize workspace menu catalog rows from the code-backed default catalog."

    def add_arguments(self, parser):
        parser.add_argument(
            "--deactivate-missing",
            action="store_true",
            help="Mark DB menu rows inactive when they no longer exist in the code catalog.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show the expected create/update/deactivate counts without writing rows.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        catalog = get_menu_catalog()
        catalog_by_identity = {(item["workspace"], item["kind"], item["href"]): item for item in catalog}
        try:
            existing_by_identity = {
                (item.workspace, item.kind, item.href): item
                for item in MenuCatalogEntry.objects.all()
            }
        except (OperationalError, ProgrammingError) as exc:
            raise CommandError("Menu catalog table is not available. Run database migrations before syncing.") from exc

        created = 0
        updated = 0
        deactivated = 0
        dry_run = options["dry_run"]

        for identity, item in catalog_by_identity.items():
            defaults = {
                "group": item["group"],
                "label": item["label"],
                "short_label": item["short_label"],
                "blurb": item["blurb"],
                "permission_keys": item["permission_keys"],
                "sort_order": item["sort_order"],
                "is_active": True,
                "source_ref": "code_catalog",
            }
            existing = existing_by_identity.get(identity)
            if existing is None:
                created += 1
                if not dry_run:
                    MenuCatalogEntry.objects.create(
                        workspace=item["workspace"],
                        kind=item["kind"],
                        href=item["href"],
                        **defaults,
                    )
                continue

            changed = any(getattr(existing, field) != value for field, value in defaults.items())
            if changed:
                updated += 1
                if not dry_run:
                    for field, value in defaults.items():
                        setattr(existing, field, value)
                    existing.save(update_fields=list(defaults.keys()) + ["updated_at"])

        if options["deactivate_missing"]:
            missing = set(existing_by_identity) - set(catalog_by_identity)
            deactivated = len([identity for identity in missing if existing_by_identity[identity].is_active])
            if missing and not dry_run:
                for identity in missing:
                    item = existing_by_identity[identity]
                    if item.is_active:
                        item.is_active = False
                        item.save(update_fields=["is_active", "updated_at"])

        if dry_run:
            transaction.set_rollback(True)

        self.stdout.write(
            self.style.SUCCESS(
                f"Menu catalog sync complete: created={created}, updated={updated}, deactivated={deactivated}, dry_run={dry_run}"
            )
        )
