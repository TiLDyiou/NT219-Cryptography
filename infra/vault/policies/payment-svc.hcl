# Vault Policy: payment-service
# Payment Service is highly privileged (PCI-DSS scope)
# It handles transit encryption for FLE, signing, HMAC, and Stripe KV secrets.

# Transit keys
path "transit/verify/order-hmac-key"   { capabilities = ["update"] }
path "transit/sign/payment-sign-key"   { capabilities = ["update"] }
path "transit/verify/payment-sign-key" { capabilities = ["update"] }
path "transit/encrypt/payment-fle-key" { capabilities = ["update"] }
path "transit/decrypt/payment-fle-key" { capabilities = ["update"] }
path "transit/rewrap/payment-fle-key"  { capabilities = ["update"] }
path "transit/hmac/payment-audit-key"   { capabilities = ["update"] }
path "transit/verify/payment-audit-key" { capabilities = ["update"] }

# Read metadata for these transit keys
path "transit/keys/payment-sign-key" { capabilities = ["read"] }
path "transit/keys/payment-fle-key"  { capabilities = ["read"] }
path "transit/keys/payment-audit-key" { capabilities = ["read"] }

# Stripe secrets
path "secret/data/payment/*" { capabilities = ["read"] }
path "secret/data/payment/stripe" { capabilities = ["read"] }

# Deny everything else by default
path "*" { capabilities = ["deny"] }
