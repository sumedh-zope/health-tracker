"""Views for the goals app."""

from __future__ import annotations

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from .models import Goal
from .serializers import GoalSerializer


class GoalViewSet(viewsets.ModelViewSet):
    """
    CRUD for goals plus an active-goals action.

    GET  /api/goals/          — list all goals
    POST /api/goals/          — create a goal
    GET  /api/goals/{id}/     — retrieve
    PUT  /api/goals/{id}/     — update
    DEL  /api/goals/{id}/     — destroy
    GET  /api/goals/active/   — currently active goals
    """

    queryset = Goal.objects.all()
    serializer_class = GoalSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["goal_type", "active"]
    search_fields = ["notes"]
    ordering_fields = ["start_date", "goal_type", "target_value"]
    ordering = ["-start_date"]

    @action(detail=False, methods=["get"], url_path="active")
    def active(self, request: Request) -> Response:
        """GET /api/goals/active/ — return all goals where active=True."""
        qs = Goal.objects.filter(active=True).order_by("-start_date", "goal_type")
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(GoalSerializer(page, many=True).data)
        return Response(GoalSerializer(qs, many=True).data)
