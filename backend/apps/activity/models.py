"""Models for the activity tracking app."""

from __future__ import annotations

from django.db import models


class Activity(models.Model):
    """A physical activity entry for a given date."""

    date = models.DateField(db_index=True)
    name = models.CharField(max_length=200)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    calories_burned = models.PositiveIntegerField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self) -> str:
        return f"{self.date} — {self.name} ({self.calories_burned} kcal)"
