import React, { useState } from 'react';
import { Trash2, Shield, X, AlertCircle } from 'lucide-react';

const MASTER_PANTRY_CATALOG = [
  /* PROTEINS */
  { name: "Chicken Breast (Boneless)", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "Chicken Thighs (Boneless)", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "Whole Airline Chicken", category: "Proteins", defaultYield: 0.68, unit: "lb" },
  { name: "Chicken Wings (Jumbo)", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "Chicken Tenders (Raw)", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "Ground Chicken Lean", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "Moulard Duck Breast", category: "Proteins", defaultYield: 0.92, unit: "lb" },
  { name: "Muscovy Duck Legs", category: "Proteins", defaultYield: 0.75, unit: "lb" },
  { name: "Turkey Breast (Boneless)", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "Ground Beef 80/20", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "Beef Chuck Roll", category: "Proteins", defaultYield: 0.82, unit: "lb" },
  { name: "Beef Brisket (Packer Cut)", category: "Proteins", defaultYield: 0.70, unit: "lb" },
  { name: "Beef Short Rib (Bone-In)", category: "Proteins", defaultYield: 0.65, unit: "lb" },
  { name: "Beef Tenderloin (PSMO)", category: "Proteins", defaultYield: 0.55, unit: "lb" },
  { name: "Ribeye Loin (Lip-On)", category: "Proteins", defaultYield: 0.60, unit: "lb" },
  { name: "NY Strip Loin (0x1)", category: "Proteins", defaultYield: 0.65, unit: "lb" },
  { name: "Beef Oxtail (Cut)", category: "Proteins", defaultYield: 0.55, unit: "lb" },
  { name: "Veal Cutlets (Top Round)", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "Veal Marrow Bones", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "Pork Loin (Trimmed)", category: "Proteins", defaultYield: 0.85, unit: "lb" },
  { name: "Pork Shoulder (BBI)", category: "Proteins", defaultYield: 0.74, unit: "lb" },
  { name: "Pork Belly (Skinless)", category: "Proteins", defaultYield: 0.90, unit: "lb" },
  { name: "Pork Chops (Bone-In center cut)", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "Ground Pork Lean", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "Applewood Smoked Bacon", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "Pancetta (Cured Flat)", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "Prosciutto di Parma", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "Pit Smoked Ham Deli Slice", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "Sweet Italian Sausage Ground", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "Link Maple Breakfast Sausage", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "Chorizo Sausage Casing Red", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "Atlantic Salmon Fillet", category: "Proteins", defaultYield: 0.70, unit: "lb" },
  { name: "Atlantic Cod Fillet (Skinless)", category: "Proteins", defaultYield: 0.95, unit: "lb" },
  { name: "Fresh Halibut Fillet", category: "Proteins", defaultYield: 0.65, unit: "lb" },
  { name: "Ahi Tuna Loin AAA", category: "Proteins", defaultYield: 0.95, unit: "lb" },
  { name: "Fresh Tilapia Fillet", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "White Shrimp 16/20 (P&D)", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "Sea Scallops U10", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "PEI Mussels Live", category: "Proteins", defaultYield: 0.45, unit: "lb" },
  { name: "Little Neck Clams Live", category: "Proteins", defaultYield: 0.35, unit: "lb" },
  { name: "Jumbo Lump Crab Meat", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "Coldwater Lobster Tail 4oz", category: "Proteins", defaultYield: 1.00, unit: "ea" },
  { name: "Cleaned Calamari Tubes & Tentacles", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "Fresh Local Eggs (Extra Large)", category: "Proteins", defaultYield: 1.00, unit: "doz" },
  { name: "Organic Tofu Firm Block", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "Artisanal Tempeh Block", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "Impossible Burger Bulk", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "Beyond Meat Sausage Links", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "Domestic Lamb Loin Chops", category: "Proteins", defaultYield: 1.00, unit: "lb" },
  { name: "Domestic Lamb Shoulder (Bone-In)", category: "Proteins", defaultYield: 0.72, unit: "lb" },
  { name: "Ground Domestic Lamb Lean", category: "Proteins", defaultYield: 1.00, unit: "lb" },

  /* PRODUCE */
  { name: "Yellow Onions", category: "Produce", defaultYield: 0.88, unit: "lb" },
  { name: "Red Onions", category: "Produce", defaultYield: 0.88, unit: "lb" },
  { name: "White Onions", category: "Produce", defaultYield: 0.88, unit: "lb" },
  { name: "Shallots", category: "Produce", defaultYield: 0.85, unit: "lb" },
  { name: "Garlic (Peeled Flat)", category: "Produce", defaultYield: 0.98, unit: "lb" },
  { name: "Jumbo Carrots", category: "Produce", defaultYield: 0.81, unit: "lb" },
  { name: "Celery Stalks", category: "Produce", defaultYield: 0.84, unit: "lb" },
  { name: "Fresh Leeks", category: "Produce", defaultYield: 0.52, unit: "lb" },
  { name: "Fennel Bulbs", category: "Produce", defaultYield: 0.65, unit: "lb" },
  { name: "Russet Potatoes 50ct", category: "Produce", defaultYield: 0.81, unit: "lb" },
  { name: "Yukon Gold Potatoes", category: "Produce", defaultYield: 0.85, unit: "lb" },
  { name: "Red Bliss Potatoes", category: "Produce", defaultYield: 0.90, unit: "lb" },
  { name: "Jumbo Sweet Potatoes", category: "Produce", defaultYield: 0.82, unit: "lb" },
  { name: "Roma Tomatoes", category: "Produce", defaultYield: 0.92, unit: "lb" },
  { name: "Beefsteak Tomatoes", category: "Produce", defaultYield: 0.85, unit: "lb" },
  { name: "Cherry Tomatoes", category: "Produce", defaultYield: 0.98, unit: "pt" },
  { name: "Grape Tomatoes", category: "Produce", defaultYield: 0.98, unit: "pt" },
  { name: "Red Bell Peppers", category: "Produce", defaultYield: 0.80, unit: "lb" },
  { name: "Green Bell Peppers", category: "Produce", defaultYield: 0.80, unit: "lb" },
  { name: "Yellow Bell Peppers", category: "Produce", defaultYield: 0.80, unit: "lb" },
  { name: "Fresh Jalapeño Peppers", category: "Produce", defaultYield: 0.85, unit: "lb" },
  { name: "Serrano Peppers", category: "Produce", defaultYield: 0.85, unit: "lb" },
  { name: "Habanero Peppers", category: "Produce", defaultYield: 0.85, unit: "lb" },
  { name: "Poblano Peppers", category: "Produce", defaultYield: 0.82, unit: "lb" },
  { name: "White Button Mushrooms", category: "Produce", defaultYield: 0.95, unit: "lb" },
  { name: "Cremini Mushrooms", category: "Produce", defaultYield: 0.95, unit: "lb" },
  { name: "Shiitake Mushrooms", category: "Produce", defaultYield: 0.70, unit: "lb" },
  { name: "Oyster Mushrooms", category: "Produce", defaultYield: 0.88, unit: "lb" },
  { name: "Baby Spinach (Pre-Washed)", category: "Produce", defaultYield: 0.95, unit: "lb" },
  { name: "Lacinato Tuscan Kale", category: "Produce", defaultYield: 0.65, unit: "lb" },
  { name: "Romaine Hearts", category: "Produce", defaultYield: 0.72, unit: "lb" },
  { name: "Iceberg Lettuce Head", category: "Produce", defaultYield: 0.78, unit: "lb" },
  { name: "Arcadian Mixed Greens", category: "Produce", defaultYield: 0.95, unit: "lb" },
  { name: "Wild Arugula", category: "Produce", defaultYield: 0.95, unit: "lb" },
  { name: "Green Cabbage", category: "Produce", defaultYield: 0.80, unit: "lb" },
  { name: "Red Cabbage", category: "Produce", defaultYield: 0.80, unit: "lb" },
  { name: "Napa Cabbage", category: "Produce", defaultYield: 0.75, unit: "lb" },
  { name: "Baby Bok Choy", category: "Produce", defaultYield: 0.85, unit: "lb" },
  { name: "Green Zucchini", category: "Produce", defaultYield: 0.90, unit: "lb" },
  { name: "Yellow Squash", category: "Produce", defaultYield: 0.90, unit: "lb" },
  { name: "Italian Eggplant", category: "Produce", defaultYield: 0.82, unit: "lb" },
  { name: "English Cucumbers", category: "Produce", defaultYield: 0.95, unit: "lb" },
  { name: "Blue Lake Green Beans", category: "Produce", defaultYield: 0.88, unit: "lb" },
  { name: "Fresh Asparagus", category: "Produce", defaultYield: 0.78, unit: "lb" },
  { name: "Fresh Broccoli Crowns", category: "Produce", defaultYield: 0.65, unit: "lb" },
  { name: "Cauliflower Head", category: "Produce", defaultYield: 0.65, unit: "lb" },
  { name: "Bi-Color Sweet Corn", category: "Produce", defaultYield: 0.40, unit: "ea" },
  { name: "English Sugar Peas", category: "Produce", defaultYield: 0.90, unit: "lb" },
  { name: "Red Beets (No Tops)", category: "Produce", defaultYield: 0.85, unit: "lb" },
  { name: "Red Radishes Bulk", category: "Produce", defaultYield: 0.90, unit: "lb" },
  { name: "Purple Top Turnips", category: "Produce", defaultYield: 0.80, unit: "lb" },
  { name: "Fresh Parsnips", category: "Produce", defaultYield: 0.78, unit: "lb" },
  { name: "Lemons (Choice)", category: "Produce", defaultYield: 0.45, unit: "lb" },
  { name: "Limes (Choice)", category: "Produce", defaultYield: 0.40, unit: "lb" },
  { name: "Valencia Oranges", category: "Produce", defaultYield: 0.50, unit: "lb" },
  { name: "Ruby Red Grapefruit", category: "Produce", defaultYield: 0.45, unit: "lb" },
  { name: "Granny Smith Apples", category: "Produce", defaultYield: 0.75, unit: "lb" },
  { name: "Bosc Pears", category: "Produce", defaultYield: 0.80, unit: "lb" },
  { name: "Cavendish Bananas", category: "Produce", defaultYield: 0.68, unit: "lb" },
  { name: "Fresh Strawberries", category: "Produce", defaultYield: 0.90, unit: "lb" },
  { name: "Fresh Blueberries", category: "Produce", defaultYield: 0.98, unit: "pt" },
  { name: "Fresh Raspberries", category: "Produce", defaultYield: 0.98, unit: "half-pt" },
  { name: "Fresh Flat-Leaf Parsley", category: "Produce", defaultYield: 0.70, unit: "lb" },
  { name: "Fresh Cilantro Bunch", category: "Produce", defaultYield: 0.70, unit: "lb" },
  { name: "Fresh Genovese Basil", category: "Produce", defaultYield: 0.75, unit: "lb" },
  { name: "Fresh Spearmint Mint", category: "Produce", defaultYield: 0.60, unit: "lb" },
  { name: "Fresh Baby Dill Bunch", category: "Produce", defaultYield: 0.75, unit: "lb" },
  { name: "Fresh Rosemary", category: "Produce", defaultYield: 0.50, unit: "lb" },
  { name: "Fresh English Thyme", category: "Produce", defaultYield: 0.45, unit: "lb" },
  { name: "Fresh Culinary Sage", category: "Produce", defaultYield: 0.50, unit: "oz" },
  { name: "Fresh Chives", category: "Produce", defaultYield: 0.90, unit: "lb" },

  /* DAIRY & CHEESE */
  { name: "Butter (Unsalted Plugra)", category: "Dairy & Cheese", defaultYield: 1.00, unit: "lb" },
  { name: "Butter (Salted)", category: "Dairy & Cheese", defaultYield: 1.00, unit: "lb" },
  { name: "Heavy Cream 36%", category: "Dairy & Cheese", defaultYield: 1.00, unit: "qt" },
  { name: "Whole Milk", category: "Dairy & Cheese", defaultYield: 1.00, unit: "gal" },
  { name: "Skim Milk Pure", category: "Dairy & Cheese", defaultYield: 1.00, unit: "gal" },
  { name: "Half & Half Cream", category: "Dairy & Cheese", defaultYield: 1.00, unit: "qt" },
  { name: "Buttermilk", category: "Dairy & Cheese", defaultYield: 1.00, unit: "qt" },
  { name: "Sour Cream Premium", category: "Dairy & Cheese", defaultYield: 1.00, unit: "lb" },
  { name: "Cream Cheese Plain", category: "Dairy & Cheese", defaultYield: 1.00, unit: "lb" },
  { name: "Cottage Cheese 4% Small Curd", category: "Dairy & Cheese", defaultYield: 1.00, unit: "lb" },
  { name: "Yogurt Plain Whole Milk", category: "Dairy & Cheese", defaultYield: 1.00, unit: "lb" },
  { name: "Greek Yogurt Plain", category: "Dairy & Cheese", defaultYield: 1.00, unit: "lb" },
  { name: "Parmigiano-Reggiano D.O.P.", category: "Dairy & Cheese", defaultYield: 1.00, unit: "lb" },
  { name: "Pecorino Romano D.O.P.", category: "Dairy & Cheese", defaultYield: 1.00, unit: "lb" },
  { name: "Low-Moisture Shredded Cheddar", category: "Dairy & Cheese", defaultYield: 1.00, unit: "lb" },
  { name: "Low-Moisture Shredded Mozzarella", category: "Dairy & Cheese", defaultYield: 1.00, unit: "lb" },
  { name: "Fresh Mozzarella Log", category: "Dairy & Cheese", defaultYield: 1.00, unit: "lb" },
  { name: "Provolone Cheese Sliced", category: "Dairy & Cheese", defaultYield: 1.00, unit: "lb" },
  { name: "Domestic Swiss Cheese Block", category: "Dairy & Cheese", defaultYield: 1.00, unit: "lb" },
  { name: "Aged Gruyere Block", category: "Dairy & Cheese", defaultYield: 0.98, unit: "lb" },
  { name: "Gorgonzola Dolce Premium", category: "Dairy & Cheese", defaultYield: 1.00, unit: "lb" },
  { name: "Goat Cheese Log (Chevre)", category: "Dairy & Cheese", defaultYield: 1.00, unit: "lb" },
  { name: "Ricotta Impastata", category: "Dairy & Cheese", defaultYield: 1.00, unit: "lb" },
  { name: "Feta Cheese Crumbles", category: "Dairy & Cheese", defaultYield: 1.00, unit: "lb" },
  { name: "Queso Fresco Solid", category: "Dairy & Cheese", defaultYield: 1.00, unit: "lb" },
  { name: "Queso Blanco Loaf", category: "Dairy & Cheese", defaultYield: 1.00, unit: "lb" },
  { name: "Land O Lakes American Cheese Sliced", category: "Dairy & Cheese", defaultYield: 1.00, unit: "lb" },
  { name: "Aerosol Whipped Cream", category: "Dairy & Cheese", defaultYield: 1.00, unit: "can" },
  { name: "Gourmet Liquid Ice Cream Base", category: "Dairy & Cheese", defaultYield: 1.00, unit: "gal" },
  { name: "Peeled Liquid Egg Yolks Only", category: "Dairy & Cheese", defaultYield: 1.00, unit: "carton" },
  { name: "Peeled Liquid Egg Whites Only", category: "Dairy & Cheese", defaultYield: 1.00, unit: "carton" },
  { name: "Clarified Butter Pure", category: "Dairy & Cheese", defaultYield: 1.00, unit: "lb" },
  { name: "Pure Organic Ghee", category: "Dairy & Cheese", defaultYield: 1.00, unit: "jar" },

  /* DRY GOODS & STAPLES */
  { name: "All-Purpose Flour", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Sir Lancelot High-Gluten Flour", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "King Arthur Cake Flour", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Whole Wheat Flour Stone Ground", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Semolina Flour Rimachinata", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Yellow Coarse Cornmeal", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Cornstarch Extra Pure", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Baking Powder (Double Acting)", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Baking Soda", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Granulated Sugar White", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Dark Brown Sugar Pure", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Powdered Sugar 10X", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Diamond Crystal Kosher Salt", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Fine Mediterranean Sea Salt", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Standard Iodized Table Salt", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Whole Black Peppercorns Malabar", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Ground White Pepper Pure", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Whole Pink Peppercorns", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "oz" },
  { name: "Smoked Spanish Paprika (Pimentón)", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Cayenne Pepper Ground", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Crushed Red Chili Flakes", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Ground Toasted Cumin", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Whole Coriander Seeds", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Dry Oregano Leaves Mediterranean", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Dry Rubbed Thyme Leaves", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Dry Rubbed Sage Leaves", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Whole California Bay Leaves", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "oz" },
  { name: "Madras Curry Powder Blend", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Garam Masala Spice Ground", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Ground Turmeric Root", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Ground Korintje Cinnamon", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Whole East Indian Nutmeg", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "oz" },
  { name: "Whole Ground Cloves", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Ground Jamaican Allspice", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Whole Star Anise Pods", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Premium Garlic Powder", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Premium Onion Powder", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Dry Mustard Powder", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Long Grain White Rice", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Jasmine Rice Fragrant", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Basmati Rice Extra Long", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Arborio Rice Superfine", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Organic White Quinoa Grain", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Durum Wheat Couscous Semolina", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Japanese Panko Breadcrumbs", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Toasted Plain Breadcrumbs", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Dehydrated Garlic Croutons", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Yellow Corn Tortilla Chips", category: "Dry Goods & Staples", defaultYield: 0.90, unit: "case" },
  { name: "Premium Saltine Crackers", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "box" },
  { name: "Active Dry Yeast", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "oz" },
  { name: "Silver Gelatin Sheets (160 Bloom)", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "pack" },
  { name: "Valrhona Cocoa Powder 100%", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Valrhona 70% Guanaja Chocolate Chips", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Nielsen-Massey Vanilla Bean Paste", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "oz" },
  { name: "Pure Almond Extract", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "oz" },
  { name: "Wildflower Honey Raw Local", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "100% Pure Maple Syrup Grade A Dark", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "gal" },
  { name: "Blackstrap Sulfured Molasses", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "jar" },
  { name: "Lipton Black Tea Bags", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "box" },
  { name: "Premium Green Tea Leaves", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "box" },
  { name: "Minor's Chicken Stock Base Premium", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Minor's Beef Stock Base Premium", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },
  { name: "Minor's Vegetable Stock Base Premium", category: "Dry Goods & Staples", defaultYield: 1.00, unit: "lb" },

  /* CANNED & JARRED */
  { name: "San Marzano Whole Tomatoes 28oz", category: "Canned Goods", defaultYield: 1.00, unit: "can" },
  { name: "Crushed Tomatoes Concentrated #10", category: "Canned Goods", defaultYield: 1.00, unit: "can" },
  { name: "Double Concentrated Tomato Paste", category: "Canned Goods", defaultYield: 1.00, unit: "can" },
  { name: "Diced Tomatoes in Juice #10", category: "Canned Goods", defaultYield: 1.00, unit: "can" },
  { name: "Unsweetened Coconut Milk Premium", category: "Canned Goods", defaultYield: 1.00, unit: "can" },
  { name: "Borden Sweetened Condensed Milk", category: "Canned Goods", defaultYield: 1.00, unit: "can" },
  { name: "Kalamata Olives Pitted", category: "Canned Goods", defaultYield: 1.00, unit: "lb" },
  { name: "Castelvetrano Olives Pitted", category: "Canned Goods", defaultYield: 1.00, unit: "lb" },
  { name: "Kosher Dill Pickle Spears", category: "Canned Goods", defaultYield: 1.00, unit: "gal" },
  { name: "Pickled Jalapeño Wheel Slices", category: "Canned Goods", defaultYield: 1.00, unit: "gal" },
  { name: "Artichoke Hearts in Water 1/4", category: "Canned Goods", defaultYield: 1.00, unit: "can" },
  { name: "Fire Roasted Red Peppers Strips", category: "Canned Goods", defaultYield: 1.00, unit: "can" },
  { name: "Nonpareil Capers in Brine", category: "Canned Goods", defaultYield: 0.70, unit: "lb" },
  { name: "Flat Anchovy Fillets in Olive Oil", category: "Canned Goods", defaultYield: 1.00, unit: "can" },
  { name: "Canned Garbanzo Beans (Chickpeas)", category: "Canned Goods", defaultYield: 1.00, unit: "can" },
  { name: "Canned Black Beans Black Gold", category: "Canned Goods", defaultYield: 1.00, unit: "can" },
  { name: "Sweet Kernel Corn #10", category: "Canned Goods", defaultYield: 1.00, unit: "can" },

  /* OILS & VINEGARS */
  { name: "Extra Virgin Olive Oil (Colavita)", category: "Oils & Vinegars", defaultYield: 1.00, unit: "gal" },
  { name: "Blended Cooking Oil 75/25 Canola/EVOO", category: "Oils & Vinegars", defaultYield: 1.00, unit: "gal" },
  { name: "Pure Expeller Canola Oil", category: "Oils & Vinegars", defaultYield: 1.00, unit: "gal" },
  { name: "Pure Peanut Oil Cooking Premium", category: "Oils & Vinegars", defaultYield: 1.00, unit: "gal" },
  { name: "Toasted Sesame Oil Pure", category: "Oils & Vinegars", defaultYield: 1.00, unit: "qt" },
  { name: "Pure Grapeseed Oil", category: "Oils & Vinegars", defaultYield: 1.00, unit: "gal" },
  { name: "Balsamic Vinegar of Modena I.G.P.", category: "Oils & Vinegars", defaultYield: 1.00, unit: "qt" },
  { name: "Italian Red Wine Vinegar", category: "Oils & Vinegars", defaultYield: 1.00, unit: "gal" },
  { name: "White Wine Vinegar Aged", category: "Oils & Vinegars", defaultYield: 1.00, unit: "gal" },
  { name: "Japanese Rice Vinegar Unseasoned", category: "Oils & Vinegars", defaultYield: 1.00, unit: "gal" },
  { name: "Organic Apple Cider Vinegar", category: "Oils & Vinegars", defaultYield: 1.00, unit: "gal" },
  { name: "Gluten-Free Tamari Soy Sauce", category: "Oils & Vinegars", defaultYield: 1.00, unit: "gal" },
  { name: "Premium Red Boat Fish Sauce", category: "Oils & Vinegars", defaultYield: 1.00, unit: "bottle" },
  { name: "Lee Kum Kee Oyster Sauce", category: "Oils & Vinegars", defaultYield: 1.00, unit: "bottle" },
  { name: "Lea & Perrins Worcestershire Sauce", category: "Oils & Vinegars", defaultYield: 1.00, unit: "gal" },
  { name: "Hellmann's Heavy Duty Mayonnaise", category: "Oils & Vinegars", defaultYield: 1.00, unit: "gal" },
  { name: "Heinz Tomato Ketchup #10 Vol", category: "Oils & Vinegars", defaultYield: 1.00, unit: "case" },
  { name: "Maillé Dijon Mustard Premium", category: "Oils & Vinegars", defaultYield: 1.00, unit: "jar" },
  { name: "Shiro White Miso Paste Pure", category: "Oils & Vinegars", defaultYield: 1.00, unit: "lb" },
  { name: "Korean Gochujang Paste", category: "Oils & Vinegars", defaultYield: 1.00, unit: "lb" },

  /* BREAD & BAKERY */
  { name: "Brioche Hamburger Buns 4inch", category: "Bread & Bakery", defaultYield: 1.00, unit: "pack" },
  { name: "Artisanal Sourdough Batard Loaf", category: "Bread & Bakery", defaultYield: 0.90, unit: "ea" },
  { name: "Flour Tortillas 10inch Press", category: "Bread & Bakery", defaultYield: 1.00, unit: "pack" },
  { name: "White Corn Tortillas 6inch", category: "Bread & Bakery", defaultYield: 1.00, unit: "pack" },

  /* FROZEN */
  { name: "Frozen Sweet Petite Peas", category: "Frozen Components", defaultYield: 1.00, unit: "lb" },
  { name: "Frozen Cut Supersweet Corn", category: "Frozen Components", defaultYield: 1.00, unit: "lb" },
  { name: "Frozen Chopped Spinach Block", category: "Frozen Components", defaultYield: 1.00, unit: "lb" },
  { name: "Frozen 3/8 Straight Cut French Fries", category: "Frozen Components", defaultYield: 1.00, unit: "case" },

  /* BAR PROGRAM - SPIRITS */
  { name: "Tito's Handmade Vodka", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Grey Goose Premium Vodka", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Tanqueray London Dry Gin", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Hendrick's Cucumber Botanical Gin", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Bacardi Superior White Rum", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Myers's Original Dark Rum", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Captain Morgan Spiced Rum", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Patrón Silver Blanco Tequila", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Don Julio Reposado Tequila", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Casamigos Añejo Premium Tequila", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Del Maguey Vida Mezcal Espadín", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Maker's Mark Kentucky Bourbon", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Bulleit Straight Rye Whiskey", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Jameson Irish Whiskey Classic", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Johnnie Walker Black 12Y Blended Scotch", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "The Macallan 12Y Single Malt Scotch", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Courvoisier VS Cognac Brandy", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Disaronno Originale Amaretto Liqueur", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "DeKuyper Triple Sec 30 Proof", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Cointreau Orange Liqueur Premium", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Grand Marnier Orange Liqueur", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Carpano Antica Formula Sweet Vermouth", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Dolin Dry Vermouth de Chambery", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Campari Aperitivo Bitter Red", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Aperol Aperitivo Italian Liqueur", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Fernet-Branca Menta Digestif", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Green Chartreuse French Liqueur", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Yellow Chartreuse Mild French Liqueur", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Grande Absinthe Verte Traditional", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Baileys Original Irish Cream", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Kahlúa Coffee Liqueur Mexican", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Chambord Black Raspberry Royale Liqueur", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },

  /* BAR PROGRAM - BEERS & WINES */
  { name: "Stella Artois Euro Pale Lager", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "case" },
  { name: "Peroni Nastro Azzurro Pilsner", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "case" },
  { name: "Fiddlehead IPA Craft 4-Pack", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "case" },
  { name: "Guinness Extra Stout Pub Cans", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "case" },
  { name: "Kendall-Jackson Vintner's Chardonnay", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Kim Crawford Sauvignon Blanc", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Santa Margherita Pinot Grigio", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Meiomi Premium Pinot Noir", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Avalon Napa Cabernet Sauvignon", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Veuve Clicquot Yellow Label Champagne", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" },
  { name: "Fever-Tree Premium Indian Tonic Water", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "case" },
  { name: "Fever-Tree Premium Ginger Beer", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "case" },
  { name: "Regans' Orange Bitters No. 6", category: "Bar Program - Alcohols", defaultYield: 1.00, unit: "bottle" }
];

const KITCHEN_UNITS = ["lb", "oz", "qt", "gal", "g", "kg", "ea", "can", "pt", "doz", "box", "case", "pack", "bottle", "bunch"];

export default function RecipeSpecSheetBuilder() {
  const [dishName, setDishName] = useState('');
  const [station, setStation] = useState('Sauté');
  const [menuCategory, setMenuCategory] = useState('Mains');
  const [batchYield, setBatchYield] = useState<number>(1);
  const [menuPrice, setMenuPrice] = useState<string>('');
  const [prepTime, setPrepTime] = useState<number>(0);
  const [recipeStatus, setRecipeStatus] = useState('R&D'); 
  const [targetFoodCost, setTargetFoodCost] = useState<string>('28');
  const [mopSteps, setMopSteps] = useState<string[]>([]);
  const [newStep, setNewStep] = useState('');

  const [ingredientSearch, setIngredientSearch] = useState('');
  const [selectedMat, setSelectedMat] = useState<typeof MASTER_PANTRY_CATALOG[0] | null>(null);
  const [matQuantity, setMatQuantity] = useState<number>(0);
  const [chosenUnit, setChosenUnit] = useState<string>('lb');
  const [isOverrideUnlocked, setIsOverrideUnlocked] = useState(false);
  const [addedComponents, setAddedComponents] = useState<any[]>([]);

  const filteredCatalog = ingredientSearch.trim() === '' || isOverrideUnlocked
    ? []
    : MASTER_PANTRY_CATALOG.filter(item =>
        item.name.toLowerCase().includes(ingredientSearch.toLowerCase())
      );

  const handleAddComponent = () => {
    const componentName = isOverrideUnlocked ? ingredientSearch : selectedMat?.name;
    if (!componentName || matQuantity <= 0) return;

    setAddedComponents([...addedComponents, {
      name: componentName,
      quantity: matQuantity,
      unit: chosenUnit,
      yieldPct: isOverrideUnlocked ? 1.0 : selectedMat?.defaultYield,
      category: isOverrideUnlocked ? 'Custom Override' : selectedMat?.category
    }]);
    
    setIngredientSearch('');
    setSelectedMat(null);
    setMatQuantity(0);
    setIsOverrideUnlocked(false);
  };

  const selectMasterItem = (item: typeof MASTER_PANTRY_CATALOG[0]) => {
    setSelectedMat(item);
    setIngredientSearch(item.name);
    setChosenUnit(item.unit);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-zinc-950 text-zinc-100 font-mono tracking-tight selection:bg-emerald-800">
      <div className="mb-8 border-b border-zinc-900 pb-5 flex justify-between items-end">
        <div>
          <h1 className="text-xl font-extrabold tracking-wider text-zinc-100 uppercase font-mono">
            RECIPE SPECIFICATION BUILDER
          </h1>
          <p className="text-[11px] text-zinc-500 font-mono mt-1 uppercase tracking-widest">
            MiseOS v2.4 • Yield Analysis Matrix • Live Margin Costing
          </p>
        </div>
        <div className="text-[11px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono px-3 py-1.5 rounded-md uppercase tracking-wider">
          System Core: Active Interlocked
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="space-y-6 bg-zinc-900/40 p-5 rounded-xl border border-zinc-950 shadow-lg">
          <h2 className="text-xs font-bold text-zinc-400 border-b border-zinc-900 pb-2 uppercase tracking-widest">
            Identity & Target Configuration
          </h2>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1.5 font-bold">
              Dish / Component Name
            </label>
            <input
              type="text"
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
              placeholder="e.g., Prime Ribeye Batard"
              className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-xs focus:border-emerald-600 focus:outline-none text-zinc-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1.5 font-bold">
                Station
              </label>
              <select
                value={station}
                onChange={(e) => setStation(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-xs focus:outline-none text-zinc-200"
              >
                <option>Sauté</option>
                <option>Grill</option>
                <option>Garde Manger</option>
                <option>Pastry</option>
                <option>Prep</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1.5 font-bold">
                Menu Category
              </label>
              <select
                value={menuCategory}
                onChange={(e) => setMenuCategory(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-xs focus:outline-none text-zinc-200"
              >
                <option value="Mains">Mains</option>
                <option value="Appetizers">Appetizers</option>
                <option value="Dessert">Dessert / Pastry</option>
                <option value="Sides">Sides / Accompaniments</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1.5 font-bold">
                Batch Yield (Portions)
              </label>
              <input
                type="number"
                value={batchYield}
                onChange={(e) => setBatchYield(parseInt(e.target.value) || 1)}
                className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded-lg text-xs text-zinc-200"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1.5 font-bold">
                Menu Price (Plate)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-zinc-600 text-xs">$</span>
                <input
                  type="text"
                  value={menuPrice}
                  onChange={(e) => setMenuPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 pl-7 rounded-lg text-xs text-zinc-200"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1.5 font-bold">
                Prep Time (Mins)
              </label>
              <input
                type="number"
                value={prepTime}
                onChange={(e) => setPrepTime(parseInt(e.target.value) || 0)}
                className="w-full bg-zinc-950 border border-zinc-800 p-2 rounded-lg text-xs text-zinc-200"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1.5 font-bold">
                Target Cost %
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={targetFoodCost}
                  onChange={(e) => setTargetFoodCost(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 pr-7 rounded-lg text-xs text-zinc-200"
                />
                <span className="absolute right-3 top-2 text-zinc-600 text-xs">%</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-2 font-bold">
              Recipe Lifecycle
            </label>
            <div className="flex flex-col gap-2 bg-zinc-950 p-3 rounded-lg border border-zinc-900">
              <label className="flex items-center gap-3 cursor-pointer text-xs">
                <input type="radio" checked={recipeStatus === 'R&D'} onChange={() => setRecipeStatus('R&D')} className="accent-emerald-600 h-3.5 w-3.5" />
                <span className={recipeStatus === 'R&D' ? 'text-emerald-400 font-bold' : 'text-zinc-400'}>R&D / Testing Workspace</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer text-xs">
                <input type="radio" checked={recipeStatus === 'Live'} onChange={() => setRecipeStatus('Live')} className="accent-emerald-600 h-3.5 w-3.5" />
                <span className={recipeStatus === 'Live' ? 'text-emerald-400 font-bold' : 'text-zinc-400'}>Live Active Catalog</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer text-xs">
                <input type="radio" checked={recipeStatus === 'Archived'} onChange={() => setRecipeStatus('Archived')} className="accent-emerald-600 h-3.5 w-3.5" />
                <span className={recipeStatus === 'Archived' ? 'text-red-400 font-bold' : 'text-zinc-400'}>Archived / Production Vault</span>
              </label>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900/40 p-5 rounded-xl border border-zinc-950 shadow-md space-y-4">
            <h3 className="text-xs font-bold tracking-widest uppercase text-zinc-400 border-b border-zinc-900 pb-2">
              Formulation & Component Ingestion Ledger
            </h3>
            
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="relative flex-1 w-full">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1.5 font-bold">
                  Search Master Inventory Catalog
                </label>
                <input
                  type="text"
                  value={ingredientSearch}
                  onChange={(e) => {
                    setIngredientSearch(e.target.value);
                    if (!isOverrideUnlocked) setSelectedMat(null);
                  }}
                  placeholder={isOverrideUnlocked ? "Force entry Mode activated - Type custom item..." : "Type component keyword (e.g., Beef, Salmon, Butter...)"}
                  className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-xs focus:border-emerald-600 focus:outline-none text-zinc-100 placeholder:text-zinc-700"
                />

                {filteredCatalog.length > 0 && !isOverrideUnlocked && (
                  <ul className="absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl z-50 divide-y divide-zinc-900">
                    {filteredCatalog.map((item) => (
                      <li
                        key={item.name}
                        onClick={() => selectMasterItem(item)}
                        className="p-3 hover:bg-zinc-900 text-xs cursor-pointer flex justify-between items-center text-zinc-300 transition-colors"
                      >
                        <span className="font-bold text-zinc-200">{item.name}</span>
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                          {item.category}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="w-full md:w-32">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1.5 font-bold">
                  Quantity
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={matQuantity || ''}
                  onChange={(e) => setMatQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-xs text-zinc-100"
                />
              </div>

              <div className="w-full md:w-36">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-1.5 font-bold">
                  Unit Metric
                </label>
                <select
                  value={chosenUnit}
                  onChange={(e) => setChosenUnit(e.target.value)}
                  disabled={!isOverrideUnlocked && !!selectedMat}
                  className="w-full bg-zinc-950 border border-zinc