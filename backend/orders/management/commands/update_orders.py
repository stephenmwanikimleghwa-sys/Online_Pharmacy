from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Update orders to include pharmacy_id'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            # Check if pharmacy_id column exists
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='orders' 
                AND column_name='pharmacy_id';
            """)
            has_pharmacy = cursor.fetchone() is not None

            self.stdout.write(f"Has pharmacy column: {has_pharmacy}")

            # Update orders to set pharmacy to the user who created them if needed
            if not has_pharmacy:
                self.stdout.write("Adding pharmacy_id column...")
                cursor.execute("""
                    ALTER TABLE orders 
                    ADD COLUMN pharmacy_id bigint REFERENCES users_user(id)
                    ON DELETE PROTECT;
                """)
                cursor.execute("""
                    UPDATE orders 
                    SET pharmacy_id = user_id;
                """)
                self.stdout.write(self.style.SUCCESS("Done updating orders."))