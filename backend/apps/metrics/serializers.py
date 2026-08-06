"""Serializers for the metrics app."""

from __future__ import annotations

from rest_framework import serializers

from .models import BodyMetric


class BodyMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = BodyMetric
        fields = [
            "id",
            "date",
            "weight_kg",
            "body_fat_percentage",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
