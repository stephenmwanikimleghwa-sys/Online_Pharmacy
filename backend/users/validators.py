import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

class PharmacyPasswordValidator:
    """
    SECURITY (H4): Password complexity validator.
    Requires at least:
    - 10 characters
    - 1 uppercase letter
    - 1 lowercase letter
    - 1 digit
    - 1 special character
    """

    def validate(self, password, user=None):
        if len(password) < 10:
            raise ValidationError(
                _("This password must contain at least 10 characters."),
                code='password_too_short',
            )
        if not re.search(r'[A-Z]', password):
            raise ValidationError(
                _("This password must contain at least one uppercase letter."),
                code='password_no_upper',
            )
        if not re.search(r'[a-z]', password):
            raise ValidationError(
                _("This password must contain at least one lowercase letter."),
                code='password_no_lower',
            )
        if not re.search(r'\d', password):
            raise ValidationError(
                _("This password must contain at least one digit."),
                code='password_no_digit',
            )
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            raise ValidationError(
                _("This password must contain at least one special character."),
                code='password_no_special',
            )

    def get_help_text(self):
        return _(
            "Your password must contain at least 10 characters, including one uppercase letter, "
            "one lowercase letter, one digit, and one special character."
        )
