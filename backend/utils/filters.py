from django.core.exceptions import ValidationError

def filter_products_by_branch_type(queryset, branch):
    """
    Filters a product queryset to only return products appropriate for the given branch type.
    
    CHEMIST branch -> CHEMIST + UNIVERSAL products
    AGROVET branch -> AGROVET + UNIVERSAL products
    """
    if branch is None:
        return queryset
        
    if getattr(branch, 'branch_type', None) == 'CHEMIST':
        return queryset.filter(product_type__in=['CHEMIST', 'UNIVERSAL'])
    elif getattr(branch, 'branch_type', None) == 'AGROVET':
        return queryset.filter(product_type__in=['AGROVET', 'UNIVERSAL'])
        
    return queryset

def get_allowed_product_types(branch):
    """
    Returns the allowed product_type list for a given branch.
    """
    if not branch:
        return None
    if getattr(branch, 'branch_type', None) == 'CHEMIST':
        return ['CHEMIST', 'UNIVERSAL']
    elif getattr(branch, 'branch_type', None) == 'AGROVET':
        return ['AGROVET', 'UNIVERSAL']
    return None

def validate_product_for_branch(product, branch):
    """
    Raises ValidationError if a product is not appropriate for the branch type.
    Prevents API manipulation to sell agrovet products at chemist.
    """
    if not product or not branch:
        return
        
    product_type = getattr(product, 'product_type', 'CHEMIST')
    branch_type = getattr(branch, 'branch_type', 'CHEMIST')
    
    if product_type == 'AGROVET' and branch_type == 'CHEMIST':
        raise ValidationError(
            message=f"{product.name} is an agrovet product and cannot be sold at a chemist branch.",
            code='WRONG_BRANCH_TYPE'
        )
        
    if product_type == 'CHEMIST' and branch_type == 'AGROVET':
        raise ValidationError(
            message=f"{product.name} is a pharmacy product and cannot be sold at an agrovet branch.",
            code='WRONG_BRANCH_TYPE'
        )
