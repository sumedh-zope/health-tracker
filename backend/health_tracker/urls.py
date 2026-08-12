"""Root URL configuration."""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),

    # App routers
    path("api/food/", include("apps.food.urls")),
    path("api/metrics/", include("apps.metrics.urls")),
    path("api/goals/", include("apps.goals.urls")),
    path("api/activity/", include("apps.activity.urls")),
]
