#!/usr/bin/env bash
# =============================================================================
# NT219 Crypto Capstone — Istio Installation on K3s
# Week 2: Install Istio service mesh for automatic mTLS
#
# Prerequisites:
#   - K3s running (docker compose up -d)
#   - kubectl configured (export KUBECONFIG=./k3s/kubeconfig.yaml)
#
# Usage:
#   export KUBECONFIG=$(pwd)/infra/k3s/kubeconfig.yaml
#   bash infra/k3s/install-istio.sh
#
# What this does:
#   1. Downloads istioctl (if not present)
#   2. Installs Istio with 'demo' profile
#   3. Labels default namespace for sidecar injection
#   4. Applies mTLS policies (STRICT mode)
#   5. Verifies installation
# =============================================================================

set -euo pipefail

ISTIO_VERSION="${ISTIO_VERSION:-1.22.3}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ISTIO_DIR="${SCRIPT_DIR}/istio-${ISTIO_VERSION}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}==> $*${NC}"; }
pass()  { echo -e "${GREEN}  ✓ $*${NC}"; }
warn()  { echo -e "${YELLOW}  ! $*${NC}"; }
fail()  { echo -e "${RED}  ✗ $*${NC}"; exit 1; }

# ---------------------------------------------------------------------------
# Step 1: Download istioctl
# ---------------------------------------------------------------------------

info "[1/6] Checking istioctl..."

if command -v istioctl &> /dev/null; then
  INSTALLED_VERSION=$(istioctl version --remote=false 2>/dev/null || echo "unknown")
  pass "istioctl already installed (version: ${INSTALLED_VERSION})"
else
  info "Downloading Istio ${ISTIO_VERSION}..."
  
  OS=$(uname -s | tr '[:upper:]' '[:lower:]')
  ARCH=$(uname -m)
  case "$ARCH" in
    x86_64)  ARCH="amd64" ;;
    aarch64|arm64) ARCH="arm64" ;;
  esac
  
  DOWNLOAD_URL="https://github.com/istio/istio/releases/download/${ISTIO_VERSION}/istioctl-${ISTIO_VERSION}-${OS}-${ARCH}.tar.gz"
  
  curl -sL "$DOWNLOAD_URL" | tar xz -C /tmp/
  chmod +x /tmp/istioctl
  
  # Try to move to /usr/local/bin, fall back to local
  if sudo mv /tmp/istioctl /usr/local/bin/istioctl 2>/dev/null; then
    pass "istioctl installed to /usr/local/bin/"
  else
    mkdir -p "${SCRIPT_DIR}/bin"
    mv /tmp/istioctl "${SCRIPT_DIR}/bin/istioctl"
    export PATH="${SCRIPT_DIR}/bin:$PATH"
    pass "istioctl installed to ${SCRIPT_DIR}/bin/"
    warn "Add to PATH: export PATH=${SCRIPT_DIR}/bin:\$PATH"
  fi
fi

echo ""

# ---------------------------------------------------------------------------
# Step 2: Verify K3s connectivity
# ---------------------------------------------------------------------------

info "[2/6] Verifying K3s cluster connectivity..."

if ! kubectl cluster-info &> /dev/null; then
  fail "Cannot connect to K3s cluster. Is it running? Check KUBECONFIG."
fi

NODE_STATUS=$(kubectl get nodes --no-headers 2>/dev/null | awk '{print $2}')
if [[ "$NODE_STATUS" == "Ready" ]]; then
  pass "K3s cluster is ready."
else
  warn "K3s node status: ${NODE_STATUS} — may need more time to initialize"
fi

echo ""

# ---------------------------------------------------------------------------
# Step 3: Install Istio
# ---------------------------------------------------------------------------

info "[3/6] Installing Istio (demo profile)..."

# The 'demo' profile includes:
# - istiod (control plane)
# - istio-ingressgateway
# - istio-egressgateway
# It enables mTLS in PERMISSIVE mode by default (we'll switch to STRICT)

istioctl install --set profile=demo -y \
  --set meshConfig.accessLogFile=/dev/stdout \
  --set meshConfig.defaultConfig.holdApplicationUntilProxyStarts=true

pass "Istio installed successfully."
echo ""

# ---------------------------------------------------------------------------
# Step 4: Enable sidecar injection
# ---------------------------------------------------------------------------

info "[4/6] Enabling automatic sidecar injection on 'default' namespace..."

kubectl label namespace default istio-injection=enabled --overwrite
pass "Namespace 'default' labeled for sidecar injection."

echo ""

# ---------------------------------------------------------------------------
# Step 5: Apply mTLS policies
# ---------------------------------------------------------------------------

info "[5/6] Applying mTLS and authorization policies..."

ISTIO_CONFIG_DIR="${SCRIPT_DIR}/istio"

if [ -d "$ISTIO_CONFIG_DIR" ]; then
  kubectl apply -f "${ISTIO_CONFIG_DIR}/peer-authentication.yaml"
  pass "PeerAuthentication (STRICT mTLS) applied."
  
  kubectl apply -f "${ISTIO_CONFIG_DIR}/destination-rules.yaml"
  pass "DestinationRules applied."
  
  kubectl apply -f "${ISTIO_CONFIG_DIR}/authorization-policies.yaml"
  pass "AuthorizationPolicies applied."
else
  warn "Istio config directory not found at ${ISTIO_CONFIG_DIR}"
  warn "Apply policies manually after creating YAML files."
fi

echo ""

# ---------------------------------------------------------------------------
# Step 6: Verify installation
# ---------------------------------------------------------------------------

info "[6/6] Verifying Istio installation..."

echo ""
echo "  Istio components:"
kubectl get pods -n istio-system --no-headers 2>/dev/null | while read -r line; do
  NAME=$(echo "$line" | awk '{print $1}')
  STATUS=$(echo "$line" | awk '{print $3}')
  if [[ "$STATUS" == "Running" ]]; then
    echo -e "    ${GREEN}✓ ${NAME} (${STATUS})${NC}"
  else
    echo -e "    ${YELLOW}? ${NAME} (${STATUS})${NC}"
  fi
done

echo ""

# Run istioctl analyze
echo "  Analysis:"
istioctl analyze 2>&1 | while read -r line; do
  echo "    $line"
done

echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  Istio installation complete!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo "  Verify mTLS:"
echo "    istioctl proxy-config cluster <pod-name>.default"
echo "    istioctl authn tls-check <pod-name>.default"
echo ""
echo "  Dashboard (optional):"
echo "    istioctl dashboard kiali"
echo ""
echo "  NOTE: Deploy services into 'default' namespace for auto sidecar injection."
echo "  Each pod will get an Envoy sidecar that handles mTLS transparently."
echo ""
