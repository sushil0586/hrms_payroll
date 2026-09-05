from django.urls import path

from apps.iam.api_views import LoginView, LogoutView, SessionView


urlpatterns = [
    path("login/", LoginView.as_view(), name="auth-login"),
    path("session/", SessionView.as_view(), name="auth-session"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
]
