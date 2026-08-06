"""Views for the metrics app."""

from __future__ import annotations

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.request import Request
from rest_framework.response import Response

from .models import BodyMetric
from .serializers import BodyMetricSerializer


class BodyMetricViewSet(viewsets.ModelViewSet):
    """
    CRUD for body metrics plus a latest-entry action.

    GET  /api/metrics/          — list (ordered most-recent first)
    POST /api/metrics/          — create
    GET  /api/metrics/{id}/     — retrieve
    PUT  /api/metrics/{id}/     — update
    DEL  /api/metrics/{id}/     — destroy
    GET  /api/metrics/latest/   — most recent entry
    """

    queryset = BodyMetric.objects.all()
    serializer_class = BodyMetricSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["date"]
    ordering_fields = ["date", "weight_kg", "created_at"]
    ordering = ["-date"]

    @action(detail=False, methods=["get"], url_path="latest")
    def latest(self, request: Request) -> Response:
        """GET /api/metrics/latest/ — return the single most recent body metric."""
        metric = BodyMetric.objects.order_by("-date").first()
        if metric is None:
            raise NotFound("No body metrics recorded yet.")
        return Response(BodyMetricSerializer(metric).data)
