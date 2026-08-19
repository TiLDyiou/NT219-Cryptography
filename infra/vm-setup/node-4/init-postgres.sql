CREATE DATABASE cart_db        OWNER uitstore;
CREATE DATABASE order_db       OWNER uitstore;
CREATE DATABASE payment_db     OWNER uitstore;
CREATE DATABASE inventory_db   OWNER uitstore;
CREATE DATABASE shipping_db    OWNER uitstore;
CREATE DATABASE notification_db OWNER uitstore;

GRANT ALL PRIVILEGES ON DATABASE cart_db         TO uitstore;
GRANT ALL PRIVILEGES ON DATABASE order_db        TO uitstore;
GRANT ALL PRIVILEGES ON DATABASE payment_db      TO uitstore;
GRANT ALL PRIVILEGES ON DATABASE inventory_db    TO uitstore;
GRANT ALL PRIVILEGES ON DATABASE shipping_db     TO uitstore;
GRANT ALL PRIVILEGES ON DATABASE notification_db TO uitstore;
