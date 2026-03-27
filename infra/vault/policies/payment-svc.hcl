# Vault Policy: payment-service
# Payment Service is the most privileged microservice (PCI-DSS scope)
# It can encrypt/decrypt via the Transit engine (KMS emulator) and read payment secrets

# Transit engine — encrypt with payment key (for tokenization)
path "transit/encrypt/payment-key" {
  capabilities = ["update"]
}

# Transit engine — decrypt with payment key (for de-tokenization)
path "transit/decrypt/payment-key" {
  capabilities = ["update"]
}

# Transit engine — sign orders with ECDSA key (order integrity)
path "transit/sign/order-sign-key" {
  capabilities = ["update"]
}

# Transit engine — verify order signatures
path "transit/verify/order-sign-key" {
  capabilities = ["update"]
}

# Read key metadata (but NOT the key material itself)
path "transit/keys/payment-key" {
  capabilities = ["read"]
}

path "transit/keys/order-sign-key" {
  capabilities = ["read"]
}

# Payment secrets (Stripe API keys, webhook secrets)
path "secret/data/payment/*" {
  capabilities = ["read"]
}

# Deny everything else
path "*" {
  capabilities = ["deny"]
}
