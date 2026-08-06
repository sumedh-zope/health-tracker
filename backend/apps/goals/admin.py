"""Django admin registration for the goals app."""

from django.contrib import admin

from .models import Goal


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ["goal_type", "target_value", "unit", "active", "start_date", "end_date"]
    list_filter = ["goal_type", "active", "start_date"]
    search_fields = ["notes"]
    ordering = ["-start_date"]
    list_editable = ["active"]
    date_hierarchy = "start_date"
