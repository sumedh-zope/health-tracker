"""Serializers for the food app."""

from __future__ import annotations

from rest_framework import serializers

from .models import FoodItem, MealLog, MealLogEntry, Recipe, RecipeIngredient


# ---------------------------------------------------------------------------
# FoodItem
# ---------------------------------------------------------------------------


class FoodItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodItem
        fields = [
            "id",
            "name",
            "calories_per_100g",
            "protein_per_100g",
            "carbs_per_100g",
            "fat_per_100g",
            "fiber_per_100g",
            "source",
            "off_id",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


# ---------------------------------------------------------------------------
# Recipe
# ---------------------------------------------------------------------------


class RecipeIngredientSerializer(serializers.ModelSerializer):
    food_item_name = serializers.CharField(source="food_item.name", read_only=True)

    class Meta:
        model = RecipeIngredient
        fields = ["id", "food_item", "food_item_name", "amount_grams"]


class RecipeSerializer(serializers.ModelSerializer):
    ingredients = RecipeIngredientSerializer(many=True, read_only=True)

    class Meta:
        model = Recipe
        fields = ["id", "name", "description", "created_at", "ingredients"]
        read_only_fields = ["id", "created_at"]


class RecipeWriteSerializer(serializers.ModelSerializer):
    """Used for create / update — accepts a list of ingredient dicts."""

    ingredients = RecipeIngredientSerializer(many=True, required=False)

    class Meta:
        model = Recipe
        fields = ["id", "name", "description", "ingredients"]
        read_only_fields = ["id"]

    def _upsert_ingredients(self, recipe: Recipe, ingredients_data: list[dict]) -> None:
        # Replace all existing ingredients on write.
        recipe.ingredients.all().delete()
        for item in ingredients_data:
            RecipeIngredient.objects.create(recipe=recipe, **item)

    def create(self, validated_data: dict) -> Recipe:
        ingredients_data = validated_data.pop("ingredients", [])
        recipe = Recipe.objects.create(**validated_data)
        self._upsert_ingredients(recipe, ingredients_data)
        return recipe

    def update(self, instance: Recipe, validated_data: dict) -> Recipe:
        ingredients_data = validated_data.pop("ingredients", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if ingredients_data is not None:
            self._upsert_ingredients(instance, ingredients_data)
        return instance


# ---------------------------------------------------------------------------
# MealLogEntry
# ---------------------------------------------------------------------------


class MealLogEntrySerializer(serializers.ModelSerializer):
    food_item_name = serializers.CharField(source="food_item.name", read_only=True)
    recipe_name = serializers.CharField(source="recipe.name", read_only=True)

    class Meta:
        model = MealLogEntry
        fields = [
            "id",
            "meal_log",
            "food_item",
            "food_item_name",
            "recipe",
            "recipe_name",
            "amount_grams",
            "calories",
            "protein",
            "carbs",
            "fat",
        ]
        read_only_fields = ["id", "meal_log", "calories", "protein", "carbs", "fat"]

    def validate(self, attrs: dict) -> dict:
        food_item = attrs.get("food_item")
        recipe = attrs.get("recipe")
        if not food_item and not recipe:
            raise serializers.ValidationError(
                "Either food_item or recipe must be provided."
            )
        if food_item and recipe:
            raise serializers.ValidationError(
                "Provide either food_item or recipe, not both."
            )
        return attrs

    def create(self, validated_data: dict) -> MealLogEntry:
        entry = MealLogEntry(**validated_data)
        entry.compute_nutrition()
        entry.save()
        return entry

    def update(self, instance: MealLogEntry, validated_data: dict) -> MealLogEntry:
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.compute_nutrition()
        instance.save()
        return instance


# ---------------------------------------------------------------------------
# MealLog
# ---------------------------------------------------------------------------


class MealLogSerializer(serializers.ModelSerializer):
    entries = MealLogEntrySerializer(many=True, read_only=True)

    class Meta:
        model = MealLog
        fields = ["id", "date", "meal_type", "created_at", "entries"]
        read_only_fields = ["id", "created_at"]


# ---------------------------------------------------------------------------
# Daily summary
# ---------------------------------------------------------------------------


class DailySummarySerializer(serializers.Serializer):
    """Read-only aggregate of macros for a given date."""

    date = serializers.DateField()
    total_calories = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_protein = serializers.DecimalField(max_digits=8, decimal_places=2)
    total_carbs = serializers.DecimalField(max_digits=8, decimal_places=2)
    total_fat = serializers.DecimalField(max_digits=8, decimal_places=2)
    calories_burned = serializers.IntegerField()
    meals = MealLogSerializer(many=True)
