"""Views for the food app."""

from __future__ import annotations

from datetime import date as date_type, timedelta

from django.db.models import Q, Sum
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.request import Request
from rest_framework.response import Response

from django.shortcuts import get_object_or_404

from apps.goals.models import Goal
from apps.activity.models import Activity
from .models import FoodItem, MealLog, MealLogEntry, Recipe
from .serializers import (
    DailySummarySerializer,
    FoodItemSerializer,
    MealLogEntrySerializer,
    MealLogSerializer,
    RecipeSerializer,
    RecipeWriteSerializer,
)


class FoodItemViewSet(viewsets.ModelViewSet):
    """
    CRUD for food items plus a name-search action.

    GET  /api/food/items/            — list
    POST /api/food/items/            — create
    GET  /api/food/items/{id}/       — retrieve
    PUT  /api/food/items/{id}/       — update
    DEL  /api/food/items/{id}/       — destroy
    GET  /api/food/items/search/?q=  — search by name
    """

    queryset = FoodItem.objects.all()
    serializer_class = FoodItemSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["source"]
    search_fields = ["name"]
    ordering_fields = ["name", "calories_per_100g", "created_at"]
    ordering = ["name"]

    @action(detail=False, methods=["get"], url_path="search")
    def search(self, request: Request) -> Response:
        """GET /api/food/items/search/?q=<query>"""
        query = request.query_params.get("q", "").strip()
        if not query:
            raise ValidationError({"q": "This query parameter is required."})

        qs = FoodItem.objects.filter(name__icontains=query).order_by("name")
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(FoodItemSerializer(page, many=True).data)
        return Response(FoodItemSerializer(qs, many=True).data)


class RecipeViewSet(viewsets.ModelViewSet):
    """
    CRUD for recipes (with nested ingredients).

    Reads use RecipeSerializer (nested ingredients).
    Writes use RecipeWriteSerializer (accepts ingredient list).
    """

    queryset = Recipe.objects.prefetch_related("ingredients__food_item").all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_serializer_class(self):
        if self.request.method in ("POST", "PUT", "PATCH"):
            return RecipeWriteSerializer
        return RecipeSerializer


class MealLogViewSet(viewsets.ModelViewSet):
    """
    CRUD for meal logs with date filtering and an add-entry sub-action.

    GET  /api/food/logs/?date=YYYY-MM-DD  — filter by date
    POST /api/food/logs/{id}/entries/     — add an entry to a meal log
    """

    queryset = MealLog.objects.prefetch_related("entries__food_item", "entries__recipe").all()
    serializer_class = MealLogSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["date", "meal_type"]
    ordering_fields = ["date", "created_at"]
    ordering = ["-date"]

    @action(detail=True, methods=["post"], url_path="entries")
    def add_entry(self, request: Request, pk: int = None) -> Response:
        """POST /api/food/logs/{id}/entries/"""
        meal_log = self.get_object()
        serializer = MealLogEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(meal_log=meal_log)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path="entries/(?P<entry_pk>[^/.]+)")
    def delete_entry(self, request: Request, pk: int = None, entry_pk: int = None) -> Response:
        """DELETE /api/food/logs/{id}/entries/{entry_pk}/"""
        meal_log = self.get_object()
        entry = get_object_or_404(MealLogEntry, pk=entry_pk, meal_log=meal_log)
        entry.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"], url_path="daily-summary")
    def daily_summary(self, request: Request) -> Response:
        """
        GET /api/food/logs/daily-summary/?date=YYYY-MM-DD

        Returns aggregated totals (calories + macros) across all meal logs for
        the requested date, along with the individual meal details.
        """
        raw_date = request.query_params.get("date", "")
        if not raw_date:
            raise ValidationError({"date": "This query parameter is required (YYYY-MM-DD)."})

        try:
            target_date: date_type = date_type.fromisoformat(raw_date)
        except ValueError:
            raise ValidationError({"date": "Invalid date format. Use YYYY-MM-DD."})

        logs = MealLog.objects.filter(date=target_date).prefetch_related(
            "entries__food_item", "entries__recipe"
        )

        # Aggregate totals directly from stored (snapshotted) entry values
        agg = MealLogEntry.objects.filter(meal_log__date=target_date).aggregate(
            total_calories=Sum("calories"),
            total_protein=Sum("protein"),
            total_carbs=Sum("carbs"),
            total_fat=Sum("fat"),
        )

        activity_agg = Activity.objects.filter(date=target_date).aggregate(
            total_burned=Sum("calories_burned"),
        )

        payload = {
            "date": target_date,
            "total_calories": agg["total_calories"] or 0,
            "total_protein": agg["total_protein"] or 0,
            "total_carbs": agg["total_carbs"] or 0,
            "total_fat": agg["total_fat"] or 0,
            "calories_burned": activity_agg["total_burned"] or 0,
            "meals": logs,
        }

        serializer = DailySummarySerializer(payload)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="history")
    def history(self, request: Request) -> Response:
        """
        GET /api/food/logs/history/?days=30

        Returns one entry per day (descending) for dates that have meal data,
        including macro totals and which nutrition goals were active that day.
        """
        try:
            days = max(1, int(request.query_params.get("days", 30)))
        except ValueError:
            raise ValidationError({"days": "Must be a positive integer."})

        end_date = date_type.today()
        start_date = end_date - timedelta(days=days - 1)

        # Daily totals for every date in range that has at least one entry
        daily_rows = (
            MealLogEntry.objects.filter(
                meal_log__date__gte=start_date,
                meal_log__date__lte=end_date,
            )
            .values("meal_log__date")
            .annotate(
                total_calories=Sum("calories"),
                total_protein=Sum("protein"),
                total_carbs=Sum("carbs"),
                total_fat=Sum("fat"),
            )
            .order_by("-meal_log__date")
        )

        # All nutrition goals that overlap with the requested date range
        goals = list(
            Goal.objects.filter(
                goal_type__in=["calories", "protein", "carbs", "fat"],
                start_date__lte=end_date,
            ).filter(Q(end_date__isnull=True) | Q(end_date__gte=start_date))
        )

        # Activity calories burned per day in the date range
        activity_rows = (
            Activity.objects.filter(
                date__gte=start_date,
                date__lte=end_date,
            )
            .values("date")
            .annotate(total_burned=Sum("calories_burned"))
        )
        burned_by_date = {row["date"]: row["total_burned"] for row in activity_rows}

        result = []
        for row in daily_rows:
            day = row["meal_log__date"]
            day_goals = [
                {
                    "goal_type": g.goal_type,
                    "target_value": float(g.target_value),
                    "unit": g.unit,
                }
                for g in goals
                if g.start_date <= day and (g.end_date is None or g.end_date >= day)
            ]
            result.append({
                "date": day,
                "total_calories": float(row["total_calories"] or 0),
                "total_protein": float(row["total_protein"] or 0),
                "total_carbs": float(row["total_carbs"] or 0),
                "total_fat": float(row["total_fat"] or 0),
                "total_burned": burned_by_date.get(day, 0),
                "goals": day_goals,
            })

        return Response(result)
