import os
from datetime import datetime, timedelta
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

def generate_cert(common_name, is_ca=False, issuer_cert=None, issuer_key=None):
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    
    subject = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, common_name),
    ])
    
    issuer = issuer_cert.subject if issuer_cert else subject
    key_to_sign = issuer_key if issuer_key else private_key

    cert_builder = x509.CertificateBuilder().subject_name(
        subject
    ).issuer_name(
        issuer
    ).public_key(
        private_key.public_key()
    ).serial_number(
        x509.random_serial_number()
    ).not_valid_before(
        datetime.utcnow()
    ).not_valid_after(
        datetime.utcnow() + timedelta(days=3650 if is_ca else 365)
    )

    if is_ca:
        cert_builder = cert_builder.add_extension(
            x509.BasicConstraints(ca=True, path_length=None), critical=True
        )
    else:
        cert_builder = cert_builder.add_extension(
            x509.BasicConstraints(ca=False, path_length=None), critical=True
        )

    cert = cert_builder.sign(key_to_sign, hashes.SHA256())
    return cert, private_key

def save_to_disk(filename_prefix, cert, private_key, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    
    cert_path = os.path.join(out_dir, f"{filename_prefix}.crt")
    with open(cert_path, "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))
        
    key_path = os.path.join(out_dir, f"{filename_prefix}.key")
    with open(key_path, "wb") as f:
        f.write(private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption()
        ))
    
    print(f"Saved: {cert_path} and {key_path}")

if __name__ == "__main__":
    certs_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "certs"))
    print(f"Generating certificates in: {certs_dir}")
    
    # 1. Root CA
    ca_cert, ca_key = generate_cert("MyInternalCA", is_ca=True)
    save_to_disk("ca", ca_cert, ca_key, certs_dir)
    
    # 2. Order Server Cert
    ingress_cert, ingress_key = generate_cert("ingress-service", is_ca=False, issuer_cert=ca_cert, issuer_key=ca_key)
    save_to_disk("ingress", ingress_cert, ingress_key, certs_dir)
    
    # 3. Payment Client Cert
    ingress2_cert, ingress2_key = generate_cert("ingress2-service", is_ca=False, issuer_cert=ca_cert, issuer_key=ca_key)
    save_to_disk("ingress2", ingress2_cert, ingress2_key, certs_dir)
    
    print("\nGeneration Complete! You can now use these paths in your .env and uvicorn command.")
