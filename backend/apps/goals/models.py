"""Models for the goals app."""

from __future__ import annotations

from django.core.validators import MinValueValidator
from django.db import models


class Goal(models.Model):
    """A single health / nutrition goal with an optional date range."""

    class GoalType(models.TextChoices):
        CALORIES = "calories", "Calories"
        PROTEIN = "protein", "Protein"
        CARBS = "carbs", "Carbohydrates"
        FAT = "fat", "Fat"
        WEIGHT = "weight", "Weight"

    goal_type = models.CharField(max_length=20, choices=GoalType.choices, db_index=True)
    target_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    unit = models.CharField(
        max_length=20,
        help_text="e.g. kcal, g, kg",
    )
    active = models.BooleanField(default=True, db_index=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-start_date", "goal_type"]
        indexes = [
            models.Index(fields=["goal_type", "active"]),
            models.Index(fields=["start_date"]),
        ]

    def __str__(self) -> str:
        status = "active" if self.active else "inactive"
        return f"{self.get_goal_type_display()} — {self.target_value} {self.unit} ({status})"
