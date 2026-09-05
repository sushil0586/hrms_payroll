"""Reusable workflow and approval engine models."""

from django.db import models

from apps.common.models import TimeStampedModel, UUIDPrimaryKeyModel
from apps.iam.models import Role, ScopeType, TenantMembership
from apps.organizations.models import Branch, BusinessUnit, Department, Grade, LegalEntity
from apps.tenants.models import Tenant


class WorkflowModule(models.TextChoices):
    EMPLOYEES = "employees", "Employees"
    LIFECYCLE = "lifecycle", "Lifecycle"
    LEAVE = "leave", "Leave"
    ATTENDANCE = "attendance", "Attendance"
    DOCUMENTS = "documents", "Documents"
    CONFIG = "config", "Configuration"
    PAYROLL = "payroll", "Payroll"
    OTHER = "other", "Other"


class WorkflowStepMode(models.TextChoices):
    SEQUENTIAL = "sequential", "Sequential"
    PARALLEL = "parallel", "Parallel"


class WorkflowActorType(models.TextChoices):
    ROLE = "role", "Role"
    MEMBERSHIP = "membership", "Membership"
    MANAGER = "manager", "Manager"
    HR_OWNER = "hr_owner", "HR Owner"
    CONFIGURED_USER = "configured_user", "Configured User"


class WorkflowStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    ARCHIVED = "archived", "Archived"


class WorkflowInstanceStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PENDING = "pending", "Pending"
    IN_PROGRESS = "in_progress", "In Progress"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    CANCELLED = "cancelled", "Cancelled"
    COMPLETED = "completed", "Completed"


class WorkflowAction(models.TextChoices):
    SUBMIT = "submit", "Submit"
    APPROVE = "approve", "Approve"
    REJECT = "reject", "Reject"
    SEND_BACK = "send_back", "Send Back"
    ESCALATE = "escalate", "Escalate"
    DELEGATE = "delegate", "Delegate"
    CANCEL = "cancel", "Cancel"
    COMMENT = "comment", "Comment"


class WorkflowTemplate(UUIDPrimaryKeyModel, TimeStampedModel):
    """Reusable tenant-specific workflow definition."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="workflow_templates",
    )
    code = models.SlugField(max_length=60)
    name = models.CharField(max_length=255)
    module = models.CharField(max_length=30, choices=WorkflowModule.choices)
    trigger_key = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=WorkflowStatus.choices, default=WorkflowStatus.DRAFT)
    version = models.PositiveIntegerField(default=1)
    is_system_seeded = models.BooleanField(default=False)
    effective_from = models.DateField(blank=True, null=True)
    effective_to = models.DateField(blank=True, null=True)
    condition_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["module", "name"]
        unique_together = [("tenant", "code", "version")]
        verbose_name = "Workflow Template"
        verbose_name_plural = "Workflow Templates"

    def __str__(self) -> str:
        return f"{self.tenant.code}:{self.code}:v{self.version}"


class WorkflowStep(UUIDPrimaryKeyModel, TimeStampedModel):
    """Step definition within a workflow template."""

    template = models.ForeignKey(
        WorkflowTemplate,
        on_delete=models.CASCADE,
        related_name="steps",
    )
    step_order = models.PositiveIntegerField()
    name = models.CharField(max_length=255)
    mode = models.CharField(max_length=20, choices=WorkflowStepMode.choices, default=WorkflowStepMode.SEQUENTIAL)
    actor_type = models.CharField(max_length=20, choices=WorkflowActorType.choices, default=WorkflowActorType.ROLE)
    role = models.ForeignKey(
        Role,
        on_delete=models.SET_NULL,
        related_name="workflow_steps",
        blank=True,
        null=True,
    )
    membership = models.ForeignKey(
        TenantMembership,
        on_delete=models.SET_NULL,
        related_name="workflow_steps",
        blank=True,
        null=True,
    )
    permission_key = models.CharField(max_length=120, blank=True)
    scope_type = models.CharField(max_length=40, choices=ScopeType.choices, blank=True)
    auto_approve_after_hours = models.PositiveIntegerField(default=0)
    escalate_after_hours = models.PositiveIntegerField(default=0)
    allow_delegate = models.BooleanField(default=True)
    allow_send_back = models.BooleanField(default=True)
    allow_comment = models.BooleanField(default=True)
    rule_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["template", "step_order"]
        unique_together = [("template", "step_order")]
        verbose_name = "Workflow Step"
        verbose_name_plural = "Workflow Steps"

    def __str__(self) -> str:
        return f"{self.template.code} - Step {self.step_order}"


class WorkflowTemplateAssignment(UUIDPrimaryKeyModel, TimeStampedModel):
    """Assigns workflow templates to organization scopes."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="workflow_template_assignments",
    )
    template = models.ForeignKey(
        WorkflowTemplate,
        on_delete=models.CASCADE,
        related_name="assignments",
    )
    legal_entity = models.ForeignKey(
        LegalEntity,
        on_delete=models.CASCADE,
        related_name="workflow_template_assignments",
        blank=True,
        null=True,
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="workflow_template_assignments",
        blank=True,
        null=True,
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="workflow_template_assignments",
        blank=True,
        null=True,
    )
    business_unit = models.ForeignKey(
        BusinessUnit,
        on_delete=models.CASCADE,
        related_name="workflow_template_assignments",
        blank=True,
        null=True,
    )
    grade = models.ForeignKey(
        Grade,
        on_delete=models.CASCADE,
        related_name="workflow_template_assignments",
        blank=True,
        null=True,
    )
    priority = models.PositiveIntegerField(default=100)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["priority", "created_at"]
        verbose_name = "Workflow Template Assignment"
        verbose_name_plural = "Workflow Template Assignments"

    def __str__(self) -> str:
        return f"{self.template} -> {self.tenant.code}"


class WorkflowInstance(UUIDPrimaryKeyModel, TimeStampedModel):
    """Runtime instance of an approval workflow."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="workflow_instances",
    )
    template = models.ForeignKey(
        WorkflowTemplate,
        on_delete=models.SET_NULL,
        related_name="instances",
        blank=True,
        null=True,
    )
    module = models.CharField(max_length=30, choices=WorkflowModule.choices)
    trigger_key = models.CharField(max_length=120)
    subject_type = models.CharField(max_length=120)
    subject_identifier = models.CharField(max_length=120)
    employee_identifier = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=20, choices=WorkflowInstanceStatus.choices, default=WorkflowInstanceStatus.DRAFT)
    current_step_order = models.PositiveIntegerField(default=0)
    initiated_by_identifier = models.CharField(max_length=120, blank=True)
    submitted_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    payload_snapshot = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Workflow Instance"
        verbose_name_plural = "Workflow Instances"

    def __str__(self) -> str:
        return f"{self.module}:{self.subject_type}:{self.subject_identifier}"


class WorkflowStepInstance(UUIDPrimaryKeyModel, TimeStampedModel):
    """Runtime state for an individual step inside an instance."""

    workflow_instance = models.ForeignKey(
        WorkflowInstance,
        on_delete=models.CASCADE,
        related_name="step_instances",
    )
    template_step = models.ForeignKey(
        WorkflowStep,
        on_delete=models.SET_NULL,
        related_name="step_instances",
        blank=True,
        null=True,
    )
    step_order = models.PositiveIntegerField()
    name = models.CharField(max_length=255)
    mode = models.CharField(max_length=20, choices=WorkflowStepMode.choices, default=WorkflowStepMode.SEQUENTIAL)
    status = models.CharField(max_length=20, choices=WorkflowInstanceStatus.choices, default=WorkflowInstanceStatus.PENDING)
    started_at = models.DateTimeField(blank=True, null=True)
    due_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    resolved_action = models.CharField(max_length=20, choices=WorkflowAction.choices, blank=True)
    resolution_comment = models.TextField(blank=True)

    class Meta:
        ordering = ["workflow_instance", "step_order"]
        unique_together = [("workflow_instance", "step_order")]
        verbose_name = "Workflow Step Instance"
        verbose_name_plural = "Workflow Step Instances"

    def __str__(self) -> str:
        return f"{self.workflow_instance} - Step {self.step_order}"


class WorkflowAssignment(UUIDPrimaryKeyModel, TimeStampedModel):
    """Assignee snapshot for a workflow step instance."""

    step_instance = models.ForeignKey(
        WorkflowStepInstance,
        on_delete=models.CASCADE,
        related_name="assignments",
    )
    actor_type = models.CharField(max_length=20, choices=WorkflowActorType.choices)
    membership = models.ForeignKey(
        TenantMembership,
        on_delete=models.SET_NULL,
        related_name="workflow_assignments",
        blank=True,
        null=True,
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.SET_NULL,
        related_name="workflow_assignments",
        blank=True,
        null=True,
    )
    actor_identifier = models.CharField(max_length=120, blank=True)
    is_delegated = models.BooleanField(default=False)
    delegated_from_identifier = models.CharField(max_length=120, blank=True)
    responded_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["step_instance", "created_at"]
        verbose_name = "Workflow Assignment"
        verbose_name_plural = "Workflow Assignments"

    def __str__(self) -> str:
        return f"{self.step_instance} -> {self.actor_type}"


class WorkflowActionLog(UUIDPrimaryKeyModel, TimeStampedModel):
    """Audit log of all workflow actions."""

    workflow_instance = models.ForeignKey(
        WorkflowInstance,
        on_delete=models.CASCADE,
        related_name="action_logs",
    )
    step_instance = models.ForeignKey(
        WorkflowStepInstance,
        on_delete=models.SET_NULL,
        related_name="action_logs",
        blank=True,
        null=True,
    )
    action = models.CharField(max_length=20, choices=WorkflowAction.choices)
    actor_identifier = models.CharField(max_length=120, blank=True)
    comment = models.TextField(blank=True)
    from_status = models.CharField(max_length=20, choices=WorkflowInstanceStatus.choices, blank=True)
    to_status = models.CharField(max_length=20, choices=WorkflowInstanceStatus.choices, blank=True)
    payload = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Workflow Action Log"
        verbose_name_plural = "Workflow Action Logs"

    def __str__(self) -> str:
        return f"{self.workflow_instance} - {self.action}"
