"""Django admin registration for the metrics app."""

from django.contrib import admin

from .models import BodyMetric


@admin.register(BodyMetric)
class BodyMetricAdmin(admin.ModelAdmin):
    list_display = ["date", "weight_kg", "body_fat_percentage", "created_at"]
    list_filter = ["date"]
    search_fields = ["notes"]
    ordering = ["-date"]
    readonly_fields = ["created_at"]
    date_hierarchy = "date"
