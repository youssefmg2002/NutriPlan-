// =============================================================================
// 1. API CONFIGURATION & CONSTANTS
// =============================================================================

const THE_MEAL_DB_API_BASE = "https://www.themealdb.com/api/json/v1/1";
const NUTRIPLAN_API_BASE = "https://nutriplan-api.vercel.app/api";
const NUTRIPLAN_API_KEY = "xRGnhxcXrKuX8hJpeeQE5Rac9b7dyQDpaMs5fWFL";
const OPEN_FOOD_FACTS_API_BASE = "https://world.openfoodfacts.org";

const STORAGE_KEYS = {
  SAVED_RECIPES: "nutriplan_saved_recipes",
  DAILY_LOG: "nutriplan_daily_log",
  USER_SETTINGS: "nutriplan_user_settings",
  SHOPPING_LIST: "nutriplan_shopping_list",
};

const DEFAULT_USER_SETTINGS = {
  calorieGoal: 2000,
  proteinGoal: 50,
  carbsGoal: 250,
  fatGoal: 65,
  fiberGoal: 25,
  waterGoal: 2000,
  waterGlassSize: 250,
  weight: 70,
  height: 170,
  age: 30,
  gender: "male",
  activityLevel: "moderate",
  dietaryRestrictions: [],
  allergies: [],
  notifications: true,
  darkMode: false,
  weekStart: "monday",
  measurementUnit: "metric",
};

// =============================================================================
// 2. MEAL API (TheMealDB)
// =============================================================================

const MealAPI = {
  async searchMealsByName(query) {
    try {
      const response = await fetch(`${THE_MEAL_DB_API_BASE}/search.php?s=${encodeURIComponent(query)}`);
      const data = await response.json();
      return data.meals || [];
    } catch (error) {
      console.error("Error searching meals by name:", error);
      return [];
    }
  },

  async searchMealsByFirstLetter(letter) {
    try {
      const response = await fetch(`${THE_MEAL_DB_API_BASE}/search.php?f=${letter}`);
      const data = await response.json();
      return data.meals || [];
    } catch (error) {
      console.error("Error searching meals by letter:", error);
      return [];
    }
  },

  async filterMealsByIngredient(ingredient) {
    try {
      const response = await fetch(`${THE_MEAL_DB_API_BASE}/filter.php?i=${encodeURIComponent(ingredient)}`);
      const data = await response.json();
      return data.meals || [];
    } catch (error) {
      console.error("Error filtering meals by ingredient:", error);
      return [];
    }
  },

  async filterMealsByCategory(category) {
    try {
      const response = await fetch(`${THE_MEAL_DB_API_BASE}/filter.php?c=${encodeURIComponent(category)}`);
      const data = await response.json();
      return data.meals || [];
    } catch (error) {
      console.error("Error filtering meals by category:", error);
      return [];
    }
  },

  async filterMealsByArea(area) {
    try {
      const response = await fetch(`${THE_MEAL_DB_API_BASE}/filter.php?a=${encodeURIComponent(area)}`);
      const data = await response.json();
      return data.meals || [];
    } catch (error) {
      console.error("Error filtering meals by area:", error);
      return [];
    }
  },

  async getAllCategories() {
    try {
      const response = await fetch(`${THE_MEAL_DB_API_BASE}/categories.php`);
      const data = await response.json();
      return data.categories || [];
    } catch (error) {
      console.error("Error fetching categories:", error);
      return [];
    }
  },

  async getCategoryList() {
    try {
      const response = await fetch(`${THE_MEAL_DB_API_BASE}/list.php?c=list`);
      const data = await response.json();
      return data.meals || [];
    } catch (error) {
      console.error("Error fetching category list:", error);
      return [];
    }
  },

  async getAreaList() {
    try {
      const response = await fetch(`${THE_MEAL_DB_API_BASE}/list.php?a=list`);
      const data = await response.json();
      return data.meals || [];
    } catch (error) {
      console.error("Error fetching area list:", error);
      return [];
    }
  },

  async getIngredientList() {
    try {
      const response = await fetch(`${THE_MEAL_DB_API_BASE}/list.php?i=list`);
      const data = await response.json();
      return data.meals || [];
    } catch (error) {
      console.error("Error fetching ingredient list:", error);
      return [];
    }
  },

  async getMealById(mealId) {
    try {
      const response = await fetch(`${THE_MEAL_DB_API_BASE}/lookup.php?i=${mealId}`);
      const data = await response.json();
      return data.meals ? data.meals[0] : null;
    } catch (error) {
      console.error("Error fetching meal by ID:", error);
      return null;
    }
  },

  async getRandomMeal() {
    try {
      const response = await fetch(`${THE_MEAL_DB_API_BASE}/random.php`);
      const data = await response.json();
      return data.meals ? data.meals[0] : null;
    } catch (error) {
      console.error("Error fetching random meal:", error);
      return null;
    }
  },

  async getMultipleRandomMeals(count = 5) {
    try {
      const requests = Array(count).fill().map(() => this.getRandomMeal());
      const results = await Promise.all(requests);
      return results.filter((meal) => meal !== null);
    } catch (error) {
      console.error("Error fetching multiple random meals:", error);
      return [];
    }
  },

  extractIngredients(meal) {
    const ingredientsList = [];
    for (let index = 1; index <= 20; index++) {
      const ingredient = meal[`strIngredient${index}`];
      const measure = meal[`strMeasure${index}`];
      if (ingredient && ingredient.trim()) {
        ingredientsList.push({
          ingredient: ingredient.trim(),
          measure: measure ? measure.trim() : "",
        });
      }
    }
    return ingredientsList;
  },

  getIngredientThumbnail(ingredientName, size = "small") {
    const suffix = size === "medium" ? "-medium" : "-small";
    return `https://www.themealdb.com/images/ingredients/${encodeURIComponent(ingredientName)}${suffix}.png`;
  },

  parseInstructions(instructionsText) {
    if (!instructionsText) return [];
    return instructionsText
      .split(/(?:\r\n|\r|\n)+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.replace(/^\d+[\.\)]\s*/, ""))
      .filter((line) => {
        if (/^step\s*\d+\.?$/i.test(line) || /^\d+\.?$/.test(line)) return false;
        return line.length > 5;
      });
  },
};

// =============================================================================
// 3. NUTRITION API
// =============================================================================

const nutritionAnalysisCache = new Map();

const NutritionAPI = {
  clearNutritionCache() {
    nutritionAnalysisCache.clear();
  },

  async analyzeRecipe(recipeName, ingredientsList) {
    const cacheKey = `recipe_${recipeName}_${ingredientsList.join("|")}`;
    if (nutritionAnalysisCache.has(cacheKey)) {
      return nutritionAnalysisCache.get(cacheKey);
    }

    try {
      const response = await fetch(`${NUTRIPLAN_API_BASE}/nutrition/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": NUTRIPLAN_API_KEY,
        },
        body: JSON.stringify({
          recipeName: recipeName,
          ingredients: ingredientsList,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Nutrition API error:", errorData);
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }

      const responseData = await response.json();
      if (!responseData.success) {
        console.error("❌ API returned failure:", responseData);
        throw new Error(responseData.error?.message || responseData.error || "Analysis failed");
      }

      const payload = responseData.data;
      const formattedNutrition = {
        uri: `nutriplan://nutrition/${Date.now()}`,
        yield: payload.servings,
        calories: payload.totals.calories,
        totalWeight: payload.totalWeight,
        dietLabels: [],
        healthLabels: [],
        cautions: [],
        totals: payload.totals,
        perServing: payload.perServing,
        totalNutrients: {
          ENERC_KCAL: { label: "Energy", quantity: payload.totals.calories, unit: "kcal" },
          FAT: { label: "Fat", quantity: payload.totals.fat, unit: "g" },
          FASAT: { label: "Saturated Fat", quantity: payload.totals.saturatedFat, unit: "g" },
          CHOCDF: { label: "Carbohydrates", quantity: payload.totals.carbs, unit: "g" },
          FIBTG: { label: "Fiber", quantity: payload.totals.fiber, unit: "g" },
          SUGAR: { label: "Sugars", quantity: payload.totals.sugar, unit: "g" },
          PROCNT: { label: "Protein", quantity: payload.totals.protein, unit: "g" },
          CHOLE: { label: "Cholesterol", quantity: payload.totals.cholesterol, unit: "mg" },
          NA: { label: "Sodium", quantity: payload.totals.sodium, unit: "mg" },
        },
        totalDaily: this.calculateDailyPercentages(payload.totals),
        ingredients: payload.ingredients.map((item) => ({
          text: item.original,
          food: item.matched?.description || item.parsed?.foodName || "Unknown",
          grams: item.grams,
          calories: item.nutrition?.calories || 0,
          protein: item.nutrition?.protein || 0,
          fat: item.nutrition?.fat || 0,
          carbs: item.nutrition?.carbs || 0,
        })),
      };

      nutritionAnalysisCache.set(cacheKey, formattedNutrition);
      return formattedNutrition;
    } catch (error) {
      console.error("❌ Error analyzing recipe:", error);
      return this.getFallbackNutrition(recipeName, ingredientsList);
    }
  },

  calculateDailyPercentages(totals) {
    const standardDailyGoals = {
      calories: 2000,
      fat: 65,
      saturatedFat: 20,
      carbs: 300,
      fiber: 25,
      protein: 50,
      cholesterol: 300,
      sodium: 2400,
    };
    return {
      ENERC_KCAL: { label: "Energy", quantity: Math.round((totals.calories / standardDailyGoals.calories) * 100), unit: "%" },
      FAT: { label: "Fat", quantity: Math.round((totals.fat / standardDailyGoals.fat) * 100), unit: "%" },
      FASAT: { label: "Saturated Fat", quantity: Math.round((totals.saturatedFat / standardDailyGoals.saturatedFat) * 100), unit: "%" },
      CHOCDF: { label: "Carbohydrates", quantity: Math.round((totals.carbs / standardDailyGoals.carbs) * 100), unit: "%" },
      FIBTG: { label: "Fiber", quantity: Math.round((totals.fiber / standardDailyGoals.fiber) * 100), unit: "%" },
      PROCNT: { label: "Protein", quantity: Math.round((totals.protein / standardDailyGoals.protein) * 100), unit: "%" },
      CHOLE: { label: "Cholesterol", quantity: Math.round((totals.cholesterol / standardDailyGoals.cholesterol) * 100), unit: "%" },
      NA: { label: "Sodium", quantity: Math.round((totals.sodium / standardDailyGoals.sodium) * 100), unit: "%" },
    };
  },

  getFallbackNutrition(recipeName, ingredientsList) {
    console.warn("⚠️ Using fallback nutrition data");
    const estimatedTotalCalories = ingredientsList.length * 100;
    return {
      uri: `fallback://nutrition/${Date.now()}`,
      yield: 4,
      calories: estimatedTotalCalories,
      totalWeight: ingredientsList.length * 100,
      dietLabels: [],
      healthLabels: [],
      cautions: [],
      totalNutrients: {
        ENERC_KCAL: { label: "Energy", quantity: estimatedTotalCalories, unit: "kcal" },
        FAT: { label: "Fat", quantity: 0, unit: "g" },
        FASAT: { label: "Saturated Fat", quantity: 0, unit: "g" },
        CHOCDF: { label: "Carbohydrates", quantity: 0, unit: "g" },
        FIBTG: { label: "Fiber", quantity: 0, unit: "g" },
        SUGAR: { label: "Sugars", quantity: 0, unit: "g" },
        PROCNT: { label: "Protein", quantity: 0, unit: "g" },
        CHOLE: { label: "Cholesterol", quantity: 0, unit: "mg" },
        NA: { label: "Sodium", quantity: 0, unit: "mg" },
      },
      totalDaily: {},
      ingredients: ingredientsList.map((ingredient) => ({
        text: ingredient,
        food: "Unknown",
        grams: 100,
        calories: 100,
        protein: 0,
        fat: 0,
        carbs: 0,
        notFound: true,
      })),
    };
  },

  formatNutritionForDisplay(nutritionData) {
    if (!nutritionData) return null;
    const servingsCount = nutritionData.yield || 4;
    const perServing = nutritionData.perServing;
    const totals = nutritionData.totals;

    if (perServing && totals) {
      return {
        servings: servingsCount,
        caloriesPerServing: perServing.calories,
        totalCalories: totals.calories,
        macros: {
          protein: { amount: perServing.protein, dailyValue: Math.round((perServing.protein / 50) * 100) },
          carbs: { amount: perServing.carbs, dailyValue: Math.round((perServing.carbs / 300) * 100) },
          fat: { amount: perServing.fat, dailyValue: Math.round((perServing.fat / 65) * 100) },
          fiber: { amount: perServing.fiber, dailyValue: Math.round((perServing.fiber / 25) * 100) },
          sugar: { amount: perServing.sugar, dailyValue: 0 },
          saturatedFat: { amount: perServing.saturatedFat, dailyValue: Math.round((perServing.saturatedFat / 20) * 100) },
        },
        other: {
          cholesterol: perServing.cholesterol,
          sodium: perServing.sodium,
        },
        dietLabels: nutritionData.dietLabels || [],
        healthLabels: nutritionData.healthLabels || [],
      };
    }

    const totalNutrients = nutritionData.totalNutrients || {};
    const totalDaily = nutritionData.totalDaily || {};

    return {
      servings: servingsCount,
      caloriesPerServing: Math.round((nutritionData.calories || 0) / servingsCount),
      totalCalories: Math.round(nutritionData.calories || 0),
      macros: {
        protein: {
          amount: Math.round((totalNutrients.PROCNT?.quantity || 0) / servingsCount),
          dailyValue: Math.round((totalDaily.PROCNT?.quantity || 0) / servingsCount),
        },
        carbs: {
          amount: Math.round((totalNutrients.CHOCDF?.quantity || 0) / servingsCount),
          dailyValue: Math.round((totalDaily.CHOCDF?.quantity || 0) / servingsCount),
        },
        fat: {
          amount: Math.round((totalNutrients.FAT?.quantity || 0) / servingsCount),
          dailyValue: Math.round((totalDaily.FAT?.quantity || 0) / servingsCount),
        },
        fiber: {
          amount: Math.round((totalNutrients.FIBTG?.quantity || 0) / servingsCount),
          dailyValue: Math.round((totalDaily.FIBTG?.quantity || 0) / servingsCount),
        },
        sugar: {
          amount: Math.round((totalNutrients.SUGAR?.quantity || 0) / servingsCount),
          dailyValue: 0,
        },
        saturatedFat: {
          amount: Math.round((totalNutrients.FASAT?.quantity || 0) / servingsCount),
          dailyValue: Math.round((totalDaily.FASAT?.quantity || 0) / servingsCount),
        },
      },
      other: {
        cholesterol: Math.round((totalNutrients.CHOLE?.quantity || 0) / servingsCount),
        sodium: Math.round((totalNutrients.NA?.quantity || 0) / servingsCount),
      },
      dietLabels: nutritionData.dietLabels || [],
      healthLabels: nutritionData.healthLabels || [],
    };
  },

  calculateDayTotal(loggedItems = []) {
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    for (const item of loggedItems) {
      if (item.nutrition) {
        totals.calories += item.nutrition.calories || 0;
        totals.protein += item.nutrition.protein || 0;
        totals.carbs += item.nutrition.carbs || 0;
        totals.fat += item.nutrition.fat || 0;
        totals.fiber += item.nutrition.fiber || 0;
      }
    }
    return totals;
  },

  async getNutritionForItem(ingredientQuery) {
    const analysis = await this.analyzeRecipe("Single Item", [ingredientQuery]);
    if (analysis.ingredients && analysis.ingredients.length > 0) {
      const firstIngredient = analysis.ingredients[0];
      return {
        uri: `nutriplan://item/${Date.now()}`,
        description: firstIngredient.food,
        calories: firstIngredient.calories,
        totalWeight: firstIngredient.grams,
        dietLabels: [],
        healthLabels: [],
        totalNutrients: {
          ENERC_KCAL: { label: "Energy", quantity: firstIngredient.calories, unit: "kcal" },
          FAT: { label: "Fat", quantity: firstIngredient.fat, unit: "g" },
          CHOCDF: { label: "Carbohydrates", quantity: firstIngredient.carbs, unit: "g" },
          PROCNT: { label: "Protein", quantity: firstIngredient.protein, unit: "g" },
        },
        totalDaily: {},
        ingredients: [
          { text: ingredientQuery, parsed: [{ quantity: 1, food: firstIngredient.food, weight: firstIngredient.grams }] },
        ],
      };
    }
    return null;
  },

  async searchFoods(searchQuery, limit = 5) {
    try {
      const response = await fetch(`${NUTRIPLAN_API_BASE}/nutrition/search?q=${encodeURIComponent(searchQuery)}&page=1`, {
        headers: { "x-api-key": NUTRIPLAN_API_KEY },
      });
      if (!response.ok) throw new Error(`Search API error: ${response.status}`);
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error("Error searching foods:", error);
      return [];
    }
  },
};

// =============================================================================
// 4. OPEN FOOD FACTS API (Products & Barcode)
// =============================================================================

const ProductAPI = {
  async searchProducts(options = {}) {
    const searchTerms = options.searchTerms || "";
    try {
      const response = await fetch(
        `${NUTRIPLAN_API_BASE}/products/search?q=${encodeURIComponent(searchTerms)}&page=${options.page || 1}&pageSize=${options.pageSize || 24}`,
        {
          headers: { "x-api-key": NUTRIPLAN_API_KEY },
        }
      );
      if (response.ok) {
        const data = await response.json();
        const rawProducts = data.results || data.products || [];
        if (rawProducts.length > 0) {
          return {
            count: rawProducts.length,
            page: 1,
            pageSize: 24,
            products: rawProducts.map((p) => this.formatProduct(p)),
          };
        }
      }
    } catch (e) {
      console.warn("NutriPlan search fallback:", e);
    }

    try {
      const queryParams = new URLSearchParams({
        page: options.page || 1,
        page_size: options.pageSize || 24,
        json: 1,
        search_simple: 1,
        action: "process",
        ...(searchTerms && { search_terms: searchTerms }),
        ...(options.categories && { categories_tags_en: options.categories }),
        ...(options.nutritionGrade && {
          nutrition_grades_tags: options.nutritionGrade,
        }),
      });

      const offResponse = await fetch(
        `${OPEN_FOOD_FACTS_API_BASE}/cgi/search.pl?${queryParams}`
      );
      if (offResponse.ok) {
        const offData = await offResponse.json();
        const products = (offData.products || []).map((p) => this.formatProduct(p));
        if (products.length > 0) {
          return {
            count: offData.count || products.length,
            page: offData.page || 1,
            pageSize: offData.page_size || 24,
            products: products,
          };
        }
      }
    } catch (e) {}

    return this.fallbackProductSearch(options);
  },

  async getProductByBarcode(barcode) {
    try {
      const response = await fetch(
        `${NUTRIPLAN_API_BASE}/products/barcode/${encodeURIComponent(barcode)}`,
        {
          headers: { "x-api-key": NUTRIPLAN_API_KEY },
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          return this.formatProduct(data.data);
        }
        if (data.product) {
          return this.formatProduct(data.product);
        }
      }
    } catch (err) {
      console.warn("NutriPlan barcode lookup fallback:", err);
    }

    try {
      const offResponse = await fetch(
        `${OPEN_FOOD_FACTS_API_BASE}/api/v0/product/${encodeURIComponent(barcode)}.json`
      );
      if (offResponse.ok) {
        const offData = await offResponse.json();
        if (offData.status !== 0 && offData.product) {
          return this.formatProduct(offData.product);
        }
      }
    } catch (e) {}

    const fallback = this.fallbackProductSearch({}).products.find(
      (p) => p.barcode === barcode
    );
    return fallback || null;
  },

  async getProductsByCategory(category, page = 1, pageSize = 24) {
    try {
      const response = await fetch(
        `${NUTRIPLAN_API_BASE}/products/category/${encodeURIComponent(category)}?page=${page}&pageSize=${pageSize}`,
        {
          headers: { "x-api-key": NUTRIPLAN_API_KEY },
        }
      );
      if (response.ok) {
        const data = await response.json();
        const rawProducts = data.results || data.products || [];
        if (rawProducts.length > 0) {
          return {
            count: data.count || rawProducts.length,
            page: data.page || page,
            products: rawProducts.map((p) => this.formatProduct(p)),
          };
        }
      }
    } catch (e) {
      console.warn("NutriPlan category fetch fallback:", e);
    }

    try {
      const offResponse = await fetch(
        `${OPEN_FOOD_FACTS_API_BASE}/category/${encodeURIComponent(category)}.json?page=${page}&page_size=${pageSize}`
      );
      if (offResponse.ok) {
        const offData = await offResponse.json();
        if (offData.products && offData.products.length > 0) {
          return {
            count: offData.count || offData.products.length,
            page: offData.page || page,
            products: offData.products.map((p) => this.formatProduct(p)),
          };
        }
      }
    } catch (e) {}

    return this.fallbackProductSearch({ searchTerms: category });
  },

  async getPopularCategories() {
    try {
      const response = await fetch(`${NUTRIPLAN_API_BASE}/products/categories`, {
        headers: { "x-api-key": NUTRIPLAN_API_KEY },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          return data.data;
        }
        if (Array.isArray(data.categories) && data.categories.length > 0) {
          return data.categories;
        }
      }
    } catch (e) {
      console.warn("Using default product categories:", e);
    }

    return [
      {
        id: "breakfast_cereals",
        name: "Breakfast Cereals",
        icon: "fa-wheat-awn",
      },
      { id: "beverages", name: "Beverages", icon: "fa-bottle-water" },
      { id: "snacks", name: "Snacks", icon: "fa-cookie" },
      { id: "dairy", name: "Dairy Products", icon: "fa-cheese" },
      { id: "fruits", name: "Fruits", icon: "fa-apple-whole" },
      { id: "vegetables", name: "Vegetables", icon: "fa-carrot" },
      { id: "breads", name: "Breads", icon: "fa-bread-slice" },
      { id: "meats", name: "Meats", icon: "fa-drumstick-bite" },
      { id: "frozen_foods", name: "Frozen Foods", icon: "fa-snowflake" },
      { id: "sauces", name: "Sauces & Condiments", icon: "fa-jar" },
    ];
  },

  formatProduct(raw) {
    return {
      barcode: raw.code || raw._id || raw.barcode, 
      name: raw.product_name|| raw.name || raw.product_name_en || "Unknown Product",
      brand: raw.brands|| raw.brand || "",
      categories: raw.categories || "",
      image: raw.image_front_url || raw.image || raw.image_url || null,
      thumbnailImage: raw.image_front_small_url || raw.image_small_url || null,
      nutritionGrade: raw.nutrition_grades || raw.nutritionGrade || raw.nutrition_grade_fr || null,
      novaGroup: raw.nova_group || raw.novaGroup || null,
      ecoscore: raw.ecoscore_grade || null,
      ingredients: raw.ingredients_text || raw.ingredients_text_en || "",
      allergens: raw.allergens || "",
      quantity: raw.quantity || "",
      servingSize: raw.serving_size || "",
      nutrition: {
        calories: raw.nutriments?.["energy-kcal_100g"] || raw.nutriments?.energy_100g || raw.nutrients.calories || 0,
        fat: raw.nutriments?.fat_100g || raw.nutrients.fat || 0,
        saturatedFat: raw.nutriments?.["saturated-fat_100g"] || 0,
        carbs: raw.nutriments?.carbohydrates_100g || raw.nutrients.carbs || 0,
        sugar: raw.nutriments?.sugars_100g || raw.nutrients.sugar || 0,
        fiber: raw.nutriments?.fiber_100g || raw.nutrients.fiber || 0,
        protein: raw.nutriments?.proteins_100g || raw.nutrients.protein || 0,
        salt: raw.nutriments?.salt_100g || 0,
        sodium: raw.nutriments?.sodium_100g || raw.nutrients.sodium || 0,
      },
      labels: raw.labels || "",
      origins: raw.origins || "",
      stores: raw.stores || "",
    };
  },

  getNutriScoreInfo(grade) {
    const scoreMap = {
      a: { label: "Excellent", color: "#038141", description: "Very good nutritional quality" },
      b: { label: "Good", color: "#85bb2f", description: "Good nutritional quality" },
      c: { label: "Average", color: "#fecb02", description: "Average nutritional quality" },
      d: { label: "Poor", color: "#ee8100", description: "Poor nutritional quality" },
      e: { label: "Bad", color: "#e63e11", description: "Bad nutritional quality" },
    };
    return scoreMap[grade?.toLowerCase()] || { label: "Unknown", color: "#999", description: "No score available" };
  },

  getNovaGroupInfo(group) {
    const groupMap = {
      1: { label: "Unprocessed", color: "#038141", description: "Unprocessed or minimally processed foods" },
      2: { label: "Processed Ingredients", color: "#85bb2f", description: "Processed culinary ingredients" },
      3: { label: "Processed", color: "#ee8100", description: "Processed foods" },
      4: { label: "Ultra-processed", color: "#e63e11", description: "Ultra-processed food and drink products" },
    };
    return groupMap[group] || { label: "Unknown", color: "#999", description: "No classification available" };
  },

  calculateNutritionPerServing(product, grams = 100) {
    const ratio = grams / 100;
    const nutrition = product.nutrition;
    return {
      calories: Math.round(nutrition.calories * ratio),
      fat: Math.round(nutrition.fat * ratio * 10) / 10,
      saturatedFat: Math.round(nutrition.saturatedFat * ratio * 10) / 10,
      carbs: Math.round(nutrition.carbs * ratio * 10) / 10,
      sugar: Math.round(nutrition.sugar * ratio * 10) / 10,
      fiber: Math.round(nutrition.fiber * ratio * 10) / 10,
      protein: Math.round(nutrition.protein * ratio * 10) / 10,
      salt: Math.round(nutrition.salt * ratio * 100) / 100,
      sodium: Math.round(nutrition.sodium * ratio),
    };
  },

  fallbackProductSearch(options = {}) {
    let mockProducts = [
      {
        code: "7613034626844",
        product_name: "Cheerios Original",
        brands: "Nestlé",
        categories: "Breakfast cereals",
        image_front_url: "https://images.openfoodfacts.org/images/products/761/303/462/6844/front_en.jpg",
        nutrition_grades: "a",
        nova_group: 4,
        nutriments: { "energy-kcal_100g": 372, fat_100g: 4.2, "saturated-fat_100g": 0.8, carbohydrates_100g: 74, sugars_100g: 4.8, fiber_100g: 8.6, proteins_100g: 8.4, salt_100g: 1.1 },
      },
      {
        code: "5000159484695",
        product_name: "Nutella",
        brands: "Ferrero",
        categories: "Spreads, Chocolate spreads",
        image_front_url: "https://images.openfoodfacts.org/images/products/500/015/948/4695/front_en.jpg",
        nutrition_grades: "e",
        nova_group: 4,
        nutriments: { "energy-kcal_100g": 539, fat_100g: 30.9, "saturated-fat_100g": 10.6, carbohydrates_100g: 57.5, sugars_100g: 56.3, fiber_100g: 0, proteins_100g: 6.3, salt_100g: 0.107 },
      },
      {
        code: "8410076472458",
        product_name: "Greek Yogurt",
        brands: "Danone",
        categories: "Dairy, Yogurts",
        nutrition_grades: "a",
        nova_group: 1,
        nutriments: { "energy-kcal_100g": 97, fat_100g: 5, "saturated-fat_100g": 3.3, carbohydrates_100g: 3.6, sugars_100g: 3.6, proteins_100g: 9, salt_100g: 0.1 },
      },
      {
        code: "5449000000996",
        product_name: "Coca-Cola Original",
        brands: "Coca-Cola",
        categories: "Beverages, Sodas",
        nutrition_grades: "e",
        nova_group: 4,
        nutriments: { "energy-kcal_100g": 42, fat_100g: 0, carbohydrates_100g: 10.6, sugars_100g: 10.6, proteins_100g: 0, salt_100g: 0 },
      },
    ];

    if (options.searchTerms) {
      const term = options.searchTerms.toLowerCase();
      mockProducts = mockProducts.filter((p) => p.product_name.toLowerCase().includes(term) || p.brands.toLowerCase().includes(term));
    }

    if (options.nutritionGrade) {
      mockProducts = mockProducts.filter((p) => p.nutrition_grades === options.nutritionGrade.toLowerCase());
    }

    return {
      count: mockProducts.length,
      page: options.page || 1,
      pageSize: options.pageSize || 24,
      products: mockProducts.map(this.formatProduct),
    };
  },
};

// =============================================================================
// 5. APPLICATION STATE MANAGEMENT
// =============================================================================

const AppState = {
  state: {
    currentPage: "meals",
    searchQuery: "",
    selectedCategory: null,
    selectedArea: null,
    selectedMeal: null,
    selectedMealId: null,
    categories: [],
    areas: [],
    meals: [],
    featuredMeals: [],
    searchedProducts: [],
    mealNutritionCache: {},
    isLoading: false,
    error: null,
    userSettings: { ...DEFAULT_USER_SETTINGS },
    savedRecipes: [],
    dailyLog: {},
    shoppingList: [],
    streaks: { nutrition: 0, maxNutrition: 0 },
  },

  initializeState() {
    const savedSettings = localStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
    this.state.userSettings = savedSettings ? JSON.parse(savedSettings) : { ...DEFAULT_USER_SETTINGS };

    const savedRecipes = localStorage.getItem(STORAGE_KEYS.SAVED_RECIPES);
    this.state.savedRecipes = savedRecipes ? JSON.parse(savedRecipes) : [];

    const savedDailyLog = localStorage.getItem(STORAGE_KEYS.DAILY_LOG);
    this.state.dailyLog = savedDailyLog ? JSON.parse(savedDailyLog) : {};

    const savedShoppingList = localStorage.getItem(STORAGE_KEYS.SHOPPING_LIST);
    this.state.shoppingList = savedShoppingList ? JSON.parse(savedShoppingList) : [];

    this.state.streaks = this.calculateStreaks(this.state.dailyLog);
    return this.state;
  },

  calculateStreaks(dailyLog) {
    const today = new Date();
    let currentStreak = 0;
    let maxStreak = 0;
    for (let dayOffset = 0; dayOffset < 365; dayOffset++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - dayOffset);
      const dateKey = checkDate.toISOString().split("T")[0];
      const logEntry = dailyLog[dateKey];
      if (logEntry && logEntry.totalCalories > 0) {
        if (dayOffset === currentStreak) currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else if (dayOffset > 0) {
        break;
      }
    }
    return { nutrition: currentStreak, maxNutrition: maxStreak };
  },

  getState() {
    return this.state;
  },

  updateState(partialUpdates, shouldPersist = false) {
    Object.assign(this.state, partialUpdates);
    if (shouldPersist) {
      if (partialUpdates.savedRecipes !== undefined) {
        localStorage.setItem(STORAGE_KEYS.SAVED_RECIPES, JSON.stringify(this.state.savedRecipes));
      }
      if (partialUpdates.dailyLog !== undefined) {
        localStorage.setItem(STORAGE_KEYS.DAILY_LOG, JSON.stringify(this.state.dailyLog));
      }
      if (partialUpdates.userSettings !== undefined) {
        localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(this.state.userSettings));
      }
      if (partialUpdates.shoppingList !== undefined) {
        localStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(this.state.shoppingList));
      }
    }
    window.dispatchEvent(new CustomEvent("stateChange", { detail: partialUpdates }));
  },

  saveRecipe(recipe) {
    if (!this.state.savedRecipes.some((r) => r.idMeal === recipe.idMeal)) {
      this.state.savedRecipes.push({ ...recipe, savedAt: new Date().toISOString() });
      this.updateState({ savedRecipes: this.state.savedRecipes }, true);
    }
  },

  unsaveRecipe(mealId) {
    this.state.savedRecipes = this.state.savedRecipes.filter((r) => r.idMeal !== mealId);
    this.updateState({ savedRecipes: this.state.savedRecipes }, true);
  },

  isRecipeSaved(mealId) {
    return this.state.savedRecipes.some((r) => r.idMeal === mealId);
  },

  logDailyNutrition(dateKey, mealData) {
    if (!this.state.dailyLog[dateKey]) {
      this.state.dailyLog[dateKey] = {
        meals: [],
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        water: 0,
      };
    }
    this.state.dailyLog[dateKey].meals.push(mealData);
    this.state.dailyLog[dateKey].totalCalories += mealData.calories || 0;
    this.state.dailyLog[dateKey].totalProtein += mealData.protein || 0;
    this.state.dailyLog[dateKey].totalCarbs += mealData.carbs || 0;
    this.state.dailyLog[dateKey].totalFat += mealData.fat || 0;
    this.updateState({ dailyLog: this.state.dailyLog }, true);
  },

  logWaterIntake(dateKey, amount) {
    if (!this.state.dailyLog[dateKey]) {
      this.state.dailyLog[dateKey] = {
        meals: [],
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        water: 0,
        waterLog: [],
      };
    }
    this.state.dailyLog[dateKey].water = (this.state.dailyLog[dateKey].water || 0) + amount;
    this.state.dailyLog[dateKey].waterLog = this.state.dailyLog[dateKey].waterLog || [];
    this.state.dailyLog[dateKey].waterLog.push({ amount, time: new Date().toISOString() });
    this.updateState({ dailyLog: this.state.dailyLog }, true);
  },

  getTodayWaterIntake() {
    const today = this.getTodayString();
    const log = this.state.dailyLog[today] || { water: 0, waterLog: [] };
    const goal = this.state.userSettings.waterGoal;
    const glassSize = this.state.userSettings.waterGlassSize;
    return {
      current: log.water || 0,
      goal: goal,
      glassSize: glassSize,
      glasses: Math.floor((log.water || 0) / glassSize),
      targetGlasses: Math.ceil(goal / glassSize),
      percentage: Math.min(100, Math.round(((log.water || 0) / goal) * 100)),
      log: log.waterLog || [],
    };
  },

  logWaterGlass() {
    const today = this.getTodayString();
    const glassSize = this.state.userSettings.waterGlassSize;
    this.logWaterIntake(today, glassSize);
    return this.getTodayWaterIntake();
  },

  updateUserSettings(newSettings) {
    this.state.userSettings = { ...this.state.userSettings, ...newSettings };
    this.updateState({ userSettings: this.state.userSettings }, true);
  },

  getTodayString() {
    return new Date().toISOString().split("T")[0];
  },

  getWeeklySummary() {
    const today = new Date();
    const days = [];
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      days.push(date.toISOString().split("T")[0]);
    }
    return days.map((dateStr) => ({
      date: dateStr,
      dayName: new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" }),
      nutrition: this.state.dailyLog[dateStr] || { totalCalories: 0 },
    }));
  },
};

// =============================================================================
// 6. UI COMPONENTS TEMPLATES
// =============================================================================

const UIComponents = {
  createMealCard(meal) {
    return `
      <div class="recipe-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group" data-meal-id="${meal.idMeal}">
        <div class="relative h-48 overflow-hidden">
          <img 
            class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
            src="${meal.strMealThumb}" 
            alt="${meal.strMeal}"
            loading="lazy"
          />
          <div class="absolute bottom-3 left-3 flex gap-2">
            ${meal.strCategory
        ? `<span class="px-2 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold rounded-lg">
                    <i class="fa-solid fa-tag text-emerald-600 mr-1"></i>${meal.strCategory}
                   </span>`
        : ""
      }
            ${meal.strArea
        ? `<span class="px-2 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold rounded-lg">
                    <i class="fa-solid fa-globe text-blue-600 mr-1"></i>${meal.strArea}
                   </span>`
        : ""
      }
          </div>
        </div>
        <div class="p-4">
          <h3 class="text-base font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors line-clamp-1">
            ${meal.strMeal}
          </h3>
          <p class="text-xs text-gray-600 mb-3 line-clamp-2">
            ${meal.strInstructions ? meal.strInstructions.substring(0, 100) + "..." : "Delicious recipe to try!"}
          </p>
          <div class="flex items-center justify-between text-xs">
            <span class="font-semibold text-gray-900">
              <i class="fa-solid fa-utensils text-emerald-600 mr-1"></i>
              ${meal.strCategory || "Various"}
            </span>
            <span class="font-semibold text-gray-500">
              <i class="fa-solid fa-globe text-blue-500 mr-1"></i>
              ${meal.strArea || "International"}
            </span>
          </div>
        </div>
      </div>
    `;
  },

  createCategoryCard(category) {
    const categoryStyles = {
      Beef: { bg: "from-red-50 to-rose-50", border: "border-red-200 hover:border-red-400", iconFrom: "from-red-400", iconTo: "to-rose-500" },
      Chicken: { bg: "from-amber-50 to-orange-50", border: "border-amber-200 hover:border-amber-400", iconFrom: "from-amber-400", iconTo: "to-orange-500" },
      Dessert: { bg: "from-pink-50 to-rose-50", border: "border-pink-200 hover:border-pink-400", iconFrom: "from-pink-400", iconTo: "to-rose-500" },
      Lamb: { bg: "from-orange-50 to-amber-50", border: "border-orange-200 hover:border-orange-400", iconFrom: "from-orange-400", iconTo: "to-amber-500" },
      Miscellaneous: { bg: "from-slate-50 to-gray-50", border: "border-slate-200 hover:border-slate-400", iconFrom: "from-slate-400", iconTo: "to-gray-500" },
      Pasta: { bg: "from-yellow-50 to-amber-50", border: "border-yellow-200 hover:border-yellow-400", iconFrom: "from-yellow-400", iconTo: "to-amber-500" },
      Pork: { bg: "from-rose-50 to-red-50", border: "border-rose-200 hover:border-rose-400", iconFrom: "from-rose-400", iconTo: "to-red-500" },
      Seafood: { bg: "from-cyan-50 to-blue-50", border: "border-cyan-200 hover:border-cyan-400", iconFrom: "from-cyan-400", iconTo: "to-blue-500" },
      Side: { bg: "from-green-50 to-emerald-50", border: "border-green-200 hover:border-green-400", iconFrom: "from-green-400", iconTo: "to-emerald-500" },
      Starter: { bg: "from-teal-50 to-cyan-50", border: "border-teal-200 hover:border-teal-400", iconFrom: "from-teal-400", iconTo: "to-cyan-500" },
      Vegan: { bg: "from-emerald-50 to-green-50", border: "border-emerald-200 hover:border-emerald-400", iconFrom: "from-emerald-400", iconTo: "to-green-500" },
      Vegetarian: { bg: "from-lime-50 to-green-50", border: "border-lime-200 hover:border-lime-400", iconFrom: "from-lime-400", iconTo: "to-green-500" },
      Breakfast: { bg: "from-amber-50 to-orange-50", border: "border-amber-200 hover:border-amber-400", iconFrom: "from-amber-400", iconTo: "to-orange-500" },
      Goat: { bg: "from-stone-50 to-amber-50", border: "border-stone-200 hover:border-stone-400", iconFrom: "from-stone-400", iconTo: "to-amber-500" },
    };

    const style = categoryStyles[category.strCategory] || categoryStyles.Miscellaneous;
    const categoryIcons = {
      Beef: "fa-drumstick-bite",
      Chicken: "fa-drumstick-bite",
      Dessert: "fa-cake-candles",
      Lamb: "fa-drumstick-bite",
      Pasta: "fa-bowl-food",
      Pork: "fa-bacon",
      Seafood: "fa-fish",
      Side: "fa-plate-wheat",
      Starter: "fa-utensils",
      Vegan: "fa-leaf",
      Vegetarian: "fa-seedling",
      Breakfast: "fa-mug-hot",
      Miscellaneous: "fa-bowl-rice",
      Goat: "fa-drumstick-bite",
    };
    const iconName = categoryIcons[category.strCategory] || "fa-utensils";

    return `
      <div class="category-card bg-gradient-to-br ${style.bg} rounded-xl p-3 border ${style.border} hover:shadow-md cursor-pointer transition-all group" data-category="${category.strCategory}">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 bg-gradient-to-br ${style.iconFrom} ${style.iconTo} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
            <i class="fa-solid ${iconName} text-white text-sm"></i>
          </div>
          <div>
            <h3 class="text-sm font-bold text-gray-900">${category.strCategory}</h3>
          </div>
        </div>
      </div>
    `;
  },

  createAreaFilters(areas = [], selectedArea = null) {
    return `
      <button class="area-filter-btn px-4 py-2 ${selectedArea ? "bg-gray-100 text-gray-700" : "bg-emerald-600 text-white"} rounded-full font-medium text-sm whitespace-nowrap hover:bg-emerald-700 hover:text-white transition-all" data-area="">
        All Cuisines
      </button>
      ${areas
        .map(
          (item) => `
        <button class="area-filter-btn px-4 py-2 ${selectedArea === item.strArea ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-700"} rounded-full font-medium text-sm whitespace-nowrap hover:bg-gray-200 transition-all" data-area="${item.strArea}">
          ${item.strArea}
        </button>
      `
        )
        .join("")}
    `;
  },

  createLoadingSpinner() {
    return `
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    `;
  },

  createEmptyState(message, iconName = "fa-search") {
    return `
      <div class="flex flex-col items-center justify-center py-12 text-center">
        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <i class="fa-solid ${iconName} text-gray-400 text-2xl"></i>
        </div>
        <p class="text-gray-500 text-lg">${message}</p>
      </div>
    `;
  },

  createProductCategoryButton(category) {
    const gradients = {
      breakfast_cereals: "linear-gradient(to right, #f59e0b, #f97316)",
      beverages: "linear-gradient(to right, #3b82f6, #06b6d4)",
      snacks: "linear-gradient(to right, #a855f7, #ec4899)",
      dairy: "linear-gradient(to right, #38bdf8, #3b82f6)",
      fruits: "linear-gradient(to right, #ef4444, #f43f5e)",
      vegetables: "linear-gradient(to right, #22c55e, #10b981)",
      breads: "linear-gradient(to right, #d97706, #eab308)",
      meats: "linear-gradient(to right, #dc2626, #e11d48)",
      frozen_foods: "linear-gradient(to right, #06b6d4, #2563eb)",
      sauces: "linear-gradient(to right, #f97316, #dc2626)",
    };
    const gradient =
      gradients[category.id] || "linear-gradient(to right, #034ee2, #99bcec)";

    return `
      <button class="product-category-btn flex-shrink-0 px-5 py-3 text-white rounded-xl font-semibold hover:shadow-lg transition-all cursor-pointer flex items-center shadow-xs" style="background: ${gradient};" data-category="${category.id}">
        <i class="fa-solid ${category.icon} mr-2"></i>
        <span>${category.name}</span>
      </button>
    `;
  },

  createProductCard(product) {
    const nutriScore = ProductAPI.getNutriScoreInfo(product.nutritionGrade);
    const novaInfo = ProductAPI.getNovaGroupInfo(product.novaGroup);

    return `
      <div class="product-card bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 cursor-pointer flex flex-col group" data-barcode="${product.barcode}">
        <div class="relative h-48 bg-gray-50 p-4 flex items-center justify-center overflow-hidden">
          ${product.image || product.thumbnailImage
        ? `<img src="${product.image || product.thumbnailImage}" alt="${product.name}" class="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" loading="lazy"/>`
        : `<div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <i class="fa-solid fa-box text-gray-400 text-2xl"></i>
                </div>`
      }

          <!-- Nutri-Score Badge -->
          ${product.nutritionGrade
        ? `<div class="absolute top-2 left-2 text-white text-xs font-bold px-2 py-1 rounded uppercase shadow-xs" style="background-color: ${nutriScore.color}">
                  Nutri-Score ${product.nutritionGrade.toUpperCase()}
                </div>`
        : ""
      }

          <!-- NOVA Badge -->
          ${product.novaGroup
        ? `<div class="absolute top-2 right-2 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-xs" style="background-color: ${novaInfo.color}" title="NOVA ${product.novaGroup}">
                  ${product.novaGroup}
                </div>`
        : ""
      }
        </div>

        <div class="p-4 flex-1 flex flex-col justify-between">
          <div>
            <p class="text-xs text-emerald-600 font-semibold mb-1 truncate">${product.brand || "Brand Unknown"}</p>
            <h3 class="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors text-sm">
              ${product.name}
            </h3>

            <div class="flex items-center gap-3 text-xs text-gray-500 mb-3">
              ${product.quantity ? `<span><i class="fa-solid fa-weight-scale mr-1"></i>${product.quantity}</span>` : ""}
              ${product.nutrition?.calories ? `<span><i class="fa-solid fa-fire mr-1"></i>${Math.round(product.nutrition.calories)} kcal/100g</span>` : ""}
            </div>
          </div>

          <!-- Mini Nutrition -->
          <div class="grid grid-cols-4 gap-1 text-center border-t border-gray-100 pt-2.5">
            <div class="bg-emerald-50 rounded p-1.5">
              <p class="text-xs font-bold text-emerald-700">${Number(product.nutrition.protein || 0).toFixed(1)}g</p>
              <p class="text-[10px] text-gray-500">Protein</p>
            </div>
            <div class="bg-blue-50 rounded p-1.5">
              <p class="text-xs font-bold text-blue-700">${Number(product.nutrition.carbs || 0).toFixed(1)}g</p>
              <p class="text-[10px] text-gray-500">Carbs</p>
            </div>
            <div class="bg-purple-50 rounded p-1.5">
              <p class="text-xs font-bold text-purple-700">${Number(product.nutrition.fat || 0).toFixed(1)}g</p>
              <p class="text-[10px] text-gray-500">Fat</p>
            </div>
            <div class="bg-orange-50 rounded p-1.5">
              <p class="text-xs font-bold text-orange-700">${Number(product.nutrition.sugar || 0).toFixed(1)}g</p>
              <p class="text-[10px] text-gray-500">Sugar</p>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  createProductDetailContent(product, nutriScore, novaInfo) {
    const n = product.nutrition || {};
    return `
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-start gap-6 mb-6">
          <div class="w-32 h-32 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
            ${
              product.image || product.thumbnailImage
                ? `<img src="${product.image || product.thumbnailImage}" alt="${product.name}" class="w-full h-full object-contain"/>`
                : `<i class="fa-solid fa-box text-gray-400 text-4xl"></i>`
            }
          </div>
          <div class="flex-1">
            <p class="text-sm text-emerald-600 font-semibold mb-1">${product.brand || "Unknown Brand"}</p>
            <h2 class="text-2xl font-bold text-gray-900 mb-2">${product.name}</h2>
            <p class="text-sm text-gray-500 mb-3">${product.quantity || product.servingSize || ""}</p>

            <div class="flex items-center gap-3">
              ${
                product.nutritionGrade
                  ? `<div class="flex items-center gap-2 px-3 py-1.5 rounded-lg" style="background-color: ${nutriScore.color}20">
                      <span class="w-8 h-8 rounded flex items-center justify-center text-white font-bold" style="background-color: ${nutriScore.color}">
                        ${product.nutritionGrade.toUpperCase()}
                      </span>
                      <div>
                        <p class="text-xs font-bold" style="color: ${nutriScore.color}">Nutri-Score</p>
                        <p class="text-[10px] text-gray-600">${nutriScore.label}</p>
                      </div>
                    </div>`
                  : ""
              }

              ${
                product.novaGroup
                  ? `<div class="flex items-center gap-2 px-3 py-1.5 rounded-lg" style="background-color: ${novaInfo.color}20">
                      <span class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold" style="background-color: ${novaInfo.color}">
                        ${product.novaGroup}
                      </span>
                      <div>
                        <p class="text-xs font-bold" style="color: ${novaInfo.color}">NOVA</p>
                        <p class="text-[10px] text-gray-600">${novaInfo.label}</p>
                      </div>
                    </div>`
                  : ""
              }
            </div>
          </div>
          <button class="close-product-modal text-gray-400 hover:text-gray-600 cursor-pointer">
            <i class="fa-solid fa-times text-2xl"></i>
          </button>
        </div>

        <!-- Nutrition Facts -->
        <div class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 mb-6 border border-emerald-200">
          <h3 class="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i class="fa-solid fa-chart-pie text-emerald-600"></i>
            Nutrition Facts <span class="text-sm font-normal text-gray-500">(per 100g)</span>
          </h3>

          <div class="text-center mb-4 pb-4 border-b border-emerald-200">
            <p class="text-4xl font-bold text-gray-900">${Math.round(n.calories || 0)}</p>
            <p class="text-sm text-gray-500">Calories</p>
          </div>

          <div class="grid grid-cols-4 gap-4">
            <div class="text-center">
              <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div class="bg-emerald-500 h-2 rounded-full" style="width: ${Math.min(((n.protein || 0) / 50) * 100, 100)}%"></div>
              </div>
              <p class="text-lg font-bold text-emerald-600">${Number(n.protein || 0).toFixed(1)}g</p>
              <p class="text-xs text-gray-500">Protein</p>
            </div>
            <div class="text-center">
              <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div class="bg-blue-500 h-2 rounded-full" style="width: ${Math.min(((n.carbs || 0) / 100) * 100, 100)}%"></div>
              </div>
              <p class="text-lg font-bold text-blue-600">${Number(n.carbs || 0).toFixed(1)}g</p>
              <p class="text-xs text-gray-500">Carbs</p>
            </div>
            <div class="text-center">
              <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div class="bg-purple-500 h-2 rounded-full" style="width: ${Math.min(((n.fat || 0) / 65) * 100, 100)}%"></div>
              </div>
              <p class="text-lg font-bold text-purple-600">${Number(n.fat || 0).toFixed(1)}g</p>
              <p class="text-xs text-gray-500">Fat</p>
            </div>
            <div class="text-center">
              <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div class="bg-orange-500 h-2 rounded-full" style="width: ${Math.min(((n.sugar || 0) / 50) * 100, 100)}%"></div>
              </div>
              <p class="text-lg font-bold text-orange-600">${Number(n.sugar || 0).toFixed(1)}g</p>
              <p class="text-xs text-gray-500">Sugar</p>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-emerald-200">
            <div class="text-center">
              <p class="text-sm font-semibold text-gray-900">${Number(n.saturatedFat || 0).toFixed(1)}g</p>
              <p class="text-xs text-gray-500">Saturated Fat</p>
            </div>
            <div class="text-center">
              <p class="text-sm font-semibold text-gray-900">${Number(n.fiber || 0).toFixed(1)}g</p>
              <p class="text-xs text-gray-500">Fiber</p>
            </div>
            <div class="text-center">
              <p class="text-sm font-semibold text-gray-900">${Number(n.salt || 0).toFixed(2)}g</p>
              <p class="text-xs text-gray-500">Salt</p>
            </div>
          </div>
        </div>

        <!-- Ingredients -->
        ${
          product.ingredients
            ? `<div class="bg-gray-50 rounded-xl p-5 mb-6">
                <h3 class="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <i class="fa-solid fa-list text-gray-600"></i>
                  Ingredients
                </h3>
                <p class="text-sm text-gray-600 leading-relaxed">${product.ingredients}</p>
              </div>`
            : ""
        }

        <!-- Allergens -->
        ${
          product.allergens
            ? `<div class="bg-red-50 rounded-xl p-5 mb-6 border border-red-200">
                <h3 class="font-bold text-red-700 mb-2 flex items-center gap-2">
                  <i class="fa-solid fa-triangle-exclamation"></i>
                  Allergens
                </h3>
                <p class="text-sm text-red-600">${product.allergens}</p>
              </div>`
            : ""
        }

        <!-- Actions -->
        <div class="flex gap-3">
          <button class="add-product-to-log flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all cursor-pointer flex items-center justify-center gap-2" data-barcode="${product.barcode}">
            <i class="fa-solid fa-plus"></i> Log This Food
          </button>
          <button class="close-product-modal flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all cursor-pointer">
            Close
          </button>
        </div>
      </div>
    `;
  },
};

// =============================================================================
// 7. MAIN APPLICATION CLASS (NutriPlanApp)
// =============================================================================

class NutriPlanApp {
  constructor() {
    this.currentPage = "meals";
    this.debounceTimer = null;
    this.init();
  }

  async init() {
    AppState.initializeState();
    this.setupGlobalEventListeners();
    await this.loadInitialData();
    this.renderPage("meals");
    this.hideLoadingOverlay();
  }

  hideLoadingOverlay() {
    const overlay = document.getElementById("app-loading-overlay");
    if (overlay) {
      overlay.style.opacity = "0";
      setTimeout(() => {
        overlay.style.display = "none";
      }, 500);
    }
  }

  setupGlobalEventListeners() {
    // Navigation Links
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const href = (link.getAttribute("href") || "").toLowerCase();
        const text = (link.innerText || "").toLowerCase();
        let pageTarget = "meals";
        if (href.includes("products") || text.includes("product")) pageTarget = "products";
        else if (href.includes("foodlog") || text.includes("food log")) pageTarget = "foodlog";
        else if (href.includes("settings") || text.includes("settings")) pageTarget = "settings";
        else if (href.includes("meals") || text.includes("meals")) pageTarget = "meals";

        this.navigateTo(pageTarget);
      });
    });

    // Mobile Sidebar Toggles
    const menuBtn = document.getElementById("header-menu-btn");
    const closeBtn = document.getElementById("sidebar-close-btn");
    const sidebarOverlay = document.getElementById("sidebar-overlay");
    const sidebar = document.getElementById("sidebar");

    const toggleSidebar = () => {
      sidebar?.classList.toggle("open");
      sidebarOverlay?.classList.toggle("active");
    };

    menuBtn?.addEventListener("click", toggleSidebar);
    closeBtn?.addEventListener("click", toggleSidebar);
    sidebarOverlay?.addEventListener("click", toggleSidebar);

    // Global Click Dispatcher
    document.addEventListener("click", (event) => this.handleGlobalClick(event));

    // Search Input
    const searchInput = document.getElementById("search-input");
    searchInput?.addEventListener("input", (event) => this.handleSearch(event));
  }

  handleGlobalClick(event) {
    const target = event.target;

    // Click recipe card
    const recipeCard = target.closest(".recipe-card");
    if (recipeCard) {
      const mealId = recipeCard.dataset.mealId;
      if (mealId) this.showMealDetail(mealId);
      return;
    }

    // Click category card
    const categoryCard = target.closest(".category-card");
    if (categoryCard) {
      const categoryName = categoryCard.dataset.category;
      if (categoryName) this.filterByCategory(categoryName);
      return;
    }

    // Click area filter button
    const areaBtn = target.closest(".area-filter-btn");
    if (areaBtn) {
      const areaName = areaBtn.dataset.area;
      this.filterByArea(areaName);
      return;
    }

    // Click product card
    const productCard = target.closest(".product-card");
    if (productCard) {
      const barcode = productCard.dataset.barcode;
      if (barcode) this.openProductModalByBarcode(barcode);
      return;
    }

    // Close detail buttons
    if (target.closest(".close-detail-btn") || target.closest("#back-to-meals-btn")) {
      this.navigateTo("meals");
      return;
    }
  }

  handleSearch(event) {
    const query = event.target.value.trim();
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      if (query.length >= 2) {
        this.performSearch(query);
      } else if (query.length === 0) {
        this.loadAllRecipes();
      }
    }, 300);
  }

  async performSearch(searchQuery) {
    AppState.updateState({ isLoading: true, searchQuery: searchQuery });
    const recipesGrid = document.querySelector("#all-recipes-section .grid");
    if (recipesGrid) recipesGrid.innerHTML = UIComponents.createLoadingSpinner();

    try {
      const results = await MealAPI.searchMealsByName(searchQuery);
      AppState.updateState({ meals: results, isLoading: false });
      this.renderRecipeGrid(results);
      const countLabel = document.querySelector("#all-recipes-section p.text-gray-600");
      if (countLabel) countLabel.textContent = `Showing ${results.length} recipes for "${searchQuery}"`;
    } catch (error) {
      console.error("Search error:", error);
      AppState.updateState({ isLoading: false, error: error.message });
    }
  }

  async loadInitialData() {
    try {
      const [categories, areas, defaultMeals] = await Promise.all([
        MealAPI.getAllCategories(),
        MealAPI.getAreaList(),
        MealAPI.searchMealsByName("chicken"),
      ]);
      AppState.updateState({
        categories: categories,
        areas: areas,
        meals: defaultMeals,
      });
    } catch (error) {
      console.error("Error loading initial data:", error);
    }
  }

  async loadAllRecipes() {
    const results = await MealAPI.searchMealsByName("");
    const mealsToRender = results.length > 0 ? results : await MealAPI.searchMealsByName("chicken");
    AppState.updateState({ meals: mealsToRender });
    this.renderRecipeGrid(mealsToRender);
  }

  navigateTo(pageName) {
    this.renderPage(pageName);
  }

  renderPage(pageName) {
    this.currentPage = pageName;
    this.updateHeader(pageName);
    this.updateActiveNavLink(pageName);

    // Hide all major sections
    const allSections = [
      "search-filters-section",
      "meal-categories-section",
      "all-recipes-section",
      "meal-details",
      "meal-detail-section",
      "products-section",
      "foodlog-section",
      "settings-section",
    ];

    allSections.forEach((sectionId) => {
      const el = document.getElementById(sectionId);
      if (el) el.style.display = "none";
    });

    switch (pageName) {
      case "meals":
        this.showMealsPage();
        break;
      case "products":
        this.showProductsPage();
        break;
      case "foodlog":
        this.showFoodLogPage();
        break;
      case "settings":
        this.showSettingsPage();
        break;
      case "meal-detail":
        this.showMealDetailPage();
        break;
      default:
        this.showMealsPage();
        break;
    }
  }

  updateActiveNavLink(pageName) {
    const navLinks = document.querySelectorAll("#sidebar nav a.nav-link");
    const pages = ["meals", "products", "foodlog"];
    navLinks.forEach((link, index) => {
      const isCurrent = pages[index] === pageName || (pageName === "meal-detail" && pages[index] === "meals");
      if (isCurrent) {
        link.classList.add("bg-emerald-50", "text-emerald-700");
        link.classList.remove("text-gray-600");
        link.querySelector("span")?.classList.add("font-semibold");
        link.querySelector("span")?.classList.remove("font-medium");
      } else {
        link.classList.remove("bg-emerald-50", "text-emerald-700");
        link.classList.add("text-gray-600");
        link.querySelector("span")?.classList.remove("font-semibold");
        link.querySelector("span")?.classList.add("font-medium");
      }
    });
  }

  updateHeader(pageName) {
    const titleEl = document.querySelector("#header h1");
    const subtitleEl = document.querySelector("#header p");

    const headerContent = {
      meals: {
        title: "Meals & Recipes",
        subtitle: "Discover delicious and nutritious recipes tailored for you",
      },
      products: {
        title: "Product Scanner",
        subtitle: "Search packaged foods by name or barcode",
      },
      foodlog: {
        title: "Food Log",
        subtitle: "Track your daily nutrition and food intake",
      },
      settings: {
        title: "Settings",
        subtitle: "Customize your goals and preferences",
      },
      "meal-detail": {
        title: "Recipe Details",
        subtitle: "View full recipe information and nutrition facts",
      },
    };

    if (titleEl && headerContent[pageName]) titleEl.textContent = headerContent[pageName].title;
    if (subtitleEl && headerContent[pageName]) subtitleEl.textContent = headerContent[pageName].subtitle;
  }

  showMealsPage() {
    this.toggleSections(["search-filters-section", "meal-categories-section", "all-recipes-section"], true);
    this.renderCategories();
    this.renderRecipeGrid(AppState.getState().meals);
    this.renderAreaFilters();
  }

  toggleSections(sectionIds, isVisible) {
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = isVisible ? "" : "none";
    });
  }

  renderCategories() {
    const container = document.getElementById("categories-grid");
    if (!container) return;
    const categoriesList = AppState.getState().categories || [];
    container.innerHTML = categoriesList
      .slice(0, 12)
      .map((cat) => UIComponents.createCategoryCard(cat))
      .join("");
  }

  renderRecipeGrid(mealsList) {
    const grid = document.querySelector("#all-recipes-section #recipes-grid") || document.querySelector("#all-recipes-section .grid");
    if (!grid) return;

    if (!mealsList || mealsList.length === 0) {
      grid.innerHTML = UIComponents.createEmptyState("No recipes found. Try a different search term.", "fa-utensils");
      return;
    }

    grid.innerHTML = mealsList.map((meal) => UIComponents.createMealCard(meal)).join("");
    const countLabel = document.querySelector("#all-recipes-section #recipes-count") || document.querySelector("#all-recipes-section p.text-gray-600");
    if (countLabel) countLabel.textContent = `Showing ${mealsList.length} recipes`;
  }

  renderAreaFilters() {
    const container = document.getElementById("area-filters") || document.querySelector("#search-filters-section .flex.items-center.gap-2\\.5");
    if (!container) return;
    const areasList = AppState.getState().areas || [];
    const selectedArea = AppState.getState().selectedArea;
    container.innerHTML = UIComponents.createAreaFilters(areasList.slice(0, 10), selectedArea);
  }

  async filterByCategory(categoryName) {
    AppState.updateState({ selectedCategory: categoryName, isLoading: true });
    const grid = document.querySelector("#all-recipes-section #recipes-grid") || document.querySelector("#all-recipes-section .grid");
    if (grid) grid.innerHTML = UIComponents.createLoadingSpinner();

    try {
      const mealPreviews = await MealAPI.filterMealsByCategory(categoryName);
      const detailedMeals = await Promise.all(mealPreviews.slice(0, 20).map((m) => MealAPI.getMealById(m.idMeal)));
      const filtered = detailedMeals.filter(Boolean);
      AppState.updateState({ meals: filtered, isLoading: false });
      this.renderRecipeGrid(filtered);

      const countLabel = document.querySelector("#all-recipes-section #recipes-count") || document.querySelector("#all-recipes-section p.text-gray-600");
      if (countLabel) countLabel.textContent = `Showing ${filtered.length} ${categoryName} recipes`;
    } catch (error) {
      console.error("Category filter error:", error);
      AppState.updateState({ isLoading: false });
    }
  }

  async filterByArea(areaName) {
    AppState.updateState({ selectedArea: areaName, isLoading: true });
    document.querySelectorAll(".area-filter-btn").forEach((btn) => {
      if (btn.dataset.area === areaName) {
        btn.classList.add("bg-emerald-600", "text-white");
        btn.classList.remove("bg-gray-100", "text-gray-700");
      } else {
        btn.classList.remove("bg-emerald-600", "text-white");
        btn.classList.add("bg-gray-100", "text-gray-700");
      }
    });

    const grid = document.querySelector("#all-recipes-section #recipes-grid") || document.querySelector("#all-recipes-section .grid");
    if (grid) grid.innerHTML = UIComponents.createLoadingSpinner();

    try {
      let results = [];
      if (areaName) {
        const mealPreviews = await MealAPI.filterMealsByArea(areaName);
        const detailedMeals = await Promise.all(mealPreviews.slice(0, 20).map((m) => MealAPI.getMealById(m.idMeal)));
        results = detailedMeals.filter(Boolean);
      } else {
        results = await MealAPI.searchMealsByName("chicken");
      }

      AppState.updateState({ meals: results, isLoading: false });
      this.renderRecipeGrid(results);

      const countLabel = document.querySelector("#all-recipes-section #recipes-count") || document.querySelector("#all-recipes-section p.text-gray-600");
      if (countLabel) {
        countLabel.textContent = areaName ? `Showing ${results.length} ${areaName} recipes` : `Showing ${results.length} recipes`;
      }
    } catch (error) {
      console.error("Area filter error:", error);
      AppState.updateState({ isLoading: false });
    }
  }

  async showMealDetail(mealId) {
    AppState.updateState({ selectedMealId: mealId, isLoading: true });
    this.renderPage("meal-detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async showMealDetailPage() {
    let detailSection = document.getElementById("meal-details");
    if (!detailSection) {
      detailSection = document.createElement("section");
      detailSection.id = "meal-details";
      detailSection.className = "px-8 py-8 bg-gray-50";
      const mainContent = document.getElementById("main-content");
      mainContent?.appendChild(detailSection);
    }
    detailSection.style.display = "";

    const selectedMealId = AppState.getState().selectedMealId;
    if (!selectedMealId) {
      detailSection.innerHTML = `
        <div class="max-w-6xl mx-auto">
          <button id="back-to-meals-btn" class="flex items-center gap-2 text-gray-600 hover:text-emerald-600 font-medium mb-6 transition-colors">
            <i class="fa-solid fa-arrow-left"></i>
            <span>Back to Recipes</span>
          </button>
          ${UIComponents.createEmptyState("No recipe selected. Please select a recipe to view details.", "fa-utensils")}
        </div>
      `;
      return;
    }

    try {
      const meal = await MealAPI.getMealById(selectedMealId);
      if (!meal) throw new Error("Meal not found");

      const ingredients = MealAPI.extractIngredients(meal);
      const instructions = MealAPI.parseInstructions(meal.strInstructions);
      AppState.updateState({ selectedMeal: meal, isLoading: false });

      detailSection.innerHTML = this.createMealDetailTemplate(meal, null, ingredients, instructions);
      this.loadMealNutrition(meal, ingredients);
    } catch (error) {
      console.error("Error loading meal details:", error);
      AppState.updateState({ isLoading: false });
    }
  }

  createMealDetailTemplate(meal, nutritionData, ingredientsList, instructionsList) {
    return `
      <div class="max-w-6xl mx-auto">
        <!-- Back Button -->
        <button id="back-to-meals-btn" class="flex items-center gap-2 text-gray-600 hover:text-emerald-600 font-medium mb-6 transition-colors cursor-pointer">
          <i class="fa-solid fa-arrow-left"></i>
          <span>Back to Recipes</span>
        </button>

        <!-- Hero Section -->
        <div class="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div class="relative h-80 md:h-96">
            <img src="${meal.strMealThumb}" alt="${meal.strMeal}" class="w-full h-full object-cover"/>
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
            <div class="absolute bottom-0 left-0 right-0 p-8">
              <div class="flex items-center gap-3 mb-3">
                ${meal.strCategory ? `<span class="px-3 py-1 bg-emerald-500 text-white text-sm font-semibold rounded-full">${meal.strCategory}</span>` : ""}
                ${meal.strArea ? `<span class="px-3 py-1 bg-blue-500 text-white text-sm font-semibold rounded-full">${meal.strArea}</span>` : ""}
                ${meal.strTags
        ? meal.strTags
          .split(",")
          .slice(0, 2)
          .map((tag) => `<span class="px-3 py-1 bg-purple-500 text-white text-sm font-semibold rounded-full">${tag.trim()}</span>`)
          .join("")
        : ""
      }
              </div>
              <h1 class="text-3xl md:text-4xl font-bold text-white mb-2">${meal.strMeal}</h1>
              <div class="flex items-center gap-6 text-white/90">
                <span class="flex items-center gap-2">
                  <i class="fa-solid fa-clock"></i>
                  <span>30 min</span>
                </span>
                <span class="flex items-center gap-2">
                  <i class="fa-solid fa-utensils"></i>
                  <span id="hero-servings">${nutritionData?.servings || 4} servings</span>
                </span>
                <span class="flex items-center gap-2">
                  <i class="fa-solid fa-fire"></i>
                  <span id="hero-calories">${nutritionData ? nutritionData.caloriesPerServing + " cal/serving" : "Calculating..."}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap gap-3 mb-8">
          <button id="log-meal-btn" class="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all cursor-pointer shadow-sm" data-meal-id="${meal.idMeal}">
            <i class="fa-solid fa-clipboard-list"></i>
            <span>Log This Meal</span>
          </button>
        </div>

        <!-- Main Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Left Column - Ingredients & Instructions & Video -->
          <div class="lg:col-span-2 space-y-8">
            <!-- Ingredients -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i class="fa-solid fa-list-check text-emerald-600"></i>
                Ingredients
                <span class="text-sm font-normal text-gray-500 ml-auto">${ingredientsList.length} items</span>
              </h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${ingredientsList
        .map(
          (item) => `
                  <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors">
                    <input type="checkbox" class="ingredient-checkbox w-5 h-5 text-emerald-600 rounded border-gray-300"/>
                    <span class="text-gray-700">
                      <span class="font-medium text-gray-900">${item.measure}</span> ${item.ingredient}
                    </span>
                  </div>
                `
        )
        .join("")}
              </div>
            </div>

            <!-- Instructions -->
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i class="fa-solid fa-shoe-prints text-emerald-600"></i>
                Instructions
              </h2>
              <div class="space-y-4">
                ${instructionsList
        .map(
          (step, idx) => `
                  <div class="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                    <div class="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                      ${idx + 1}
                    </div>
                    <p class="text-gray-700 leading-relaxed pt-2">${step}</p>
                  </div>
                `
        )
        .join("")}
              </div>
            </div>

            <!-- Video Section -->
            ${meal.strYoutube
        ? `
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i class="fa-solid fa-video text-red-500"></i>
                Video Tutorial
              </h2>
              <div class="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
                <iframe 
                  src="https://www.youtube.com/embed/${meal.strYoutube.split("v=")[1] || ""}" 
                  class="absolute inset-0 w-full h-full"
                  frameborder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowfullscreen>
                </iframe>
              </div>
            </div>
            `
        : ""
      }
          </div>

          <!-- Right Column - Nutrition -->
          <div class="space-y-6">
            <!-- Nutrition Facts -->
            <div class="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
              <h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i class="fa-solid fa-chart-pie text-emerald-600"></i>
                Nutrition Facts
              </h2>
              <div id="nutrition-facts-container">
                <p class="text-sm text-gray-500 mb-4">Per serving</p>
                <div class="text-center py-4 mb-4 bg-linear-to-br from-emerald-50 to-teal-50 rounded-xl">
                  <p class="text-sm text-gray-600">Calories per serving</p>
                  <p class="text-4xl font-bold text-emerald-600 animate-pulse">...</p>
                  <p class="text-xs text-gray-500 mt-1">Calculating...</p>
                </div>
              </div>
            </div>

            <!-- Source/Credit -->
            ${meal.strSource
        ? `
            <div class="bg-white rounded-2xl shadow-lg p-6">
              <h3 class="text-sm font-semibold text-gray-900 mb-2">Recipe Source</h3>
              <a href="${meal.strSource}" target="_blank" class="text-emerald-600 hover:text-emerald-700 text-sm flex items-center gap-2">
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                View Original Recipe
              </a>
            </div>
            `
        : ""
      }
          </div>
        </div>
      </div>
    `;
  }

  async loadMealNutrition(meal, ingredientsList) {
    const container = document.getElementById("nutrition-facts-container");
    const caloriesLabel = document.getElementById("hero-calories");

    try {
      const ingredientStrings = ingredientsList.map((i) => `${i.measure} ${i.ingredient}`);
      const rawNutrition = await NutritionAPI.analyzeRecipe(meal.strMeal, ingredientStrings);
      const displayData = NutritionAPI.formatNutritionForDisplay(rawNutrition);

      if (caloriesLabel) caloriesLabel.textContent = `${displayData.caloriesPerServing} cal/serving`;

      if (container) {
        container.innerHTML = `
          <p class="text-sm text-gray-500 mb-4">Per serving</p>
          
          <div class="text-center py-4 mb-4 bg-linear-to-br from-emerald-50 to-teal-50 rounded-xl">
            <p class="text-sm text-gray-600">Calories per serving</p>
            <p class="text-4xl font-bold text-emerald-600">${displayData.caloriesPerServing}</p>
            <p class="text-xs text-gray-500 mt-1">Total: ${displayData.totalCalories} cal</p>
          </div>
          
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span class="text-gray-700">Protein</span>
              </div>
              <span class="font-bold text-gray-900">${displayData.macros.protein.amount}g</span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-2">
              <div class="bg-emerald-500 h-2 rounded-full" style="width: ${Math.min(displayData.macros.protein.dailyValue, 100)}%"></div>
            </div>
            
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-blue-500"></div>
                <span class="text-gray-700">Carbs</span>
              </div>
              <span class="font-bold text-gray-900">${displayData.macros.carbs.amount}g</span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-2">
              <div class="bg-blue-500 h-2 rounded-full" style="width: ${Math.min(displayData.macros.carbs.dailyValue, 100)}%"></div>
            </div>
            
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-purple-500"></div>
                <span class="text-gray-700">Fat</span>
              </div>
              <span class="font-bold text-gray-900">${displayData.macros.fat.amount}g</span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-2">
              <div class="bg-purple-500 h-2 rounded-full" style="width: ${Math.min(displayData.macros.fat.dailyValue, 100)}%"></div>
            </div>
            
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-orange-500"></div>
                <span class="text-gray-700">Fiber</span>
              </div>
              <span class="font-bold text-gray-900">${displayData.macros.fiber.amount}g</span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-2">
              <div class="bg-orange-500 h-2 rounded-full" style="width: ${Math.min(displayData.macros.fiber.dailyValue, 100)}%"></div>
            </div>
            
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-pink-500"></div>
                <span class="text-gray-700">Sugar</span>
              </div>
              <span class="font-bold text-gray-900">${displayData.macros.sugar.amount}g</span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-2">
              <div class="bg-pink-500 h-2 rounded-full" style="width: ${Math.min(Math.round((displayData.macros.sugar.amount / 50) * 100), 100)}%"></div>
            </div>
            
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-red-500"></div>
                <span class="text-gray-700">Saturated Fat</span>
              </div>
              <span class="font-bold text-gray-900">${displayData.macros.saturatedFat.amount}g</span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-2">
              <div class="bg-red-500 h-2 rounded-full" style="width: ${Math.min(displayData.macros.saturatedFat.dailyValue, 100)}%"></div>
            </div>
          </div>
          
          <div class="mt-6 pt-6 border-t border-gray-100">
            <h3 class="text-sm font-semibold text-gray-900 mb-3">Other</h3>
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Cholesterol</span>
                <span class="font-medium">${displayData.other.cholesterol}mg</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Sodium</span>
                <span class="font-medium">${displayData.other.sodium}mg</span>
              </div>
            </div>
          </div>
        `;
      }

      AppState.getState().mealNutritionCache[meal.idMeal] = displayData;

      const logBtn = document.getElementById("log-meal-btn");
      if (logBtn) {
        logBtn.onclick = (e) => {
          e.preventDefault();
          this.showLogMealModal(meal, displayData);
        };
      }
    } catch (error) {
      console.error("Nutrition calculation failed:", error);
      if (container) container.innerHTML = `<p class="text-red-500 text-sm">Unable to calculate nutrition data.</p>`;

      const logBtn = document.getElementById("log-meal-btn");
      if (logBtn) {
        logBtn.onclick = (e) => {
          e.preventDefault();
          this.showLogMealModal(meal, {
            caloriesPerServing: 350,
            macros: {
              protein: { amount: 25, dailyValue: 50 },
              carbs: { amount: 30, dailyValue: 12 },
              fat: { amount: 15, dailyValue: 23 },
              fiber: { amount: 4, dailyValue: 16 },
              sugar: { amount: 5, dailyValue: 10 },
              saturatedFat: { amount: 3, dailyValue: 15 },
            },
            other: { cholesterol: 75, sodium: 450 },
          });
        };
      }
    }
  }

  showLogMealModal(meal, nutritionData) {
    const existingModal = document.getElementById("log-meal-modal");
    if (existingModal) existingModal.remove();

    const modal = document.createElement("div");
    modal.className = "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4";
    modal.id = "log-meal-modal";

    const caloriesPerServing = nutritionData?.caloriesPerServing || 302;
    const proteinPerServing = nutritionData?.macros?.protein?.amount || 38;
    const carbsPerServing = nutritionData?.macros?.carbs?.amount || 3;
    const fatPerServing = nutritionData?.macros?.fat?.amount || 16;

    modal.innerHTML = `
      <div class="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-100 relative z-50">
        <div class="flex items-center gap-4 mb-6">
          <img src="${meal.strMealThumb}" alt="${meal.strMeal}" class="w-16 h-16 rounded-xl object-cover shadow-sm"/>
          <div>
            <h3 class="text-lg font-bold text-gray-900 line-clamp-1">Log This Meal</h3>
            <p class="text-gray-500 text-xs mt-0.5 line-clamp-1">${meal.strMeal}</p>
          </div>
        </div>

        <div class="mb-6">
          <label class="block text-sm font-semibold text-gray-700 mb-2">Number of Servings</label>
          <div class="flex items-center gap-3">
            <button type="button" id="modal-decrease-servings" class="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-bold transition-colors cursor-pointer select-none">
              <i class="fa-solid fa-minus text-xs"></i>
            </button>
            <input type="number" id="modal-servings-input" value="1" min="0.5" max="10" step="0.5" 
              class="w-24 text-center text-lg font-bold border-2 border-gray-200 focus:border-emerald-500 focus:outline-none rounded-xl py-2"/>
            <button type="button" id="modal-increase-servings" class="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-bold transition-colors cursor-pointer select-none">
              <i class="fa-solid fa-plus text-xs"></i>
            </button>
          </div>
        </div>

        <div class="bg-emerald-50 rounded-xl p-4 mb-6">
          <p class="text-xs text-gray-600 font-medium mb-2">Estimated nutrition per serving:</p>
          <div class="grid grid-cols-4 gap-2 text-center">
            <div class="bg-white p-2 rounded-lg">
              <p class="text-sm font-bold text-emerald-600" id="modal-preview-calories">${caloriesPerServing}</p>
              <p class="text-[10px] text-gray-400">Calories</p>
            </div>
            <div class="bg-white p-2 rounded-lg">
              <p class="text-sm font-bold text-blue-600" id="modal-preview-protein">${proteinPerServing}g</p>
              <p class="text-[10px] text-gray-400">Protein</p>
            </div>
            <div class="bg-white p-2 rounded-lg">
              <p class="text-sm font-bold text-amber-600" id="modal-preview-carbs">${carbsPerServing}g</p>
              <p class="text-[10px] text-gray-400">Carbs</p>
            </div>
            <div class="bg-white p-2 rounded-lg">
              <p class="text-sm font-bold text-purple-600" id="modal-preview-fat">${fatPerServing}g</p>
              <p class="text-[10px] text-gray-400">Fat</p>
            </div>
          </div>
        </div>

        <div class="flex gap-3">
          <button type="button" id="modal-cancel-log-btn" class="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors cursor-pointer text-sm">
            Cancel
          </button>
          <button type="button" id="modal-confirm-log-btn" class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm shadow-sm">
            <i class="fa-solid fa-clipboard-list"></i>
            Log Meal
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const servingsInput = modal.querySelector("#modal-servings-input");
    const decreaseBtn = modal.querySelector("#modal-decrease-servings");
    const increaseBtn = modal.querySelector("#modal-increase-servings");
    const cancelBtn = modal.querySelector("#modal-cancel-log-btn");
    const confirmBtn = modal.querySelector("#modal-confirm-log-btn");

    const updatePreview = () => {
      const current = parseFloat(servingsInput.value) || 1;
      const previewCalories = modal.querySelector("#modal-preview-calories");
      const previewProtein = modal.querySelector("#modal-preview-protein");
      const previewCarbs = modal.querySelector("#modal-preview-carbs");
      const previewFat = modal.querySelector("#modal-preview-fat");
      if (previewCalories) previewCalories.textContent = Math.round(caloriesPerServing * current);
      if (previewProtein) previewProtein.textContent = Math.round(proteinPerServing * current) + "g";
      if (previewCarbs) previewCarbs.textContent = Math.round(carbsPerServing * current) + "g";
      if (previewFat) previewFat.textContent = Math.round(fatPerServing * current) + "g";
    };

    decreaseBtn?.addEventListener("click", () => {
      const current = parseFloat(servingsInput.value) || 1;
      if (current > 0.5) {
        servingsInput.value = (current - 0.5).toFixed(1);
        updatePreview();
      }
    });

    increaseBtn?.addEventListener("click", () => {
      const current = parseFloat(servingsInput.value) || 1;
      if (current < 10) {
        servingsInput.value = (current + 0.5).toFixed(1);
        updatePreview();
      }
    });

    servingsInput?.addEventListener("input", updatePreview);

    cancelBtn?.addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

    confirmBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const servings = parseFloat(servingsInput.value) || 1;
      this.logMealToDailyLog(meal, servings, nutritionData);
      modal.remove();
    });
  }

  logMealToDailyLog(meal, servingsCount, nutritionData) {
    const today = AppState.getTodayString();
    const caloriesPerServing = nutritionData?.caloriesPerServing || 302;
    const proteinPerServing = nutritionData?.macros?.protein?.amount || 38;
    const carbsPerServing = nutritionData?.macros?.carbs?.amount || 3;
    const fatPerServing = nutritionData?.macros?.fat?.amount || 16;

    const loggedItem = {
      type: "meal",
      mealId: meal.idMeal,
      name: meal.strMeal,
      category: meal.strCategory || "Recipe",
      thumbnail: meal.strMealThumb,
      servings: servingsCount,
      calories: Math.round(caloriesPerServing * servingsCount),
      protein: Math.round(proteinPerServing * servingsCount),
      carbs: Math.round(carbsPerServing * servingsCount),
      fat: Math.round(fatPerServing * servingsCount),
      loggedAt: new Date().toISOString(),
    };

    // Log to state and persist in localStorage
    AppState.logDailyNutrition(today, loggedItem);

    // Show confirmation
    if (typeof Swal !== "undefined" && Swal.fire) {
      Swal.fire({
        title: "Meal Logged!",
        html: `
          <p class="text-gray-600 text-sm">
            <strong>${meal.strMeal}</strong> (${servingsCount} serving${servingsCount !== 1 ? "s" : ""}) has been added to your daily food log.
          </p>
          <p class="text-emerald-600 font-semibold text-sm mt-2">+${loggedItem.calories} kcal</p>
        `,
        icon: "success",
        confirmButtonColor: "#10b981",
        timer: 2000,
        showConfirmButton: false,
      });
    } else {
      alert(`Meal Logged: ${meal.strMeal} (${servingsCount} servings) added to your daily food log!`);
    }
  }

  showProductsPage() {
    this.toggleSections(
      [
        "search-filters-section",
        "meal-categories-section",
        "all-recipes-section",
        "meal-details",
        "meal-detail-section",
        "foodlog-section",
        "settings-section",
      ],
      false,
    );
    this.renderProductsSection();
  }

  async renderProductsSection() {
    let section = document.getElementById("products-section");
    if (!section) {
      section = document.createElement("section");
      section.id = "products-section";
      section.className = "px-8 py-8 bg-gray-50 min-h-screen";
      const mainContent = document.getElementById("main-content");
      mainContent?.appendChild(section);
    }
    section.style.display = "";

    const popularCategories = await ProductAPI.getPopularCategories();

    section.innerHTML = `
      <div class="max-w-7xl mx-auto">
        <!-- Search Header -->
        <div class="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 mb-6 text-white shadow-sm">
          <h2 class="text-2xl font-bold mb-2 flex items-center">
            <i class="fa-solid fa-barcode mr-2"></i>
            Product Search & Barcode Scanner
          </h2>
          <p class="opacity-90 mb-4 text-sm">Search for packaged food products to view nutrition information</p>

          <div class="flex gap-3">
            <div class="flex-1 relative">
              <input type="text" id="product-search-input"
                placeholder="Search by product name (e.g., Cheerios, Nutella, Coca-Cola...)"
                class="w-full px-5 py-3.5 pr-12 bg-white/90 backdrop-blur-sm text-gray-900 rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"/>
              <i class="fa-solid fa-search absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            </div>
            <button id="search-product-btn" class="px-6 py-3.5 bg-white text-emerald-700 rounded-xl font-semibold hover:bg-gray-100 transition-all cursor-pointer text-sm shadow-xs">
              Search
            </button>
          </div>

          <div class="flex items-center gap-4 mt-4">
            <div class="flex-1 h-px bg-white/30"></div>
            <span class="text-xs opacity-80">or</span>
            <div class="flex-1 h-px bg-white/30"></div>
          </div>

          <div class="mt-4 flex gap-3">
            <div class="flex-1 relative">
              <input type="text" id="barcode-input"
                placeholder="Enter barcode number (e.g., 7613034626844)"
                class="w-full px-5 py-3.5 pr-12 bg-white/90 backdrop-blur-sm text-gray-900 rounded-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"/>
              <i class="fa-solid fa-barcode absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            </div>
            <button id="lookup-barcode-btn" class="px-6 py-3.5 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-all cursor-pointer text-sm flex items-center gap-2 shadow-xs">
              <i class="fa-solid fa-search"></i>
              Lookup
            </button>
          </div>
        </div>

        <!-- Nutrition Grade Filter -->
        <div class="flex items-center gap-4 mb-6">
          <span class="text-sm font-medium text-gray-700">Filter by Nutri-Score:</span>
          <div class="flex gap-2">
            <button class="nutri-score-filter px-4 py-2 rounded-lg text-sm font-bold transition-all bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer" data-grade="">All</button>
            <button class="nutri-score-filter px-4 py-2 rounded-lg text-sm font-bold transition-all bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer" data-grade="a">A</button>
            <button class="nutri-score-filter px-4 py-2 rounded-lg text-sm font-bold transition-all bg-lime-100 text-lime-700 hover:bg-lime-200 cursor-pointer" data-grade="b">B</button>
            <button class="nutri-score-filter px-4 py-2 rounded-lg text-sm font-bold transition-all bg-yellow-100 text-yellow-700 hover:bg-yellow-200 cursor-pointer" data-grade="c">C</button>
            <button class="nutri-score-filter px-4 py-2 rounded-lg text-sm font-bold transition-all bg-orange-100 text-orange-700 hover:bg-orange-200 cursor-pointer" data-grade="d">D</button>
            <button class="nutri-score-filter px-4 py-2 rounded-lg text-sm font-bold transition-all bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer" data-grade="e">E</button>
          </div>
        </div>

        <!-- Category Buttons -->
        <div class="mb-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-3">Browse by Category</h3>
          <div class="flex gap-3 overflow-x-auto pb-2" id="product-categories">
            ${popularCategories.map((cat) => UIComponents.createProductCategoryButton(cat)).join("")}
          </div>
        </div>

        <!-- Results Info -->
        <div class="flex items-center justify-between mb-4">
          <p id="products-count" class="text-sm text-gray-600">Search for products to see results</p>
        </div>

        <!-- Products Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5" id="products-grid">
        </div>

        <!-- Loading State -->
        <div id="products-loading" class="hidden py-12">
          ${UIComponents.createLoadingSpinner()}
        </div>

        <!-- Empty State (matching bestSolution.js lines 3218-3226) -->
        <div id="products-empty" class="py-12">
          <div class="text-center">
            <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="fa-solid fa-box-open text-gray-400 text-3xl"></i>
            </div>
            <p class="text-gray-500 text-lg mb-2 font-medium">No products to display</p>
            <p class="text-gray-400 text-sm">Search for a product or browse by category</p>
          </div>
        </div>
      </div>
    `;

    this.setupProductScannerEvents();
  }

  setupProductScannerEvents() {
    const searchBtn = document.getElementById("search-product-btn");
    const searchInput = document.getElementById("product-search-input");
    const barcodeBtn = document.getElementById("lookup-barcode-btn");
    const barcodeInput = document.getElementById("barcode-input");

    searchBtn?.addEventListener("click", () => {
      const term = searchInput?.value.trim();
      if (term) this.searchProducts(term);
    });

    searchInput?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const term = searchInput.value.trim();
        if (term) this.searchProducts(term);
      }
    });

    barcodeBtn?.addEventListener("click", () => {
      const code = barcodeInput?.value.trim();
      if (code) this.lookupBarcode(code);
    });

    barcodeInput?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const code = barcodeInput.value.trim();
        if (code) this.lookupBarcode(code);
      }
    });

    document.querySelectorAll(".nutri-score-filter").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".nutri-score-filter").forEach((b) => {
          b.classList.remove("ring-2", "ring-gray-900");
        });
        btn.classList.add("ring-2", "ring-gray-900");

        const grade = btn.dataset.grade || "";
        const term = searchInput?.value.trim() || "";
        this.searchProducts(term, grade);
      });
    });

    document.querySelectorAll(".product-category-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cat = btn.dataset.category || "";
        this.searchProductsByCategory(cat);
      });
    });
  }

  async searchProducts(searchTerm, nutriGrade = "") {
    const grid = document.getElementById("products-grid");
    const loading = document.getElementById("products-loading");
    const empty = document.getElementById("products-empty");
    const countLabel = document.getElementById("products-count");

    if (grid) {
      loading?.classList.remove("hidden");
      empty?.classList.add("hidden");
      grid.innerHTML = "";

      try {
        const options = { searchTerms: searchTerm, pageSize: 24 };
        if (nutriGrade) options.nutritionGrade = nutriGrade;

        const result = await ProductAPI.searchProducts(options);
        loading?.classList.add("hidden");

        if (result.products && result.products.length > 0) {
          grid.innerHTML = result.products.map((p) => UIComponents.createProductCard(p)).join("");
          if (countLabel) countLabel.textContent = `Found ${result.count} products for "${searchTerm}"`;
          empty?.classList.add("hidden");
        } else {
          empty?.classList.remove("hidden");
          if (countLabel) countLabel.textContent = `No products found for "${searchTerm}"`;
        }

        AppState.getState().searchedProducts = result.products || [];
      } catch (err) {
        console.error("Product search error:", err);
        loading?.classList.add("hidden");
        empty?.classList.remove("hidden");
        if (countLabel) countLabel.textContent = "Error searching products";
      }
    }
  }

  async searchProductsByCategory(categoryName) {
    const grid = document.getElementById("products-grid");
    const loading = document.getElementById("products-loading");
    const empty = document.getElementById("products-empty");
    const countLabel = document.getElementById("products-count");

    if (grid) {
      loading?.classList.remove("hidden");
      empty?.classList.add("hidden");
      grid.innerHTML = "";

      try {
        const result = await ProductAPI.getProductsByCategory(categoryName);
        loading?.classList.add("hidden");

        if (result.products && result.products.length > 0) {
          grid.innerHTML = result.products.map((p) => UIComponents.createProductCard(p)).join("");
          if (countLabel) countLabel.textContent = `Found ${result.count} products in ${categoryName.replace(/_/g, " ")}`;
          empty?.classList.add("hidden");
        } else {
          empty?.classList.remove("hidden");
          if (countLabel) countLabel.textContent = `No products found in ${categoryName.replace(/_/g, " ")}`;
        }

        AppState.getState().searchedProducts = result.products || [];
      } catch (err) {
        console.error("Category search error:", err);
        loading?.classList.add("hidden");
        empty?.classList.remove("hidden");
      }
    }
  }

  async lookupBarcode(barcode) {
    const grid = document.getElementById("products-grid");
    const loading = document.getElementById("products-loading");
    const empty = document.getElementById("products-empty");
    const countLabel = document.getElementById("products-count");

    loading?.classList.remove("hidden");
    empty?.classList.add("hidden");
    if (grid) grid.innerHTML = "";

    try {
      const product = await ProductAPI.getProductByBarcode(barcode);
      loading?.classList.add("hidden");

      if (product) {
        if (grid) grid.innerHTML = UIComponents.createProductCard(product);
        if (countLabel) countLabel.textContent = `Found product: ${product.name}`;
        AppState.getState().searchedProducts = [product];
        this.showProductDetailModal(product);
      } else {
        empty?.classList.remove("hidden");
        if (countLabel) countLabel.textContent = `No product found with barcode: ${barcode}`;
      }
    } catch (err) {
      console.error("Barcode lookup error:", err);
      loading?.classList.add("hidden");
      empty?.classList.remove("hidden");
    }
  }

  async openProductModalByBarcode(barcode) {
    let product = (AppState.getState().searchedProducts || []).find((p) => p.barcode === barcode);
    if (!product) {
      product = await ProductAPI.getProductByBarcode(barcode);
    }
    if (product) {
      this.showProductDetailModal(product);
    }
  }

  showProductDetailModal(product) {
    const existingModal = document.getElementById("product-detail-modal");
    if (existingModal) existingModal.remove();

    const nutriScore = ProductAPI.getNutriScoreInfo(product.nutritionGrade);
    const novaInfo = ProductAPI.getNovaGroupInfo(product.novaGroup);

    const modal = document.createElement("div");
    modal.className = "fixed inset-0 bg-black/50 flex items-center justify-center z-50";
    modal.id = "product-detail-modal";

    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        ${UIComponents.createProductDetailContent(product, nutriScore, novaInfo)}
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelectorAll(".close-product-modal").forEach((btn) => {
      btn.addEventListener("click", () => modal.remove());
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

    const logBtn = modal.querySelector(".add-product-to-log");
    logBtn?.addEventListener("click", () => {
      this.logProductToDaily(product);
      modal.remove();
    });
  }

  logProductToDaily(product) {
    const today = AppState.getTodayString();
    const loggedItem = {
      type: "product",
      barcode: product.barcode,
      name: product.name,
      brand: product.brand || "Product",
      serving: product.servingSize || "100g",
      thumbnail: product.image || product.thumbnailImage,
      calories: product.nutrition.calories || 0,
      protein: product.nutrition.protein || 0,
      carbs: product.nutrition.carbs || 0,
      fat: product.nutrition.fat || 0,
      sugar: product.nutrition.sugar || 0,
      saturatedFat: product.nutrition.saturatedFat || 0,
      fiber: product.nutrition.fiber || 0,
      salt: product.nutrition.salt || 0,
      nutrition: {
        calories: product.nutrition.calories || 0,
        protein: product.nutrition.protein || 0,
        carbs: product.nutrition.carbs || 0,
        fat: product.nutrition.fat || 0,
      },
      loggedAt: new Date().toISOString(),
    };

    AppState.logDailyNutrition(today, loggedItem);

    if (typeof Swal !== "undefined" && Swal.fire) {
      Swal.fire({
        title: "Product Logged!",
        html: `
          <p class="text-gray-600 text-sm">
            <strong>${product.name}</strong> has been added to your daily food log.
          </p>
          <p class="text-emerald-600 font-semibold text-sm mt-2">+${loggedItem.calories} kcal</p>
        `,
        icon: "success",
        confirmButtonColor: "#10b981",
        timer: 2000,
        showConfirmButton: false,
      });
    } else {
      alert(`Product Logged: ${product.name} added to daily food log!`);
    }
  }

  showFoodLogPage() {
    this.toggleSections(
      [
        "search-filters-section",
        "meal-categories-section",
        "all-recipes-section",
        "meal-details",
        "meal-detail-section",
        "products-section",
        "settings-section",
      ],
      false
    );
    this.renderFoodLogSection();
  }

  renderFoodLogSection() {
    let section = document.getElementById("foodlog-section");
    if (!section) {
      section = document.createElement("section");
      section.id = "foodlog-section";
      section.className = "px-8 py-8 bg-gray-50 min-h-screen";
      const mainContent = document.getElementById("main-content");
      mainContent?.appendChild(section);
    }
    section.style.display = "";

    const todaySummary = this.getTodayLogSummary();
    const weeklyData = this.getWeeklyLogData();
    const userGoals = AppState.getState().userSettings || {
      calorieGoal: 2000,
      proteinGoal: 50,
      carbsGoal: 250,
      fatGoal: 65,
    };

    const targetCalories = userGoals.calorieGoal || 2000;
    const targetProtein = userGoals.proteinGoal || 50;
    const targetCarbs = userGoals.carbsGoal || 250;
    const targetFat = userGoals.fatGoal || 65;

    const totalWeeklyCalories = weeklyData.reduce((sum, day) => sum + day.calories, 0);
    const weeklyAverage = totalWeeklyCalories > 0 ? Math.round(totalWeeklyCalories / 7) : 0;
    const totalWeeklyItems = weeklyData.reduce((sum, day) => sum + day.itemCount, 0);
    const daysOnGoal = weeklyData.filter(
      (day) => day.calories > 0 && day.calories >= targetCalories * 0.8 && day.calories <= targetCalories * 1.2
    ).length;

    section.innerHTML = `
      <div class="max-w-7xl mx-auto">
        <!-- Page Header -->
        <div class="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-6 text-white shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold mb-2 flex items-center gap-2">
                <i class="fa-solid fa-clipboard-list"></i>
                Daily Food Log
              </h2>
              <p class="opacity-90 text-sm">Track and monitor your daily nutrition intake</p>
            </div>
            <div class="text-right">
              <p class="text-xs opacity-80 mb-0.5">Today</p>
              <p class="text-lg font-bold">${new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</p>
            </div>
          </div>
        </div>

        <!-- Today's Nutrition Summary Card -->
        <div id="foodlog-today-section" class="bg-white rounded-2xl p-6 mb-6 border border-gray-200 shadow-sm">
          <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <i class="fa-solid fa-fire text-orange-500 mr-2"></i>
            Today's Nutrition
          </h3>

          <!-- Progress Bars (4 columns) -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            ${this.renderNutritionProgress("Calories", todaySummary.totalCalories, targetCalories, "kcal", "emerald")}
            ${this.renderNutritionProgress("Protein", todaySummary.totalProtein, targetProtein, "g", "blue")}
            ${this.renderNutritionProgress("Carbs", todaySummary.totalCarbs, targetCarbs, "g", "amber")}
            ${this.renderNutritionProgress("Fat", todaySummary.totalFat, targetFat, "g", "purple")}
          </div>

          <!-- Logged Items List -->
          <div class="border-t border-gray-100 pt-4">
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-sm font-semibold text-gray-700">Logged Items (${todaySummary.meals?.length || 0})</h4>
              ${todaySummary.meals?.length > 0
        ? `
                <button id="clear-foodlog" class="text-red-500 hover:text-red-600 text-sm font-medium transition-colors cursor-pointer flex items-center gap-1">
                  <i class="fa-solid fa-trash-can text-xs"></i> Clear All
                </button>
              `
        : ""
      }
            </div>

            ${this.renderLoggedItemsList(todaySummary.meals || [])}
          </div>
        </div>

        <!-- Weekly Overview -->
        <div class="bg-white rounded-2xl p-6 mb-6 border border-gray-200 shadow-sm">
          <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <i class="fa-solid fa-calendar-week text-indigo-500 mr-2"></i>
            Weekly Overview
          </h3>

          <div class="grid grid-cols-7 gap-2">
            ${weeklyData
        .map(
          (day) => `
              <div class="text-center py-3 px-2 ${day.isToday ? "bg-indigo-50 rounded-xl" : ""}">
                <p class="text-xs text-gray-400 mb-1 font-medium">${day.dayName}</p>
                <p class="text-sm font-bold text-gray-900 mb-2">${day.date}</p>
                <div class="${day.calories > 0 ? "text-emerald-600" : "text-gray-300"}">
                  <p class="text-lg font-bold leading-tight">${day.calories}</p>
                  <p class="text-[11px] text-gray-400">kcal</p>
                </div>
                ${day.itemCount > 0 ? `<p class="text-[11px] text-gray-400 mt-1">${day.itemCount} items</p>` : ""}
              </div>
            `
        )
        .join("")}
          </div>
        </div>

        <!-- Quick Summary Metrics -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div class="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
              <i class="fa-solid fa-chart-line text-emerald-600 text-xl"></i>
            </div>
            <div>
              <p class="text-xs text-gray-500 font-medium">Weekly Average</p>
              <p class="text-xl font-bold text-gray-900 mt-0.5">${weeklyAverage} kcal</p>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <i class="fa-solid fa-utensils text-blue-600 text-xl"></i>
            </div>
            <div>
              <p class="text-xs text-gray-500 font-medium">Total Items This Week</p>
              <p class="text-xl font-bold text-gray-900 mt-0.5">${totalWeeklyItems} items</p>
            </div>
          </div>

          <div class="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
              <i class="fa-solid fa-bullseye text-purple-600 text-xl"></i>
            </div>
            <div>
              <p class="text-xs text-gray-500 font-medium">Days On Goal</p>
              <p class="text-xl font-bold text-gray-900 mt-0.5">${daysOnGoal} / 7</p>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupFoodLogListeners();
  }

  renderNutritionProgress(name, current, goal, unit, color) {
    const percentage = Math.min(Math.round((current / goal) * 100), 100);
    const isOver = current > goal;

    const colorClasses = {
      emerald: { text: "text-emerald-600", bg: "bg-emerald-500" },
      blue: { text: "text-blue-600", bg: "bg-blue-500" },
      amber: { text: "text-amber-600", bg: "bg-amber-500" },
      purple: { text: "text-purple-600", bg: "bg-purple-500" },
    };

    const scheme = colorClasses[color] || colorClasses.emerald;

    return `
      <div class="bg-gray-50 rounded-xl p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-700">${name}</span>
          <span class="text-xs font-semibold ${isOver ? "text-red-500" : scheme.text}">${isOver ? "100%" : percentage + "%"}</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2 mb-2.5">
          <div class="h-2 rounded-full transition-all duration-300 ${isOver ? "bg-red-500" : scheme.bg}" style="width: ${percentage}%"></div>
        </div>
        <div class="flex items-center justify-between text-xs font-medium">
          <span class="font-bold ${isOver ? "text-red-600" : scheme.text}">${current} ${unit}</span>
          <span class="text-gray-400">/ ${goal} ${unit}</span>
        </div>
      </div>
    `;
  }

  renderLoggedItemsList(meals) {
    if (!meals || meals.length === 0) {
      return `
        <div class="text-center py-12">
          <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fa-solid fa-utensils text-gray-300 text-2xl"></i>
          </div>
          <p class="text-gray-800 font-bold text-base mb-1 mt-4">No food logged today</p>
          <p class="text-gray-400 text-xs mb-5 mt-4">Start tracking your nutrition by logging meals or scanning products</p>
          <div class="flex justify-center gap-3 mt-4">
            <button id="foodlog-browse-recipes-btn" class="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-medium text-sm shadow-sm cursor-pointer">
              <i class="fa-solid fa-plus"></i>
              Browse Recipes
            </button>
            <button id="foodlog-scan-product-btn" class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-medium text-sm shadow-sm cursor-pointer">
              <i class="fa-solid fa-barcode"></i>
              Scan Product
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="space-y-3 max-h-96 overflow-y-auto">
        ${meals
        .map((item, index) => {
          const calories = item.calories || item.nutrition?.calories || 0;
          const protein = item.protein || item.nutrition?.protein || 0;
          const carbs = item.carbs || item.nutrition?.carbs || 0;
          const fat = item.fat || item.nutrition?.fat || 0;
          const timeFormatted = item.loggedAt
            ? new Date(item.loggedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
            : "";

          return `
              <div class="flex items-center justify-between bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-all">
                <div class="flex items-center gap-4">
                  ${item.thumbnail
              ? `<img src="${item.thumbnail}" alt="${item.name}" class="w-14 h-14 rounded-xl object-cover shadow-xs"/>`
              : `<div class="w-14 h-14 ${item.type === "product" ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"} rounded-xl flex items-center justify-center text-xl">
                          <i class="fa-solid fa-${item.type === "product" ? "box" : "utensils"}"></i>
                         </div>`
            }
                  <div>
                    <p class="font-bold text-gray-900 text-base">${item.name}</p>
                    <p class="text-xs text-gray-500 mt-0.5">
                      ${item.servings ? `${item.servings} serving${item.servings !== 1 ? "s" : ""}` : item.brand || item.serving || "Standard"}
                      <span class="mx-1">•</span>
                      <span class="${item.type === "product" ? "text-blue-600" : "text-emerald-600"} font-semibold capitalize">${item.type === "product" ? "Product" : "Recipe"}</span>
                    </p>
                    ${timeFormatted ? `<p class="text-[11px] text-gray-400 mt-0.5">${timeFormatted}</p>` : ""}
                  </div>
                </div>
                <div class="flex items-center gap-4">
                  <div class="text-right">
                    <p class="text-base font-bold text-emerald-600">${calories}</p>
                    <p class="text-[11px] text-gray-400">kcal</p>
                  </div>
                  <div class="hidden sm:flex items-center gap-2 text-xs">
                    <span class="px-2 py-1 bg-gray-100 rounded text-gray-600 font-medium">${protein}g P</span>
                    <span class="px-2 py-1 bg-gray-100 rounded text-gray-600 font-medium">${carbs}g C</span>
                    <span class="px-2 py-1 bg-gray-100 rounded text-gray-600 font-medium">${fat}g F</span>
                  </div>
                  <button class="remove-foodlog-item text-gray-300 hover:text-red-500 transition-colors p-2 cursor-pointer" data-index="${index}" title="Remove item">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>
            `;
        })
        .join("")}
      </div>
    `;
  }

  getWeeklyLogData() {
    const dailyLog = AppState.getState().dailyLog || {};
    const today = new Date();
    const weekData = [];

    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const dateObj = new Date(today);
      dateObj.setDate(today.getDate() - dayOffset);
      const dateKey = dateObj.toISOString().split("T")[0];
      const entry = dailyLog[dateKey] || { totalCalories: 0, meals: [] };

      weekData.push({
        dayName: dateObj.toLocaleDateString("en-US", { weekday: "short" }),
        date: dateObj.getDate(),
        calories: entry.totalCalories || 0,
        itemCount: entry.meals?.length || 0,
        isToday: dayOffset === 0,
      });
    }

    return weekData;
  }

  getTodayLogSummary() {
    const todayStr = AppState.getTodayString();
    const entry = AppState.getState().dailyLog[todayStr] || {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      meals: [],
    };

    // Recalculate totals across meals for accuracy
    if (entry.meals && entry.meals.length > 0) {
      entry.totalCalories = entry.meals.reduce((sum, m) => sum + (m.calories || m.nutrition?.calories || 0), 0);
      entry.totalProtein = entry.meals.reduce((sum, m) => sum + (m.protein || m.nutrition?.protein || 0), 0);
      entry.totalCarbs = entry.meals.reduce((sum, m) => sum + (m.carbs || m.nutrition?.carbs || 0), 0);
      entry.totalFat = entry.meals.reduce((sum, m) => sum + (m.fat || m.nutrition?.fat || 0), 0);
    }

    return entry;
  }

  setupFoodLogListeners() {
    const clearBtn = document.getElementById("clear-foodlog");
    clearBtn?.addEventListener("click", () => {
      if (typeof Swal !== "undefined" && Swal.fire) {
        Swal.fire({
          title: "Clear Today's Log?",
          text: "This will remove all logged food items for today.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#ef4444",
          cancelButtonColor: "#6b7280",
          confirmButtonText: "Yes, clear it!",
        }).then((result) => {
          if (result.isConfirmed) {
            this.clearTodayLog();
          }
        });
      } else {
        if (confirm("Clear all logged food items for today?")) {
          this.clearTodayLog();
        }
      }
    });

    document.querySelectorAll(".remove-foodlog-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = parseInt(btn.dataset.index, 10);
        this.removeLoggedItem(index);
      });
    });

    const browseBtn = document.getElementById("foodlog-browse-recipes-btn");
    browseBtn?.addEventListener("click", () => this.navigateTo("meals"));

    const scanBtn = document.getElementById("foodlog-scan-product-btn");
    scanBtn?.addEventListener("click", () => this.navigateTo("products"));
  }

  removeLoggedItem(index) {
    const todayStr = AppState.getTodayString();
    const dailyLog = AppState.getState().dailyLog || {};
    if (!dailyLog[todayStr] || !dailyLog[todayStr].meals[index]) return;

    dailyLog[todayStr].meals.splice(index, 1);
    dailyLog[todayStr].totalCalories = dailyLog[todayStr].meals.reduce((sum, m) => sum + (m.calories || 0), 0);
    dailyLog[todayStr].totalProtein = dailyLog[todayStr].meals.reduce((sum, m) => sum + (m.protein || 0), 0);
    dailyLog[todayStr].totalCarbs = dailyLog[todayStr].meals.reduce((sum, m) => sum + (m.carbs || 0), 0);
    dailyLog[todayStr].totalFat = dailyLog[todayStr].meals.reduce((sum, m) => sum + (m.fat || 0), 0);

    AppState.updateState({ dailyLog: dailyLog }, true);
    this.renderFoodLogSection();
  }

  clearTodayLog() {
    const todayStr = AppState.getTodayString();
    const dailyLog = AppState.getState().dailyLog || {};
    dailyLog[todayStr] = {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      meals: [],
    };
    AppState.updateState({ dailyLog: dailyLog }, true);
    this.renderFoodLogSection();
  }

  showSettingsPage() {
    this.toggleSections(["settings-section"], true);
  }
}

// =============================================================================
// 8. APPLICATION BOOTSTRAP
// =============================================================================

document.addEventListener("DOMContentLoaded", () => {
  window.nutriPlanApp = new NutriPlanApp();
});
