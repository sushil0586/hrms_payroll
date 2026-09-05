# Backend Apps

Each domain app should keep business logic modular and tenant-aware.

Recommended internal structure per app:

```text
app_name/
  admin.py
  apps.py
  models/
  api/
    serializers/
    views/
    urls.py
  services/
  selectors/
  tasks.py
  permissions.py
  tests/
```
