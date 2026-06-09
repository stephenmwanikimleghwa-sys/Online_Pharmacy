import sys
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from orders.models import Order
from utils.pdf_generator import PDFGenerator

order = Order.objects.last()
if order:
    generator = PDFGenerator()
    pdf_buffer = generator.generate_receipt(order)
    with open("test_receipt.pdf", "wb") as f:
        f.write(pdf_buffer.read())
    print("Test receipt generated. Size:", len(pdf_buffer.getvalue()))
else:
    print("No orders found.")
