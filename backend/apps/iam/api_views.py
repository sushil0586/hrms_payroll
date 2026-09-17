"""Authentication and session API views."""

from django.contrib.auth import login, logout
from rest_framework import permissions, response, status
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView

from apps.iam.api_serializers import (
    LoginSerializer,
    MenuCatalogEntrySerializer,
    SessionUserSerializer,
    build_session_user_payload,
)
from apps.iam.menu_catalog import get_menu_catalog
from apps.iam.models import MenuCatalogEntry


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        token, _ = Token.objects.get_or_create(user=user)
        login(request, user)

        payload = {
            "token": token.key,
            "user": build_session_user_payload(user),
        }
        return response.Response(payload, status=status.HTTP_200_OK)


class SessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        payload = build_session_user_payload(request.user)
        return response.Response(SessionUserSerializer(payload).data)


class MenuCatalogView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        workspace = request.query_params.get("workspace") or ""
        entries = list(MenuCatalogEntry.objects.filter(is_active=True).order_by("workspace", "kind", "group", "sort_order", "label"))
        payload = [entry.as_catalog_dict() for entry in entries]
        if not payload:
            payload = [
                {**item, "is_active": True, "catalog_source": "code"}
                for item in get_menu_catalog()
            ]
        if workspace:
            payload = [item for item in payload if item["workspace"] == workspace]
        return response.Response(MenuCatalogEntrySerializer(payload, many=True).data)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if getattr(request, "auth", None):
            Token.objects.filter(key=request.auth.key).delete()
        logout(request)
        return response.Response(status=status.HTTP_204_NO_CONTENT)
