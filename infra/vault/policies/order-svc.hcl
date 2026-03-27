# Vault Policy: order-service
# Order Service can verify payment signatures and read its own secrets
# Cannot encrypt/decrypt payment data (only payment-service can do that)

# Verify order signatures (read-only — cannot sign, only verify)
path "transit/verify/order-sign-key" {
  capabilities = ["update"]
}

# Order service secrets
path "secret/data/order/*" {
  capabilities = ["read"]
}

# Deny everything else
path "*" {
  capabilities = ["deny"]
}
