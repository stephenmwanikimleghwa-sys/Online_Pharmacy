import psycopg2

try:
    conn = psycopg2.connect(
        host="db.esqkftmnuaqkawewjniy.supabase.co",
        port="5432",
        database="postgres",
        user="postgres",
        password="Nyashinski@254"
    )
    cur = conn.cursor()
    cur.execute("SELECT id, name, category, department, price FROM products WHERE name ILIKE '%agrovet test product%';")
    rows = cur.fetchall()
    print("Products:", rows)
    
    cur.execute("SELECT id, app, name, applied FROM django_migrations WHERE app = 'products' ORDER BY id DESC LIMIT 5;")
    migs = cur.fetchall()
    print("Migrations:", migs)
    
    cur.execute("SELECT id, buying_price, wholesale_price, retail_price, use_legacy_prices FROM pricing_tier LIMIT 5;")
    tiers = cur.fetchall()
    print("Tiers:", tiers)
    
    conn.close()
except Exception as e:
    print(e)
