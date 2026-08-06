"""URL configuration for the food app."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FoodItemViewSet, MealLogViewSet, RecipeViewSet

router = DefaultRouter()
router.register(r"items", FoodItemViewSet, basename="fooditem")
router.register(r"recipes", RecipeViewSet, basename="recipe")
router.register(r"logs", MealLogViewSet, basename="meallog")

urlpatterns = [
    path("", include(router.urls)),
    # The daily-summary action lives on the logs router but is also exposed at
    # the canonical path specified in the requirements.
    path(
        "daily-summary/",
        MealLogViewSet.as_view({"get": "daily_summary"}),
        name="food-daily-summary",
    ),
]
