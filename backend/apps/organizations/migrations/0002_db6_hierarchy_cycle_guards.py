from django.db import migrations


FORWARD_SQL = r"""
CREATE OR REPLACE FUNCTION enforce_business_unit_hierarchy_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    parent_tenant uuid;
    creates_cycle boolean;
BEGIN
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT tenant_id INTO parent_tenant
    FROM organizations_businessunit
    WHERE id = NEW.parent_id;

    IF parent_tenant IS NULL OR parent_tenant <> NEW.tenant_id THEN
        RAISE EXCEPTION 'business unit parent must belong to the same tenant';
    END IF;

    WITH RECURSIVE ancestors(id, parent_id) AS (
        SELECT id, parent_id FROM organizations_businessunit WHERE id = NEW.parent_id
        UNION
        SELECT item.id, item.parent_id
        FROM organizations_businessunit item
        JOIN ancestors ON item.id = ancestors.parent_id
    )
    SELECT EXISTS(SELECT 1 FROM ancestors WHERE id = NEW.id) INTO creates_cycle;

    IF creates_cycle THEN
        RAISE EXCEPTION 'business unit organization hierarchy cycle is not allowed';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS business_unit_hierarchy_integrity_guard ON organizations_businessunit;
CREATE TRIGGER business_unit_hierarchy_integrity_guard
BEFORE INSERT OR UPDATE OF parent_id, tenant_id ON organizations_businessunit
FOR EACH ROW EXECUTE FUNCTION enforce_business_unit_hierarchy_integrity();

CREATE OR REPLACE FUNCTION enforce_department_hierarchy_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    parent_tenant uuid;
    creates_cycle boolean;
BEGIN
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT tenant_id INTO parent_tenant
    FROM organizations_department
    WHERE id = NEW.parent_id;

    IF parent_tenant IS NULL OR parent_tenant <> NEW.tenant_id THEN
        RAISE EXCEPTION 'department parent must belong to the same tenant';
    END IF;

    WITH RECURSIVE ancestors(id, parent_id) AS (
        SELECT id, parent_id FROM organizations_department WHERE id = NEW.parent_id
        UNION
        SELECT item.id, item.parent_id
        FROM organizations_department item
        JOIN ancestors ON item.id = ancestors.parent_id
    )
    SELECT EXISTS(SELECT 1 FROM ancestors WHERE id = NEW.id) INTO creates_cycle;

    IF creates_cycle THEN
        RAISE EXCEPTION 'department organization hierarchy cycle is not allowed';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS department_hierarchy_integrity_guard ON organizations_department;
CREATE TRIGGER department_hierarchy_integrity_guard
BEFORE INSERT OR UPDATE OF parent_id, tenant_id ON organizations_department
FOR EACH ROW EXECUTE FUNCTION enforce_department_hierarchy_integrity();
"""


REVERSE_SQL = r"""
DROP TRIGGER IF EXISTS department_hierarchy_integrity_guard ON organizations_department;
DROP FUNCTION IF EXISTS enforce_department_hierarchy_integrity();
DROP TRIGGER IF EXISTS business_unit_hierarchy_integrity_guard ON organizations_businessunit;
DROP FUNCTION IF EXISTS enforce_business_unit_hierarchy_integrity();
"""


class Migration(migrations.Migration):
    dependencies = [("organizations", "0001_initial")]

    operations = [migrations.RunSQL(FORWARD_SQL, REVERSE_SQL)]
