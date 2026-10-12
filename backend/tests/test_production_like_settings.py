from config.settings import production, staging


def test_production_like_settings_do_not_enable_drf_basic_authentication():
    forbidden = "rest_framework.authentication.BasicAuthentication"

    assert forbidden not in production.REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"]
    assert forbidden not in staging.REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"]
