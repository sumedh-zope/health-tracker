"""Models for the metrics (body measurements) app."""

from __future__ import annotations

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class BodyMetric(models.Model):
    """A single body-measurement snapshot for a given date."""

    date = models.DateField(unique=True, db_index=True)
    weight_kg = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        validators=[MinValueValidator(0.1), MaxValueValidator(999.99)],
    )
    body_fat_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]
        indexes = [models.Index(fields=["-date"])]

    def __str__(self) -> str:
        return f"{self.date} — {self.weight_kg} kg"

    # ------------------------------------------------------------------
    # Computed property
    # ------------------------------------------------------------------

    @property
    def bmi(self) -> float | None:
        """
        Return BMI if height is stored, otherwise ``None``.

        BMI requires height which is not tracked in this model — the property
        is a placeholder so callers can check ``metric.bmi`` without errors.
        Extend this model with a ``height_cm`` field if needed.
        """
        return None
