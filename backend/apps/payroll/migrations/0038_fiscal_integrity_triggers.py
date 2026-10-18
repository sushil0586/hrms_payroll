from django.db import migrations


def install_fiscal_guards(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute(
        """
        CREATE OR REPLACE FUNCTION payroll_reject_fiscal_overlap()
        RETURNS trigger AS $$
        BEGIN
            IF TG_TABLE_NAME = 'payroll_fiscalyear' THEN
                IF EXISTS (
                    SELECT 1 FROM payroll_fiscalyear x
                    WHERE x.calendar_id = NEW.calendar_id AND x.id <> NEW.id
                      AND daterange(x.start_date, x.end_date, '[]') && daterange(NEW.start_date, NEW.end_date, '[]')
                ) THEN RAISE EXCEPTION 'fiscal years cannot overlap' USING ERRCODE = '23P01'; END IF;
            ELSE
                IF EXISTS (
                    SELECT 1 FROM payroll_accountingperiod x
                    WHERE x.fiscal_year_id = NEW.fiscal_year_id AND x.id <> NEW.id
                      AND daterange(x.start_date, x.end_date, '[]') && daterange(NEW.start_date, NEW.end_date, '[]')
                ) THEN RAISE EXCEPTION 'accounting periods cannot overlap' USING ERRCODE = '23P01'; END IF;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER guard_fiscal_year_overlap
        BEFORE INSERT OR UPDATE OF calendar_id, start_date, end_date ON payroll_fiscalyear
        FOR EACH ROW EXECUTE FUNCTION payroll_reject_fiscal_overlap();

        CREATE TRIGGER guard_accounting_period_overlap
        BEFORE INSERT OR UPDATE OF fiscal_year_id, start_date, end_date ON payroll_accountingperiod
        FOR EACH ROW EXECUTE FUNCTION payroll_reject_fiscal_overlap();
        """
    )
    schema_editor.execute(
        """
        CREATE OR REPLACE FUNCTION payroll_guard_accounting_period_change()
        RETURNS trigger AS $$
        BEGIN
            IF OLD.status IS DISTINCT FROM NEW.status AND
               COALESCE(current_setting('hrms.accounting_period_transition', true), '') <> 'authorized' THEN
                RAISE EXCEPTION 'accounting period status changes require the audited transition service'
                    USING ERRCODE = '55000';
            END IF;
            IF (OLD.start_date, OLD.end_date, OLD.fiscal_year_id) IS DISTINCT FROM
               (NEW.start_date, NEW.end_date, NEW.fiscal_year_id) AND
               (EXISTS (SELECT 1 FROM payroll_payrollrun r WHERE r.earning_accounting_period_id = OLD.id OR r.payment_accounting_period_id = OLD.id)
                OR EXISTS (SELECT 1 FROM payroll_payrollfinancehandoff h WHERE h.posting_accounting_period_id = OLD.id)) THEN
                RAISE EXCEPTION 'referenced accounting period boundaries are immutable' USING ERRCODE = '55000';
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        CREATE TRIGGER guard_accounting_period_change
        BEFORE UPDATE ON payroll_accountingperiod
        FOR EACH ROW EXECUTE FUNCTION payroll_guard_accounting_period_change();

        CREATE OR REPLACE FUNCTION payroll_guard_period_event_append_only()
        RETURNS trigger AS $$ BEGIN
            RAISE EXCEPTION 'accounting period status events are append-only' USING ERRCODE = '55000';
        END; $$ LANGUAGE plpgsql;
        CREATE TRIGGER guard_accounting_period_event_append_only
        BEFORE UPDATE OR DELETE ON payroll_accountingperiodstatusevent
        FOR EACH ROW EXECUTE FUNCTION payroll_guard_period_event_append_only();
        """
    )
    schema_editor.execute(
        """
        CREATE OR REPLACE FUNCTION payroll_guard_finance_posting_period()
        RETURNS trigger AS $$
        DECLARE period_status text;
        BEGIN
            IF NEW.status IN ('transmitted', 'accepted') AND OLD.status IS DISTINCT FROM NEW.status THEN
                IF NEW.posting_accounting_period_id IS NULL THEN
                    IF EXISTS (SELECT 1 FROM payroll_fiscalcalendar c WHERE c.tenant_id = NEW.tenant_id AND c.status = 'active') THEN
                        RAISE EXCEPTION 'finance posting requires an accounting period' USING ERRCODE = '23514';
                    END IF;
                ELSE
                    SELECT status INTO period_status FROM payroll_accountingperiod
                    WHERE id = NEW.posting_accounting_period_id FOR SHARE;
                    IF period_status IS DISTINCT FROM 'open' THEN
                        RAISE EXCEPTION 'finance posting accounting period is not open' USING ERRCODE = '23514';
                    END IF;
                END IF;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        CREATE TRIGGER guard_finance_posting_period
        BEFORE UPDATE OF status ON payroll_payrollfinancehandoff
        FOR EACH ROW EXECUTE FUNCTION payroll_guard_finance_posting_period();
        """
    )


def remove_fiscal_guards(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    statements = [
        "DROP TRIGGER IF EXISTS guard_finance_posting_period ON payroll_payrollfinancehandoff",
        "DROP TRIGGER IF EXISTS guard_accounting_period_event_append_only ON payroll_accountingperiodstatusevent",
        "DROP TRIGGER IF EXISTS guard_accounting_period_change ON payroll_accountingperiod",
        "DROP TRIGGER IF EXISTS guard_accounting_period_overlap ON payroll_accountingperiod",
        "DROP TRIGGER IF EXISTS guard_fiscal_year_overlap ON payroll_fiscalyear",
        "DROP FUNCTION IF EXISTS payroll_guard_finance_posting_period()",
        "DROP FUNCTION IF EXISTS payroll_guard_period_event_append_only()",
        "DROP FUNCTION IF EXISTS payroll_guard_accounting_period_change()",
        "DROP FUNCTION IF EXISTS payroll_reject_fiscal_overlap()",
    ]
    for statement in statements:
        schema_editor.execute(statement)


class Migration(migrations.Migration):
    dependencies = [("payroll", "0037_payrollfinancehandoff_posting_date_and_more")]
    operations = [migrations.RunPython(install_fiscal_guards, remove_fiscal_guards)]
