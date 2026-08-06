"""URL configuration for the goals app."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import GoalViewSet

router = DefaultRouter()
router.register(r"", GoalViewSet, basename="goal")

urlpatterns = [
    path("", include(router.urls)),
]
