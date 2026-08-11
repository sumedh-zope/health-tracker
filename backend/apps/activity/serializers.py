"""Serializers for the activity app."""

from __future__ import annotations

from rest_framework import serializers

from .models import Activity


class ActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Activity
        fields = [
            "id",
            "date",
            "name",
            "duration_minutes",
            "calories_burned",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
