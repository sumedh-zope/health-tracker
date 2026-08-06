"""Django admin registration for the food app."""

from django.contrib import admin

from .models import FoodItem, MealLog, MealLogEntry, Recipe, RecipeIngredient


@admin.register(FoodItem)
class FoodItemAdmin(admin.ModelAdmin):
    list_display = ["name", "calories_per_100g", "protein_per_100g", "carbs_per_100g", "fat_per_100g", "source", "created_at"]
    list_filter = ["source"]
    search_fields = ["name", "off_id"]
    ordering = ["name"]
    readonly_fields = ["created_at"]


class RecipeIngredientInline(admin.TabularInline):
    model = RecipeIngredient
    extra = 1
    autocomplete_fields = ["food_item"]


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ["name", "created_at"]
    search_fields = ["name"]
    ordering = ["name"]
    readonly_fields = ["created_at"]
    inlines = [RecipeIngredientInline]


@admin.register(RecipeIngredient)
class RecipeIngredientAdmin(admin.ModelAdmin):
    list_display = ["recipe", "food_item", "amount_grams"]
    autocomplete_fields = ["food_item"]
    list_filter = ["recipe"]


class MealLogEntryInline(admin.TabularInline):
    model = MealLogEntry
    extra = 1
    readonly_fields = ["calories", "protein", "carbs", "fat"]
    fields = ["food_item", "recipe", "amount_grams", "calories", "protein", "carbs", "fat"]


@admin.register(MealLog)
class MealLogAdmin(admin.ModelAdmin):
    list_display = ["date", "meal_type", "created_at"]
    list_filter = ["meal_type", "date"]
    ordering = ["-date"]
    readonly_fields = ["created_at"]
    inlines = [MealLogEntryInline]


@admin.register(MealLogEntry)
class MealLogEntryAdmin(admin.ModelAdmin):
    list_display = ["meal_log", "food_item", "recipe", "amount_grams", "calories", "protein", "carbs", "fat"]
    readonly_fields = ["calories", "protein", "carbs", "fat"]
    list_filter = ["meal_log__date", "meal_log__meal_type"]
