"""Authentication and session API views."""

from django.contrib.auth import login, logout
from rest_framework import permissions, response, status
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView

from apps.iam.api_serializers import (
    LoginSerializer,
    SessionUserSerializer,
    build_session_user_payload,
)


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


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if getattr(request, "auth", None):
            Token.objects.filter(key=request.auth.key).delete()
        logout(request)
        return response.Response(status=status.HTTP_204_NO_CONTENT)
