"""URL configuration for the metrics app."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import BodyMetricViewSet

router = DefaultRouter()
router.register(r"", BodyMetricViewSet, basename="bodymetric")

urlpatterns = [
    path("", include(router.urls)),
]
