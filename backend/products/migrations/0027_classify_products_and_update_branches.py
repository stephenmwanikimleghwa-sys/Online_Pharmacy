from django.db import migrations

def update_branches_and_classify_products(apps, schema_editor):
    Branch = apps.get_model('users', 'Branch')
    Product = apps.get_model('products', 'Product')
    BranchStock = apps.get_model('products', 'BranchStock')

    # Update Branches (case-insensitive names to handle 'Peakfarm' vs 'PEAKFARM')
    Branch.objects.filter(name__in=['TRANSCOUNTY_MAIN', 'TRANSCOUNTY_ANNEX',
                                     'Transcounty Main', 'Transcounty Annex']).update(branch_type='CHEMIST')
    Branch.objects.filter(name__iexact='PEAKFARM').update(branch_type='AGROVET')

    # Fetch branches
    peakfarm_branch = Branch.objects.filter(name__iexact='PEAKFARM').first()
    main_annex_branches = Branch.objects.filter(name__in=['TRANSCOUNTY_MAIN', 'TRANSCOUNTY_ANNEX',
                                                           'Transcounty Main', 'Transcounty Annex'])
    main_annex_ids = list(main_annex_branches.values_list('id', flat=True))
    
    peakfarm_id = peakfarm_branch.id if peakfarm_branch else None
        
    agrovet_keywords = [
        'herbicide', 'fungicide', 'pesticide', 
        'insecticide', 'fertilizer', 'fertiliser',
        'seed', 'feed', 'dewormer', 'acaricide',
        'veterinary', 'vet', 'poultry', 'dairy',
        'agrovet', 'agro', 'crop', 'soil', 'farm',
        'livestock', 'cattle', 'goat', 'sheep',
        'sheep dip', 'tick', 'weed', 'maize',
        'wheat', 'pyrethrum', 'dip', 'spray pump'
    ]
    
    chemist_keywords = [
        'antibiotic', 'antimalarial', 'analgesic',
        'antihypertensive', 'antiretroviral',
        'vitamin', 'supplement', 'contraceptive',
        'derma', 'antifungal', 'antacid', 'cough',
        'cold', 'diabetes', 'injection', 'iv fluid',
        'surgical', 'lab', 'reagent', 'controlled',
        'paediatric', 'ophthalmology', 'ent',
        'wound', 'cardiovascular', 'psychiatric',
        'tablet', 'capsule', 'syrup', 'suspension',
        'cream', 'ointment', 'gel', 'drop', 'inhaler',
        'suppository', 'pessary', 'lozenge', 'patch',
        'mg', 'ml', 'mcg'
    ]

    # Prefetch product IDs that have stock in respective branches to avoid N+1 queries
    peakfarm_stock_product_ids = set(BranchStock.objects.filter(branch_id=peakfarm_id, quantity__gt=0).values_list('product_id', flat=True)) if peakfarm_id else set()
    main_stock_product_ids = set(BranchStock.objects.filter(branch_id__in=main_annex_ids, quantity__gt=0).values_list('product_id', flat=True)) if main_annex_ids else set()

    def check_keywords(text, keywords):
        if not text:
            return False
        text_lower = text.lower()
        for kw in keywords:
            if kw in text_lower:
                return True
        return False

    products = Product.objects.all()
    
    products_to_update = []
    for p in products:
        has_peakfarm = p.id in peakfarm_stock_product_ids
        has_main = p.id in main_stock_product_ids
        
        assigned_type = 'CHEMIST' # default
        
        if has_peakfarm and not has_main:
            assigned_type = 'AGROVET'
        elif has_main and not has_peakfarm:
            assigned_type = 'CHEMIST'
        elif has_main and has_peakfarm:
            assigned_type = 'UNIVERSAL'
        else:
            category = p.category or ''
            name = p.name or ''
            
            is_agro_cat = check_keywords(category, agrovet_keywords)
            is_chem_cat = check_keywords(category, chemist_keywords)
            
            if is_agro_cat and not is_chem_cat:
                assigned_type = 'AGROVET'
            elif is_chem_cat and not is_agro_cat:
                assigned_type = 'CHEMIST'
            else:
                is_agro_name = check_keywords(name, agrovet_keywords)
                is_chem_name = check_keywords(name, chemist_keywords)
                
                if is_agro_name and not is_chem_name:
                    assigned_type = 'AGROVET'
                elif is_chem_name and not is_agro_name:
                    assigned_type = 'CHEMIST'
        
        p.product_type = assigned_type
        products_to_update.append(p)
        
    Product.objects.bulk_update(products_to_update, ['product_type'])

def reverse_update(apps, schema_editor):
    pass # No need to reverse

class Migration(migrations.Migration):

    dependencies = [
        ('products', '0026_product_product_type'),
        ('users', '0023_supplier_intelligence_and_batch_fefo'),
    ]

    operations = [
        migrations.RunPython(update_branches_and_classify_products, reverse_update),
    ]
