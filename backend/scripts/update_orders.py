from django.db import connection

def update_orders():
    with connection.cursor() as cursor:
        # Check if pharmacy_id column exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='orders' 
            AND column_name='pharmacy_id';
        """)
        has_pharmacy = cursor.fetchone() is not None

        print(f"Has pharmacy column: {has_pharmacy}")

        # Update orders to set pharmacy to the user who created them if needed
        if not has_pharmacy:
            print("Adding pharmacy_id column...")
            cursor.execute("""
                ALTER TABLE orders 
                ADD COLUMN pharmacy_id bigint REFERENCES users_user(id)
                ON DELETE PROTECT;
            """)
            cursor.execute("""
                UPDATE orders 
                SET pharmacy_id = user_id;
            """)
            print("Done updating orders.")