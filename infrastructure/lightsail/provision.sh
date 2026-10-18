#!/usr/bin/env bash
set -Eeuo pipefail

REGION="${AWS_REGION:-ap-south-1}"
INSTANCE_NAME="${INSTANCE_NAME:-saas-staging-01}"
STATIC_IP_NAME="${STATIC_IP_NAME:-${INSTANCE_NAME}-ip}"
KEY_PAIR_NAME="${KEY_PAIR_NAME:-${INSTANCE_NAME}-operator}"
USE_EXISTING_KEY_PAIR="${USE_EXISTING_KEY_PAIR:-false}"

: "${BLUEPRINT_ID:?Set BLUEPRINT_ID from the authenticated preflight output.}"
: "${BUNDLE_ID:?Set BUNDLE_ID from the authenticated preflight output.}"
: "${AVAILABILITY_ZONE:?Set AVAILABILITY_ZONE from the authenticated preflight output.}"
: "${SSH_SOURCE_CIDR:?Set SSH_SOURCE_CIDR to the approved operator address, normally x.x.x.x/32.}"

if [[ "${CONFIRM_CREATE:-}" != "$INSTANCE_NAME" ]]; then
  echo "REFUSED: this creates billable AWS resources." >&2
  echo "After review and explicit approval, set CONFIRM_CREATE=$INSTANCE_NAME." >&2
  exit 64
fi

if [[ "$USE_EXISTING_KEY_PAIR" != true ]]; then
  : "${SSH_PUBLIC_KEY_FILE:?Set SSH_PUBLIC_KEY_FILE to an existing public key.}"
  if [[ ! -f "$SSH_PUBLIC_KEY_FILE" ]]; then
    echo "ERROR: SSH public key does not exist: $SSH_PUBLIC_KEY_FILE" >&2
    exit 66
  fi
  if [[ "$SSH_PUBLIC_KEY_FILE" == *.pem ]]; then
    echo "ERROR: provide a public key, never a private .pem file." >&2
    exit 65
  fi
fi
if [[ ! "$SSH_SOURCE_CIDR" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}/(32|[12]?[0-9]|3[01])$ ]]; then
  echo "ERROR: SSH_SOURCE_CIDR must be an IPv4 CIDR." >&2
  exit 65
fi

AWS=(aws --no-cli-pager --region "$REGION")
if [[ -n "${AWS_PROFILE:-}" ]]; then
  AWS+=(--profile "$AWS_PROFILE")
fi

for command_name in aws awk sed; do
  command -v "$command_name" >/dev/null 2>&1 || {
    echo "ERROR: required command '$command_name' is not installed." >&2
    exit 1
  }
done

"${AWS[@]}" sts get-caller-identity >/dev/null

blueprint_match="$("${AWS[@]}" lightsail get-blueprints --include-inactive \
  --query "blueprints[?blueprintId=='${BLUEPRINT_ID}' && blueprintId==\`ubuntu_24_04\` && isActive==\`true\` && platform==\`LINUX_UNIX\`] | length(@)" --output text)"
bundle_match="$("${AWS[@]}" lightsail get-bundles --include-inactive \
  --query "bundles[?bundleId=='${BUNDLE_ID}' && isActive==\`true\` && ramSizeInGb==\`4\` && diskSizeInGb==\`80\` && !contains(bundleId, \`ipv6\`)] | length(@)" --output text)"
if [[ "$blueprint_match" != "1" || "$bundle_match" != "1" ]]; then
  echo "ERROR: blueprint or bundle no longer matches the reviewed target." >&2
  exit 65
fi

existing="$("${AWS[@]}" lightsail get-instances --query "instances[?name=='${INSTANCE_NAME}'].name | [0]" --output text)"
if [[ "$existing" != "None" && -n "$existing" ]]; then
  echo "ERROR: instance '$INSTANCE_NAME' already exists." >&2
  exit 73
fi

if [[ "$USE_EXISTING_KEY_PAIR" != true ]]; then
  public_key_material="$(awk '$1 == "ssh-rsa" {print $2}' "$SSH_PUBLIC_KEY_FILE")"
  if [[ -z "$public_key_material" ]]; then
    echo "ERROR: SSH public key must use the ssh-rsa format supported by Lightsail import." >&2
    exit 65
  fi

  "${AWS[@]}" lightsail import-key-pair \
    --key-pair-name "$KEY_PAIR_NAME" \
    --public-key-base64 "$public_key_material" >/dev/null
  imported_key_pair=true
else
  "${AWS[@]}" lightsail get-key-pair --key-pair-name "$KEY_PAIR_NAME" >/dev/null
  imported_key_pair=false
fi

instance_created=false
cleanup() {
  exit_code=$?
  if [[ $exit_code -ne 0 && "$instance_created" == false && "$imported_key_pair" == true ]]; then
    "${AWS[@]}" lightsail delete-key-pair --key-pair-name "$KEY_PAIR_NAME" >/dev/null 2>&1 || true
  fi
  if [[ $exit_code -ne 0 && "$instance_created" == true ]]; then
    echo "ERROR: provisioning failed after instance creation." >&2
    echo "Inspect instance, static IP, ports, and key pair before any approved cleanup; billable resources may exist." >&2
  fi
  exit "$exit_code"
}
trap cleanup EXIT

user_data="$(sed "s|__SSH_SOURCE_CIDR__|$SSH_SOURCE_CIDR|g" "$(dirname "$0")/user-data.sh")"
"${AWS[@]}" lightsail create-instances \
  --instance-names "$INSTANCE_NAME" \
  --availability-zone "$AVAILABILITY_ZONE" \
  --blueprint-id "$BLUEPRINT_ID" \
  --bundle-id "$BUNDLE_ID" \
  --key-pair-name "$KEY_PAIR_NAME" \
  --user-data "$user_data" >/dev/null
instance_created=true

for attempt in {1..60}; do
  instance_state="$("${AWS[@]}" lightsail get-instance \
    --instance-name "$INSTANCE_NAME" --query 'instance.state.name' --output text)"
  if [[ "$instance_state" == running ]]; then
    break
  fi
  if [[ "$instance_state" == stopped || "$instance_state" == terminated ]]; then
    echo "ERROR: instance entered unexpected state '$instance_state'." >&2
    exit 70
  fi
  if [[ "$attempt" == 60 ]]; then
    echo "ERROR: instance did not become running within five minutes." >&2
    exit 70
  fi
  sleep 5
done
"${AWS[@]}" lightsail allocate-static-ip --static-ip-name "$STATIC_IP_NAME" >/dev/null
"${AWS[@]}" lightsail attach-static-ip \
  --static-ip-name "$STATIC_IP_NAME" --instance-name "$INSTANCE_NAME" >/dev/null

"${AWS[@]}" lightsail put-instance-public-ports \
  --instance-name "$INSTANCE_NAME" \
  --port-infos \
    "fromPort=22,toPort=22,protocol=tcp,cidrs=${SSH_SOURCE_CIDR}" \
    'fromPort=80,toPort=80,protocol=tcp,cidrs=0.0.0.0/0,ipv6Cidrs=::/0' \
    'fromPort=443,toPort=443,protocol=tcp,cidrs=0.0.0.0/0,ipv6Cidrs=::/0' >/dev/null

trap - EXIT

"${AWS[@]}" lightsail get-instance --instance-name "$INSTANCE_NAME" \
  --query 'instance.{name:name,state:state.name,zone:location.availabilityZone,blueprint:blueprintId,bundle:bundleId,publicIp:publicIpAddress}' \
  --output table
echo "Created billable instance. Validate cloud-init before deploying any application."
