-- NT219 Crypto Capstone — PostgreSQL initialization
-- Runs automatically on first container start (docker-entrypoint-initdb.d)
-- Keycloak DB is created by POSTGRES_DB env var in docker-compose

-- Create per-service databases (each service gets its own DB)
CREATE DATABASE catalog_db;
CREATE DATABASE cart_db;
CREATE DATABASE order_db;
CREATE DATABASE payment_db;

-- Create per-service users (least privilege principle — services don't share credentials)
CREATE USER catalog_user  WITH PASSWORD 'catalog_dev_pass';
CREATE USER cart_user     WITH PASSWORD 'cart_dev_pass';
CREATE USER order_user    WITH PASSWORD 'order_dev_pass';
CREATE USER payment_user  WITH PASSWORD 'payment_dev_pass';

-- Grant ownership (service owns its own DB only)
GRANT ALL PRIVILEGES ON DATABASE catalog_db TO catalog_user;
GRANT ALL PRIVILEGES ON DATABASE cart_db    TO cart_user;
GRANT ALL PRIVILEGES ON DATABASE order_db   TO order_user;
GRANT ALL PRIVILEGES ON DATABASE payment_db TO payment_user;

-- Note: In Week 5-6, these grants will be tightened to per-table level
-- when field-level encryption and TDE experiments begin.
-- Payment DB will be placed in a separate security boundary (PCI-DSS isolation).
