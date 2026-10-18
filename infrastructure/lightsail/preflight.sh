#!/usr/bin/env bash
set -Eeuo pipefail

REGION="${AWS_REGION:-ap-south-1}"
INSTANCE_NAME="${INSTANCE_NAME:-saas-staging-01}"
AWS=(aws --no-cli-pager --region "$REGION")
AWS_GLOBAL=(aws --no-cli-pager --region us-east-1)

if [[ -n "${AWS_PROFILE:-}" ]]; then
  AWS+=(--profile "$AWS_PROFILE")
  AWS_GLOBAL+=(--profile "$AWS_PROFILE")
fi

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "ERROR: required command '$1' is not installed." >&2
    exit 1
  }
}

run_optional() {
  local label="$1"
  shift
  echo
  echo "## $label"
  if ! "$@"; then
    echo "WARN: unavailable or permission denied; this check must be resolved before provisioning." >&2
  fi
}

require_command aws
require_command sed

echo "Lightsail read-only preflight"
echo "region=$REGION"
echo "instance_name=$INSTANCE_NAME"
echo "profile=${AWS_PROFILE:-<default-provider-chain>}"
echo "aws_cli=$(aws --version 2>&1)"

echo
echo "## Caller identity (mandatory)"
"${AWS[@]}" sts get-caller-identity --output json

echo
echo "## Lightsail region availability (mandatory)"
"${AWS[@]}" lightsail get-regions --include-availability-zones \
  --query "regions[?name=='${REGION}'].[name,displayName,availabilityZones[].zoneName]" \
  --output json

echo
echo "## Active Ubuntu 24.04 Linux/Unix blueprints (mandatory)"
"${AWS[@]}" lightsail get-blueprints --include-inactive \
  --query "blueprints[?isActive==\`true\` && platform==\`LINUX_UNIX\` && blueprintId==\`ubuntu_24_04\`].[blueprintId,name,version,isActive]" \
  --output table

echo
echo "## Active 4 GB / 80 GB Linux public-IPv4 bundles (mandatory)"
"${AWS[@]}" lightsail get-bundles --include-inactive \
  --query "bundles[?isActive==\`true\` && supportedPlatforms[?@==\`LINUX_UNIX\`] && ramSizeInGb==\`4\` && diskSizeInGb==\`80\` && !contains(bundleId, \`ipv6\`)].[bundleId,name,price,cpuCount,ramSizeInGb,diskSizeInGb,transferPerMonthInGb,isActive]" \
  --output table

run_optional "Existing Lightsail instances" "${AWS[@]}" lightsail get-instances \
  --query 'instances[].{name:name,state:state.name,blueprint:blueprintId,bundle:bundleId,zone:location.availabilityZone,publicIp:publicIpAddress}' \
  --output table

echo
echo "## Instance name conflict (mandatory)"
existing_name="$("${AWS[@]}" lightsail get-instances --query "instances[?name=='${INSTANCE_NAME}'].name | [0]" --output text)"
if [[ "$existing_name" != "None" && -n "$existing_name" ]]; then
  echo "ERROR: instance name '$INSTANCE_NAME' already exists." >&2
  exit 2
fi
echo "No existing Lightsail instance named '$INSTANCE_NAME'."

run_optional "Existing static IPs" "${AWS[@]}" lightsail get-static-ips \
  --query 'staticIps[].{name:name,ip:ipAddress,attached:attachedTo,isAttached:isAttached}' \
  --output table
run_optional "Existing instance snapshots" "${AWS[@]}" lightsail get-instance-snapshots \
  --query 'instanceSnapshots[].{name:name,instance:fromInstanceName,sizeGb:sizeInGb,state:state,created:createdAt}' \
  --output table
run_optional "Account service quotas" "${AWS[@]}" service-quotas list-service-quotas \
  --service-code lightsail --output table

ACCOUNT_ID="$("${AWS[@]}" sts get-caller-identity --query Account --output text)"
run_optional "AWS Budgets visibility (global service queried in us-east-1)" \
  "${AWS_GLOBAL[@]}" \
  budgets describe-budgets --account-id "$ACCOUNT_ID" \
  --query 'Budgets[].{name:BudgetName,type:BudgetType,limit:BudgetLimit}' --output table

cat <<'EOF'

PRECHECK ONLY: no resource was created or modified.
Before approval, record and review:
  1. caller identity and least-privileged permissions;
  2. exact active Ubuntu 24.04 blueprint ID;
  3. exact active 4 GB / 80 GB bundle ID and live price;
  4. availability zone, existing resources, quotas, and budget alerts;
  5. SSH public key fingerprint and current operator /32 CIDR;
  6. explicit owner approval for billable creation.
EOF
