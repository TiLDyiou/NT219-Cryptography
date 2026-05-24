# Vault Policy: shipping-service
# Shipping Service envelope encryption, event signing, audit signatures, and carrier secrets

path "transit/encrypt/shipping-fle-key" {
  capabilities = ["update"]
}

path "transit/decrypt/shipping-fle-key" {
  capabilities = ["update"]
}

path "transit/rewrap/shipping-fle-key" {
  capabilities = ["update"]
}

path "transit/sign/shipping-sign-key" {
  capabilities = ["update"]
}

path "transit/verify/shipping-sign-key" {
  capabilities = ["update"]
}

path "transit/hmac/order-hmac-key" {
  capabilities = ["update"]
}

path "transit/verify/order-hmac-key" {
  capabilities = ["update"]
}

path "transit/hmac/shipping-audit-key" {
  capabilities = ["update"]
}

path "transit/verify/shipping-audit-key" {
  capabilities = ["update"]
}

path "secret/data/shipping/*" {
  capabilities = ["read"]
}

path "*" {
  capabilities = ["deny"]
}
