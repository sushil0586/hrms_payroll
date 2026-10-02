"""Seed realistic ESS data for an end-user journey."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from django.core.files.base import ContentFile
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.documents.models import (
    DocumentArtifact,
    DocumentArtifactSourceKind,
    DocumentCategory,
    DocumentCategoryType,
    DocumentRequirementRule,
    DocumentStorageProvider,
    EmployeeDocument,
    EmployeeDocumentStatus,
    VerificationStatus,
)
from apps.employees.models import Employee
from apps.payroll.models import (
    EmployeeStatutoryDeclaration,
    EmployeeStatutoryDeclarationItem,
    EmployeeStatutoryProfile,
    PayrollConfigStatus,
    PayrollDeclarationStatus,
    PayrollStatutoryDeclarationItemKind,
    PayrollStatutoryDeclarationStatus,
    PayrollStatutoryPack,
    PayrollStatutoryProofStatus,
    PayrollTaxRegime,
)
from apps.tenants.models import Tenant


SEED_REF = "ESS_REAL_USER_DEMO_V1"
DEFAULT_TENANT_CODE = "northstar-foods"
DEFAULT_EMPLOYEE_CODE = "EMP-0042"


class Command(BaseCommand):
    help = "Creates realistic self-service demo data for one employee."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-code", default=DEFAULT_TENANT_CODE)
        parser.add_argument("--employee-code", default=DEFAULT_EMPLOYEE_CODE)
        parser.add_argument("--password", default="Password@123")
        parser.add_argument("--skip-bootstrap", action="store_true")
        parser.add_argument("--cleanup", action="store_true")

    @transaction.atomic
    def handle(self, *args, **options):
        tenant_code = options["tenant_code"]
        employee_code = options["employee_code"]

        if not options["skip_bootstrap"] and not options["cleanup"]:
            call_command("bootstrap_demo_workspace", password=options["password"], stdout=self.stdout)

        tenant = Tenant.objects.filter(code=tenant_code).first()
        if tenant is None:
            raise CommandError(f"Tenant not found: {tenant_code}")

        employee = Employee.objects.select_related("membership", "membership__user").filter(
            tenant=tenant,
            employee_code=employee_code,
        ).first()
        if employee is None or employee.membership_id is None:
            raise CommandError(f"Employee with login access was not found: {employee_code}")

        cleanup_summary = self._cleanup(tenant, employee)
        if options["cleanup"]:
            self.stdout.write(self.style.SUCCESS(f"Cleaned ESS demo data for {employee.employee_code}."))
            self.stdout.write(str(cleanup_summary))
            return

        categories = self._seed_document_categories(tenant)
        documents = self._seed_employee_documents(tenant, employee, categories)
        profile, declarations = self._seed_statutory(tenant, employee)

        self.stdout.write(self.style.SUCCESS(f"Seeded ESS demo data for {tenant.code}/{employee.employee_code}."))
        self.stdout.write(f"Employee login: {employee.membership.user.username}")
        self.stdout.write(f"Documents: {len(documents)}")
        self.stdout.write(f"Statutory profile: {profile.profile_ref}")
        self.stdout.write(f"Declarations: {len(declarations)}")

    def _cleanup(self, tenant: Tenant, employee: Employee) -> dict[str, int]:
        declaration_ids = list(
            EmployeeStatutoryDeclaration.objects.filter(
                tenant=tenant,
                employee=employee,
                config_snapshot__seed_ref=SEED_REF,
            ).values_list("id", flat=True)
        )
        deleted_declaration_items = EmployeeStatutoryDeclarationItem.objects.filter(
            tenant=tenant,
            declaration_id__in=declaration_ids,
        ).delete()[0]
        deleted_declarations = EmployeeStatutoryDeclaration.objects.filter(id__in=declaration_ids).delete()[0]
        deleted_profiles = EmployeeStatutoryProfile.objects.filter(
            tenant=tenant,
            employee=employee,
            config_snapshot__seed_ref=SEED_REF,
        ).delete()[0]

        document_ids = list(
            EmployeeDocument.objects.filter(
                tenant=tenant,
                employee=employee,
                metadata__seed_ref=SEED_REF,
            ).values_list("id", flat=True)
        )
        artifact_ids = list(
            EmployeeDocument.objects.filter(id__in=document_ids, artifact_id__isnull=False).values_list("artifact_id", flat=True)
        )
        deleted_documents = EmployeeDocument.objects.filter(id__in=document_ids).delete()[0]
        deleted_artifacts = DocumentArtifact.objects.filter(id__in=artifact_ids, metadata__seed_ref=SEED_REF).delete()[0]

        return {
            "documents": deleted_documents,
            "document_artifacts": deleted_artifacts,
            "statutory_profiles": deleted_profiles,
            "statutory_declarations": deleted_declarations,
            "statutory_declaration_items": deleted_declaration_items,
        }

    def _seed_document_categories(self, tenant: Tenant) -> dict[str, DocumentCategory]:
        definitions = [
            {
                "code": "pan-card",
                "name": "PAN Card",
                "category_type": DocumentCategoryType.TAX,
                "description": "Permanent Account Number proof for payroll tax setup.",
                "allow_multiple_files": False,
            },
            {
                "code": "aadhaar-card",
                "name": "Aadhaar Card",
                "category_type": DocumentCategoryType.IDENTITY,
                "description": "Identity proof used for employee verification.",
                "allow_multiple_files": False,
            },
            {
                "code": "bank-proof",
                "name": "Bank Account Proof",
                "category_type": DocumentCategoryType.BANK,
                "description": "Cancelled cheque or bank statement for salary transfer.",
                "allow_multiple_files": False,
            },
            {
                "code": "address-proof",
                "name": "Address Proof",
                "category_type": DocumentCategoryType.ADDRESS,
                "description": "Current residential address evidence.",
                "requires_expiry_date": True,
                "allow_multiple_files": False,
            },
            {
                "code": "investment-proof",
                "name": "Investment Proof",
                "category_type": DocumentCategoryType.TAX,
                "description": "Tax-saving investment and exemption proofs.",
                "allow_multiple_files": True,
                "visibility_rules": {"statutory_proof": True},
            },
        ]

        categories: dict[str, DocumentCategory] = {}
        for definition in definitions:
            category, _ = DocumentCategory.objects.update_or_create(
                tenant=tenant,
                code=definition["code"],
                defaults={
                    "name": definition["name"],
                    "category_type": definition["category_type"],
                    "description": definition["description"],
                    "is_active": True,
                    "is_system_seeded": True,
                    "requires_expiry_date": definition.get("requires_expiry_date", False),
                    "requires_verification": True,
                    "allow_employee_upload": True,
                    "allow_multiple_files": definition.get("allow_multiple_files", False),
                    "visibility_rules": definition.get("visibility_rules", {}),
                },
            )
            categories[definition["code"]] = category
            DocumentRequirementRule.objects.get_or_create(
                tenant=tenant,
                category=category,
                legal_entity=None,
                branch=None,
                department=None,
                grade=None,
                employment_type=None,
                defaults={
                    "is_mandatory": definition["code"] != "investment-proof",
                    "required_within_days_of_joining": 7,
                    "priority": 10 if definition["code"] in {"pan-card", "aadhaar-card", "bank-proof"} else 30,
                    "is_active": True,
                },
            )
        return categories

    def _seed_employee_documents(self, tenant: Tenant, employee: Employee, categories: dict[str, DocumentCategory]) -> list[EmployeeDocument]:
        today = timezone.localdate()
        specs = [
            ("pan-card", "PAN Card", "ABCDE1234F", today - timedelta(days=720), None, VerificationStatus.VERIFIED, ""),
            ("aadhaar-card", "Aadhaar Card", "XXXX-XXXX-1234", today - timedelta(days=900), None, VerificationStatus.VERIFIED, ""),
            ("bank-proof", "Bank Account Proof", "HDFC-4452", today - timedelta(days=150), None, VerificationStatus.PENDING, ""),
            (
                "address-proof",
                "Rental Agreement",
                "RENT-BLR-2026",
                today - timedelta(days=90),
                today + timedelta(days=55),
                VerificationStatus.REJECTED,
                "Address proof is blurry; upload a clearer copy.",
            ),
        ]
        documents: list[EmployeeDocument] = []
        for code, title, number, issued_on, expires_on, verification_status, rejection_reason in specs:
            category = categories[code]
            artifact = self._create_artifact(tenant, employee, title)
            item, _ = EmployeeDocument.objects.update_or_create(
                tenant=tenant,
                employee=employee,
                category=category,
                title=title,
                defaults={
                    "artifact": artifact,
                    "status": EmployeeDocumentStatus.ACTIVE,
                    "verification_status": verification_status,
                    "version_number": 1,
                    "file_name": artifact.original_filename,
                    "file_url": "",
                    "file_path": artifact.storage_key,
                    "mime_type": artifact.mime_type,
                    "file_size_bytes": artifact.file_size_bytes,
                    "document_number": number,
                    "issued_on": issued_on,
                    "expires_on": expires_on,
                    "uploaded_by_identifier": employee.membership.user.username,
                    "verified_by_identifier": "nisha.rao" if verification_status == VerificationStatus.VERIFIED else "",
                    "verified_at": timezone.now() if verification_status == VerificationStatus.VERIFIED else None,
                    "rejection_reason": rejection_reason,
                    "reupload_requested": verification_status == VerificationStatus.REJECTED,
                    "reupload_requested_at": timezone.now() if verification_status == VerificationStatus.REJECTED else None,
                    "reupload_requested_by_identifier": "nisha.rao" if verification_status == VerificationStatus.REJECTED else "",
                    "metadata": {"seed_ref": SEED_REF, "persona": "ess_real_employee"},
                },
            )
            documents.append(item)
        return documents

    def _create_artifact(self, tenant: Tenant, employee: Employee, title: str) -> DocumentArtifact:
        safe_title = title.lower().replace(" ", "-")
        filename = f"{employee.employee_code.lower()}-{safe_title}.pdf"
        payload = (
            f"%PDF-1.4\n"
            f"% ESS demo document\n"
            f"1 0 obj << /Type /Catalog >> endobj\n"
            f"% {tenant.code} {employee.employee_code} {title}\n"
            f"%%EOF\n"
        ).encode("utf-8")
        artifact = DocumentArtifact(
            tenant=tenant,
            employee=employee,
            source_kind=DocumentArtifactSourceKind.UPLOADED,
            storage_provider=DocumentStorageProvider.LOCAL,
            original_filename=filename,
            storage_key=f"ess-demo/{tenant.code}/{employee.employee_code}/{filename}",
            mime_type="application/pdf",
            file_size_bytes=len(payload),
            created_by_identifier=employee.membership.user.username,
            metadata={"seed_ref": SEED_REF, "title": title},
        )
        artifact.stored_file.save(filename, ContentFile(payload), save=False)
        artifact.save()
        return artifact

    def _seed_statutory(self, tenant: Tenant, employee: Employee):
        pack, _ = PayrollStatutoryPack.objects.update_or_create(
            tenant=tenant,
            code="india-default-statutory-pack",
            defaults={
                "name": "India Payroll Statutory Pack",
                "country_code": "IN",
                "jurisdiction_ref": "country:IN",
                "status": PayrollConfigStatus.ACTIVE,
                "effective_from": date(2026, 4, 1),
                "effective_to": None,
                "currency_code": "INR",
                "statutory_profile_ref": "payroll.statutory.india.default.v1",
                "validation_profile_ref": "payroll.statutory.validation.india.default.v1",
                "config_snapshot": {"seed_ref": SEED_REF},
            },
        )
        profile, _ = EmployeeStatutoryProfile.objects.update_or_create(
            tenant=tenant,
            employee=employee,
            profile_ref="payroll.employee_statutory_profile.india.demo.v1",
            defaults={
                "statutory_pack": pack,
                "effective_from": date(2026, 4, 1),
                "effective_to": None,
                "status": PayrollConfigStatus.ACTIVE,
                "pan_number": "ABCDE1234F",
                "uan_number": "100200300400",
                "pf_number": "PF/BLR/0042",
                "esi_number": "",
                "pf_applicable": True,
                "esi_applicable": False,
                "professional_tax_state": "KA",
                "lwf_state": "KA",
                "tax_regime": PayrollTaxRegime.OLD,
                "declaration_status": PayrollDeclarationStatus.PROOFS_PENDING,
                "previous_employment_income": Decimal("420000.00"),
                "previous_employment_tax_deducted": Decimal("18000.00"),
                "source_ref": f"{SEED_REF}:profile:{employee.employee_code}",
                "config_snapshot": {"seed_ref": SEED_REF},
            },
        )

        current = self._seed_declaration(
            tenant=tenant,
            employee=employee,
            profile=profile,
            pack=pack,
            financial_year_code="FY2026-27",
            status=PayrollStatutoryDeclarationStatus.DRAFT,
            tax_regime=PayrollTaxRegime.OLD,
            items=[
                ("80C", "ELSS", "Equity linked saving scheme", PayrollStatutoryDeclarationItemKind.INVESTMENT, "50000.00", "0.00", PayrollStatutoryProofStatus.SUBMITTED),
                ("80D", "MEDICAL", "Medical insurance premium", PayrollStatutoryDeclarationItemKind.DEDUCTION, "25000.00", "0.00", PayrollStatutoryProofStatus.PENDING),
                ("HRA", "RENT", "Bengaluru house rent receipts", PayrollStatutoryDeclarationItemKind.RENTAL, "120000.00", "0.00", PayrollStatutoryProofStatus.SUBMITTED),
            ],
        )
        historical = self._seed_declaration(
            tenant=tenant,
            employee=employee,
            profile=profile,
            pack=pack,
            financial_year_code="FY2025-26",
            status=PayrollStatutoryDeclarationStatus.LOCKED,
            tax_regime=PayrollTaxRegime.OLD,
            items=[
                ("80C", "PF", "Employee PF contribution", PayrollStatutoryDeclarationItemKind.INVESTMENT, "78000.00", "78000.00", PayrollStatutoryProofStatus.VERIFIED),
                ("80D", "MEDICAL", "Medical insurance premium", PayrollStatutoryDeclarationItemKind.DEDUCTION, "21000.00", "21000.00", PayrollStatutoryProofStatus.VERIFIED),
            ],
        )
        return profile, [current, historical]

    def _seed_declaration(self, *, tenant, employee, profile, pack, financial_year_code, status, tax_regime, items):
        now = timezone.now()
        declaration, _ = EmployeeStatutoryDeclaration.objects.update_or_create(
            tenant=tenant,
            employee=employee,
            financial_year_code=financial_year_code,
            declaration_profile_ref="payroll.statutory.declaration.india.demo.v1",
            defaults={
                "employee_statutory_profile": profile,
                "statutory_pack": pack,
                "proof_window_ref": "apr-to-jan-proof-window",
                "status": PayrollStatutoryDeclarationStatus.DRAFT,
                "tax_regime": tax_regime,
                "submitted_at": None,
                "submitted_by": None,
                "verified_at": None,
                "verified_by": None,
                "locked_at": None,
                "locked_by": None,
                "rejection_reason": "",
                "source_ref": f"{SEED_REF}:declaration:{employee.employee_code}:{financial_year_code}",
                "config_snapshot": {"seed_ref": SEED_REF, "surface": "ess_statutory"},
            },
        )

        EmployeeStatutoryDeclarationItem.objects.filter(declaration=declaration, config_snapshot__seed_ref=SEED_REF).delete()
        declared_total = Decimal("0.00")
        verified_total = Decimal("0.00")
        for section, component, name, item_kind, declared, verified, proof_status in items:
            declared_amount = Decimal(declared)
            verified_amount = Decimal(verified)
            declared_total += declared_amount
            verified_total += verified_amount
            proof_ref = f"proof:{employee.employee_code}:{financial_year_code}:{section}:{component}"
            EmployeeStatutoryDeclarationItem.objects.create(
                tenant=tenant,
                declaration=declaration,
                employee=employee,
                item_kind=item_kind,
                section_code=section,
                component_code=component,
                name=name,
                declared_amount=declared_amount,
                verified_amount=verified_amount,
                proof_status=proof_status,
                proof_document_ref="" if proof_status == PayrollStatutoryProofStatus.PENDING else proof_ref,
                proof_artifact_key="" if proof_status == PayrollStatutoryProofStatus.PENDING else f"ess-demo/{proof_ref}",
                proof_submitted_at=now if proof_status in {PayrollStatutoryProofStatus.SUBMITTED, PayrollStatutoryProofStatus.VERIFIED} else None,
                verified_at=now if proof_status == PayrollStatutoryProofStatus.VERIFIED else None,
                source_ref=f"{SEED_REF}:item:{employee.employee_code}:{financial_year_code}:{section}:{component}",
                config_snapshot={"seed_ref": SEED_REF},
            )

        declaration.declared_total_amount = declared_total
        declaration.verified_total_amount = verified_total
        if status in {
            PayrollStatutoryDeclarationStatus.SUBMITTED,
            PayrollStatutoryDeclarationStatus.VERIFIED,
            PayrollStatutoryDeclarationStatus.LOCKED,
        }:
            declaration.submitted_at = now
        if status in {PayrollStatutoryDeclarationStatus.VERIFIED, PayrollStatutoryDeclarationStatus.LOCKED}:
            declaration.verified_at = now
        if status == PayrollStatutoryDeclarationStatus.LOCKED:
            declaration.locked_at = now
        declaration.status = status
        declaration.save()
        return declaration
