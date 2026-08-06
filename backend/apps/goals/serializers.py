"""Serializers for the goals app."""

from __future__ import annotations

from rest_framework import serializers

from .models import Goal


class GoalSerializer(serializers.ModelSerializer):
    goal_type_display = serializers.CharField(source="get_goal_type_display", read_only=True)

    class Meta:
        model = Goal
        fields = [
            "id",
            "goal_type",
            "goal_type_display",
            "target_value",
            "unit",
            "active",
            "start_date",
            "end_date",
            "notes",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs: dict) -> dict:
        start = attrs.get("start_date")
        end = attrs.get("end_date")
        if start and end and end < start:
            raise serializers.ValidationError(
                {"end_date": "end_date must not be before start_date."}
            )
        return attrs
