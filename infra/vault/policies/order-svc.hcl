# Vault Policy: order-service
# Order Service envelope encryption, event signing, HMAC outbound requests

# Envelope Encryption (FLE) -- encrypt/decrypt DEKs
path "transit/encrypt/order-fle-key" {
  capabilities = ["update"]
}

path "transit/decrypt/order-fle-key" {
  capabilities = ["update"]
}

path "transit/rewrap/order-fle-key" {
  capabilities = ["update"]
}

# Digital Signature -- sign Kafka events and audit logs
path "transit/sign/order-sign-key" {
  capabilities = ["update"]
}

path "transit/verify/order-sign-key" {
  capabilities = ["update"]
}

# HMAC -- sign outbound sync requests
path "transit/hmac/order-hmac-key" {
  capabilities = ["update"]
}

path "transit/verify/order-hmac-key" {
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
