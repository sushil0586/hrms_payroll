from django.urls import path

from apps.iam.api_views import (
    LoginView,
    LogoutView,
    MenuCatalogView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    SessionView,
)


urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("password-reset/request/", PasswordResetRequestView.as_view(), name="auth-password-reset-request"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="auth-password-reset-confirm"),
    path("menu-catalog/", MenuCatalogView.as_view(), name="auth-menu-catalog"),
    path("session/", SessionView.as_view(), name="auth-session"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
]
