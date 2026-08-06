"""Models for the food tracking app."""

from __future__ import annotations

from django.core.validators import MinValueValidator
from django.db import models


class FoodItem(models.Model):
    """A food product with nutritional information per 100 g."""

    class Source(models.TextChoices):
        MANUAL = "manual", "Manual"
        OPEN_FOOD_FACTS = "openfoodfacts", "Open Food Facts"

    name = models.CharField(max_length=255, db_index=True)
    calories_per_100g = models.DecimalField(
        max_digits=7, decimal_places=2, validators=[MinValueValidator(0)]
    )
    protein_per_100g = models.DecimalField(
        max_digits=6, decimal_places=2, validators=[MinValueValidator(0)]
    )
    carbs_per_100g = models.DecimalField(
        max_digits=6, decimal_places=2, validators=[MinValueValidator(0)]
    )
    fat_per_100g = models.DecimalField(
        max_digits=6, decimal_places=2, validators=[MinValueValidator(0)]
    )
    fiber_per_100g = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        default=0,
    )
    source = models.CharField(
        max_length=20, choices=Source.choices, default=Source.MANUAL
    )
    off_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        unique=True,
        verbose_name="Open Food Facts ID / barcode",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["off_id"]),
        ]

    def __str__(self) -> str:
        return self.name


class Recipe(models.Model):
    """A named collection of food ingredients."""

    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class RecipeIngredient(models.Model):
    """An ingredient (food item + amount) that belongs to a recipe."""

    recipe = models.ForeignKey(
        Recipe, on_delete=models.CASCADE, related_name="ingredients"
    )
    food_item = models.ForeignKey(
        FoodItem, on_delete=models.CASCADE, related_name="recipe_uses"
    )
    amount_grams = models.DecimalField(
        max_digits=8, decimal_places=2, validators=[MinValueValidator(0.01)]
    )

    class Meta:
        unique_together = ("recipe", "food_item")

    def __str__(self) -> str:
        return f"{self.food_item.name} — {self.amount_grams} g in {self.recipe.name}"


class MealLog(models.Model):
    """A single meal occasion on a given date."""

    class MealType(models.TextChoices):
        BREAKFAST = "breakfast", "Breakfast"
        LUNCH = "lunch", "Lunch"
        DINNER = "dinner", "Dinner"
        SNACK = "snack", "Snack"

    date = models.DateField(db_index=True)
    meal_type = models.CharField(max_length=20, choices=MealType.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "meal_type"]
        indexes = [models.Index(fields=["date"])]

    def __str__(self) -> str:
        return f"{self.date} — {self.get_meal_type_display()}"


class MealLogEntry(models.Model):
    """
    A single line item inside a MealLog.

    Either ``food_item`` or ``recipe`` must be set (but not both).
    Calorie and macro values are stored de-normalised at write time so that
    historical logs are not affected by later edits to the food item.
    """

    meal_log = models.ForeignKey(
        MealLog, on_delete=models.CASCADE, related_name="entries"
    )
    food_item = models.ForeignKey(
        FoodItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="meal_entries",
    )
    recipe = models.ForeignKey(
        Recipe,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="meal_entries",
    )
    amount_grams = models.DecimalField(
        max_digits=8, decimal_places=2, validators=[MinValueValidator(0.01)]
    )

    # Computed / snapshotted nutritional values
    calories = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    protein = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    carbs = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    fat = models.DecimalField(max_digits=7, decimal_places=2, default=0)

    class Meta:
        ordering = ["id"]

    def __str__(self) -> str:
        source = self.food_item or self.recipe
        return f"{source} — {self.amount_grams} g"

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _compute_from_food_item(self) -> None:
        factor = self.amount_grams / 100
        self.calories = round(self.food_item.calories_per_100g * factor, 2)
        self.protein = round(self.food_item.protein_per_100g * factor, 2)
        self.carbs = round(self.food_item.carbs_per_100g * factor, 2)
        self.fat = round(self.food_item.fat_per_100g * factor, 2)

    def _compute_from_recipe(self) -> None:
        """Aggregate nutrition across all recipe ingredients."""
        totals = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
        for ingredient in self.recipe.ingredients.select_related("food_item"):
            factor = ingredient.amount_grams / 100
            totals["calories"] += ingredient.food_item.calories_per_100g * factor
            totals["protein"] += ingredient.food_item.protein_per_100g * factor
            totals["carbs"] += ingredient.food_item.carbs_per_100g * factor
            totals["fat"] += ingredient.food_item.fat_per_100g * factor

        # Scale by the fraction of the recipe the user actually consumed
        recipe_total_grams = sum(
            i.amount_grams for i in self.recipe.ingredients.all()
        )
        if recipe_total_grams:
            scale = self.amount_grams / recipe_total_grams
            self.calories = round(totals["calories"] * scale, 2)
            self.protein = round(totals["protein"] * scale, 2)
            self.carbs = round(totals["carbs"] * scale, 2)
            self.fat = round(totals["fat"] * scale, 2)

    def compute_nutrition(self) -> None:
        """Populate calorie/macro fields from the linked food item or recipe."""
        if self.food_item_id:
            self._compute_from_food_item()
        elif self.recipe_id:
            self._compute_from_recipe()
