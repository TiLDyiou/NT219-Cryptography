# Vault Policy: catalog-service
# Catalog Service has read-only access to its own secrets
# No access to transit engine, payment secrets, or other services' data

# Catalog-specific secrets (DB credentials, etc.)
path "secret/data/catalog/*" {
  capabilities = ["read"]
}

# Deny everything else
path "*" {
  capabilities = ["deny"]
}
