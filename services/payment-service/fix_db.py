import asyncio
import asyncpg
import os
from dotenv import load_dotenv

async def fix():
    # Tự động đọc đúng mật khẩu từ file .env
    load_dotenv('/opt/uitstore/services/payment-service/.env')
    db_url = os.getenv('DATABASE_URL').replace('+asyncpg', '')
    
    conn = await asyncpg.connect(db_url)
    await conn.execute("""
        CREATE OR REPLACE FUNCTION audit_payment_changes()
        RETURNS TRIGGER AS $$
        DECLARE
            old_row JSONB := NULL;
            new_row JSONB := NULL;
            diff_cols VARCHAR(100)[] := '{}';
        BEGIN
            IF TG_OP = 'DELETE' THEN
                old_row := to_jsonb(OLD);
            ELSIF TG_OP = 'INSERT' THEN
                new_row := to_jsonb(NEW);
            ELSIF TG_OP = 'UPDATE' THEN
                old_row := to_jsonb(OLD);
                new_row := to_jsonb(NEW);
                SELECT array_agg(key) INTO diff_cols
                FROM jsonb_each(new_row)
                WHERE new_row->key IS DISTINCT FROM old_row->key;
            END IF;

            INSERT INTO payment_audit_log (
                id, table_name, record_id, action, old_data, new_data, changed_fields,
                actor_type, hmac_key_version, created_at
            ) VALUES (
                gen_random_uuid(), TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), TG_OP,
                old_row, new_row, diff_cols,
                'system', 1, NOW()
            );
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    print('✅ Cập nhật Trigger thành công!')
    await conn.close()

asyncio.run(fix())
