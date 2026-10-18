# Lightsail staging host

This directory prepares, but does not authorize, an AWS Lightsail staging host for Finacc, GST, and HRMS/Payroll.

## Provisioned host

| Setting | Proposed value |
| --- | --- |
| Region | `ap-south-1` (Mumbai) |
| Instance | `saas-staging-01` (running) |
| OS | Ubuntu 24.04 LTS, discovered from the live Lightsail catalog |
| Bundle | Linux public-IPv4, 2 vCPU, 4 GB RAM, 80 GB SSD |
| Workload | Synthetic functional staging only |
| Payroll | Real payroll remains disabled / NO-GO |
| Availability zone | `ap-south-1a` |
| Static public IP | `65.0.231.86` |
| SSH key | `~/.ssh/saas-staging-01_lightsail.pem` (mode `600`) |

The published bundle price is USD 24/month. At a planning exchange rate of INR 90/USD this is approximately INR 2,160/month before tax, or INR 2,549 including 18% GST. AWS billing exchange rates and taxes control the actual invoice. An attached static IPv4 address has no additional charge; an unattached address held for more than one hour is USD 0.005/hour. Snapshots are incremental and USD 0.05/GB-month. Domain registration, email, object storage, excess transfer, monitoring services, and taxes are not included.

Mumbai receives half the transfer allowance shown for a Lightsail bundle, so the nominal 4 TB allowance is 2 TB in this region. Lightsail continues billing stopped instances until they are deleted.

## Phase 1 status

Read-only inspection on 2026-10-18 established:

- AWS CLI v2.38.1 is installed on the operator workstation.
- Named profile `lightsail-staging` authenticates as IAM user `lightsail-staging-operator` in account `227022022984`; it has no console password.
- The inline policy permits Lightsail operations only when `aws:RequestedRegion` is `ap-south-1`, plus read-only Lightsail service-quota inspection.
- Live Ubuntu blueprint: `ubuntu_24_04` (`24.04 LTS`, active).
- Live public-IPv4 Linux bundle: `medium_3_1` (USD 24/month, 2 vCPU, 4 GB RAM, 80 GB SSD, 2 TB Mumbai transfer, active).
- Mumbai availability zones `ap-south-1a`, `ap-south-1b`, and `ap-south-1c` are available.
- Pre-provisioning inventory found no Lightsail instances, static IPs, snapshots, or `saas-staging-01` naming conflict.
- Account quotas expose 10 Lightsail instance vCPUs and 5 static IPs in Mumbai.
- AWS Budgets visibility is not granted to the operator. The account owner must independently confirm or create an account budget before provisioning.
- Candidate operator source address was `49.43.106.137/32`; confirm that this is still correct before provisioning.
- After explicit approval, `saas-staging-01` and attached static IP `65.0.231.86` were created on 2026-10-18. No application containers or customer data were deployed.

## Provisioning verification

- Ubuntu 24.04.4 LTS, Docker 29.9.1, and Docker Compose 5.6.0 are installed.
- The non-root `deploy` user can access Docker and owns `/srv/saas` with mode `750`.
- Lightsail and UFW both restrict SSH to `49.43.106.137/32`; only ports 80 and 443 are public.
- SSH password authentication and root login are disabled.
- Docker, fail2ban, chrony, and unattended-upgrades are active.
- Docker log rotation and live restore are configured.
- Root disk usage was 2.7 GB of 77 GB and memory usage was 568 MiB of 3.7 GiB immediately after bootstrap.
- Zero containers were running after provisioning.
- Initial cloud-init stopped before package installation because Lightsail invoked Bash-specific `pipefail` through `/bin/sh`. The bootstrap was converted to POSIX shell, executed successfully over SSH, and its completion marker verified. The reusable script now contains the corrected behavior.
- No DNS, TLS certificate, application deployment, database, backup, or monitoring service has been configured yet.

## Read-only preflight

Install AWS CLI v2 and configure a least-privileged profile outside the repository. Do not store access keys in files under source control.

```bash
AWS_PROFILE=<profile> \
AWS_REGION=ap-south-1 \
INSTANCE_NAME=saas-staging-01 \
./infrastructure/lightsail/preflight.sh \
  | tee lightsail-preflight.txt
```

The preflight prints caller identity, relevant Lightsail permissions/catalog entries, existing instances/IPs/snapshots, a name-conflict check, service quotas when available, and AWS Budgets visibility. It is read-only. Review the output and record the selected `BLUEPRINT_ID`, `BUNDLE_ID`, availability zone, SSH public key, and current operator CIDR.

## Billable provisioning gate

Provisioning is deliberately separated from preflight and requires an exact confirmation value:

```bash
AWS_PROFILE=<profile> \
AWS_REGION=ap-south-1 \
INSTANCE_NAME=saas-staging-01 \
BLUEPRINT_ID=<live-ubuntu-24.04-id> \
BUNDLE_ID=<live-4gb-80gb-id> \
AVAILABILITY_ZONE=<verified-ap-south-1-zone> \
SSH_PUBLIC_KEY_FILE="$HOME/.ssh/saas-staging.pub" \
SSH_SOURCE_CIDR=<current-public-ip>/32 \
CONFIRM_CREATE=saas-staging-01 \
./infrastructure/lightsail/provision.sh
```

Do not run that command until the account inventory and estimated charges have been reviewed and the owner has explicitly approved creation. The script creates billable resources. It imports only a public key, creates the instance, allocates and attaches one static IP, and restricts inbound traffic to SSH from the approved CIDR plus public HTTP/HTTPS. It does not deploy applications.

## Host bootstrap

`user-data.sh` creates a non-root `deploy` account, enables unattended security updates, installs Docker Engine/Compose from Docker's Ubuntu repository, enables UFW and fail2ban, and applies Docker log rotation. It opens only ports 22, 80, and 443 locally. Lightsail networking must enforce the same policy.

Run application stacks with separate Compose projects, databases/users, Redis namespaces or instances, volumes, secrets, hostnames, and CPU/memory limits. The 4 GB host is suitable only for low-traffic functional QA with coordinated use. Do not run load tests or all three builds concurrently.

## Capacity and upgrade path

- Initial: 2 vCPU / 4 GB / 80 GB at USD 24/month.
- Next step: 2 vCPU / 8 GB / 160 GB at USD 44/month.
- Heavier shared staging: 4 vCPU / 16 GB / 320 GB at USD 84/month.
- Capacity certification remains a temporary isolated Tier B workload, not this host.

Monitor disk, memory, swap, CPU steal, container restarts, PostgreSQL connections, Redis memory, and Celery backlog. Upgrade before sustained memory exceeds 75%, disk exceeds 70%, or CPU/queue saturation disrupts interactive QA.

## Backup and recovery boundary

Before application deployment, define encrypted off-host backups for every PostgreSQL database and protected artifact store. Lightsail snapshots are useful for host recovery but are not the only database backup. Schedule logical database backups, encrypt them client-side or with approved KMS controls, copy them off-host, define retention only after policy approval, and execute a disposable restore test. Never put backup credentials or payroll/document data in Git.

## Security boundary

- Use unique externally injected secrets for every product and environment.
- Terminate TLS with Nginx or Caddy and redirect HTTP to HTTPS.
- Keep PostgreSQL, Redis, Django, Celery, and internal application ports unexposed.
- Keep HRMS synthetic-only until external security, storage, email/provider, policy, and release gates pass.
- Keep irreversible erasure and real payments disabled.
- Do not share production credentials or customer data with this host.

## Rollback and teardown

Application rollback means selecting the previously approved immutable image digest and rerunning the product-specific deployment validation. Infrastructure teardown requires verified backups, explicit approval, instance deletion, static-IP release, imported-key review, DNS cleanup, and confirmation that no unattached billable resources remain. Never treat `stop-instance` as a cost-control teardown.
