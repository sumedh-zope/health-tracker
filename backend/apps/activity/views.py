"""Views for the activity app."""

from __future__ import annotations

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets

from .models import Activity
from .serializers import ActivitySerializer


class ActivityViewSet(viewsets.ModelViewSet):
    """
    CRUD for activity logs with date filtering.

    GET  /api/activity/               — list (supports ?date=YYYY-MM-DD and ?date_after=YYYY-MM-DD)
    POST /api/activity/               — create
    GET  /api/activity/{id}/          — retrieve
    PUT  /api/activity/{id}/          — update
    DEL  /api/activity/{id}/          — destroy
    """

    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["date"]
    ordering_fields = ["date", "created_at"]
    ordering = ["-date", "-created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        date_after = self.request.query_params.get("date_after")
        if date_after:
            qs = qs.filter(date__gte=date_after)
        return qs
