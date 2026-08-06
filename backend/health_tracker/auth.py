"""
Custom DRF authentication for the MCP service API key.

Any request carrying  ``Authorization: Bearer <SERVICE_API_KEY>``  is
authenticated as a synthetic "service" user without touching the database.
This is intentionally separate from JWT so that the MCP server does not need
a user account.
"""

from __future__ import annotations

from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.request import Request


class ServiceUser:
    """Lightweight stand-in for a Django user, representing the MCP service."""

    is_authenticated = True
    is_active = True
    is_staff = False
    is_superuser = False
    pk = None

    def __str__(self) -> str:
        return "service-api-key-user"


class ServiceAPIKeyAuthentication(BaseAuthentication):
    """
    Authenticate requests that supply the shared service API key.

    Header format::

        Authorization: Bearer <SERVICE_API_KEY>

    If the header is absent or uses a different scheme, authentication is
    skipped (returns ``None``) so the next authenticator in the chain is tried.
    If the header is present but the key is wrong, an error is raised
    immediately.
    """

    def authenticate(self, request: Request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.lower().startswith("bearer "):
            return None  # not our scheme — let the next authenticator try

        token = auth_header[len("bearer "):].strip()

        service_key = getattr(settings, "SERVICE_API_KEY", "")
        if not service_key:
            # Service key not configured — skip silently so JWT still works.
            return None

        if token != service_key:
            return None  # not the service key — let JWT authenticator try

        return (ServiceUser(), None)

    def authenticate_header(self, request: Request) -> str:
        return "Bearer"
