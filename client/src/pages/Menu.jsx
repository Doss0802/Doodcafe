import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, ArrowUpDown, X, ChevronLeft, ChevronRight } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import MenuCard from '../components/MenuCard';
import ItemModal from '../components/ItemModal';

/* ── Fallback Category List ──────────────────────────────── */
const DEFAULT_CATEGORIES = [
  { _id: 'c-quick-bites', name: 'Quick Bites', slug: 'quick-bites', icon: '🍟' },
  { _id: 'c-loaded-fries', name: 'Loaded Fries', slug: 'loaded-fries', icon: '🧀' },
  { _id: 'c-crispy-chicken', name: 'Crispy chicken', slug: 'crispy-chicken', icon: '🍗' },
  { _id: 'c-burger', name: 'Burger', slug: 'burger', icon: '🍔' },
  { _id: 'c-sandwich', name: 'Sandwich', slug: 'sandwich', icon: '🥪' },
  { _id: 'c-roll-and-wrap', name: 'Roll & Wrap', slug: 'roll-and-wrap', icon: '🌯' },
  { _id: 'c-korean', name: 'Korean', slug: 'korean', icon: '🍜' },
  { _id: 'c-pasta-and-pulao', name: 'Pasta & Pulao', slug: 'pasta-and-pulao', icon: '🍝' },
  { _id: 'c-mojitos', name: 'Mojitos', slug: 'mojitos', icon: '🍹' },
  { _id: 'c-milkshakes', name: 'Milkshakes', slug: 'milkshakes', icon: '🥤' },
];

/* ── Fallback Menu Items Dataset ──────────────────────────── */
const DEFAULT_ITEMS = [
  { _id: 'item-qb1', name: 'French Fries', price: 99, category: { name: 'Quick Bites', slug: 'quick-bites', icon: '🍟' }, description: 'Crispy golden fries seasoned with classic salt', isVeg: true, isBestseller: true, preparationTime: 8, tags: ['crispy', 'snack', 'veg'], imageUrl: '/quick-bites/French fries.jpeg' },
  { _id: 'item-qb2', name: 'Peri Peri Fries', price: 120, category: { name: 'Quick Bites', slug: 'quick-bites', icon: '🍟' }, description: 'Fries tossed in fiery peri peri spice blend', isVeg: true, isBestseller: true, preparationTime: 8, tags: ['spicy', 'peri-peri', 'veg'], imageUrl: '/quick-bites/Peri peri fries.jpeg' },
  { _id: 'item-qb3', name: 'Veg Nuggets', price: 149, category: { name: 'Quick Bites', slug: 'quick-bites', icon: '🍟' }, description: 'Crunchy veggie nuggets served with dipping sauce', isVeg: true, isBestseller: false, preparationTime: 10, tags: ['veg', 'nuggets', 'crunchy'], imageUrl: '/quick-bites/Veg Nuggets.jpeg' },
  { _id: 'item-qb4', name: 'Cheese Triangles', price: 160, category: { name: 'Quick Bites', slug: 'quick-bites', icon: '🍟' }, description: 'Crispy triangle pockets loaded with melted cheese', isVeg: true, isBestseller: false, preparationTime: 10, tags: ['cheese', 'snack', 'veg'], imageUrl: '/quick-bites/Cheese Triangles.jpeg' },
  { _id: 'item-qb5', name: 'Ring Onion', price: 149, category: { name: 'Quick Bites', slug: 'quick-bites', icon: '🍟' }, description: 'Classic battered & fried onion rings, golden and crispy', isVeg: true, isBestseller: false, preparationTime: 8, tags: ['onion', 'rings', 'veg'], imageUrl: '/quick-bites/Ring Onion.jpeg' },
  { _id: 'item-qb6', name: 'Chicken Nuggets', price: 159, category: { name: 'Quick Bites', slug: 'quick-bites', icon: '🍟' }, description: 'Juicy chicken bites with a crispy seasoned coating', isVeg: false, isBestseller: true, preparationTime: 12, tags: ['chicken', 'nuggets', 'crispy'], imageUrl: '/quick-bites/Chicken nuggets.jpeg' },
  { _id: 'item-qb7', name: 'Popcorn', price: 169, category: { name: 'Quick Bites', slug: 'quick-bites', icon: '🍟' }, description: 'Light and fluffy seasoned popcorn, perfect for snacking', isVeg: true, isBestseller: false, preparationTime: 5, tags: ['snack', 'light', 'veg'], imageUrl: '/quick-bites/Popcorn.jpeg' },
  { _id: 'item-lf1', name: 'Loaded corn cheese Fries', price: 199, category: { name: 'Loaded Fries', slug: 'loaded-fries', icon: '🧀' }, description: 'Golden fries generously smothered in melted cheese and sweet golden corn', isVeg: true, isBestseller: true, preparationTime: 10, tags: ['loaded', 'cheese', 'corn'], imageUrl: '/loaded-fries/Corn cheese Fries.jpeg' },
  { _id: 'item-lf2', name: 'Chicken loaded fries', price: 199, category: { name: 'Loaded Fries', slug: 'loaded-fries', icon: '🧀' }, description: 'Crispy fries topped with seasoned shredded chicken, melted cheese and special sauce', isVeg: false, isBestseller: true, preparationTime: 12, tags: ['loaded', 'chicken', 'crispy'], imageUrl: '/loaded-fries/Chicken loaded fries.jpeg' },
  { _id: 'item-lf3', name: 'Peri peri chicken Loaded fries', price: 229, category: { name: 'Loaded Fries', slug: 'loaded-fries', icon: '🧀' }, description: 'Fiery peri peri spiced fries loaded with spicy chicken chunks and rich cheese dressing', isVeg: false, isBestseller: true, preparationTime: 12, tags: ['spicy', 'peri-peri', 'chicken'], imageUrl: '/loaded-fries/Peri peri chicken Loaded fries.jpeg' },
  { _id: 'item-cc1', name: 'Crispy chicken strips 4pcs', price: 199, category: { name: 'Crispy chicken', slug: 'crispy-chicken', icon: '🍗' }, description: 'Tender chicken inner fillets in an ultra-crispy golden crust', isVeg: false, isBestseller: true, preparationTime: 12, tags: ['crispy', 'strips', 'chicken'], imageUrl: '/crispy-chicken/Crispy chicken strips.jpeg' },
  { _id: 'item-cc2', name: 'Peri peri chicken strips 4pcs', price: 219, category: { name: 'Crispy chicken', slug: 'crispy-chicken', icon: '🍗' }, description: 'Crispy chicken tenders coated in fiery peri peri seasoning', isVeg: false, isBestseller: false, preparationTime: 12, tags: ['spicy', 'peri-peri', 'strips'], imageUrl: '/crispy-chicken/Peri peri chicken strips.jpeg' },
  { _id: 'item-cc3', name: 'Crispy chicken lollipop 4pcs', price: 199, category: { name: 'Crispy chicken', slug: 'crispy-chicken', icon: '🍗' }, description: 'Crispy fried chicken drumettes served with tangy dip', isVeg: false, isBestseller: true, preparationTime: 15, tags: ['crispy', 'lollipop', 'chicken'], imageUrl: '/crispy-chicken/Crispy chicken lollipop.jpeg' },
  { _id: 'item-cc4', name: 'Peri peri chicken lollipop 4pcs', price: 219, category: { name: 'Crispy chicken', slug: 'crispy-chicken', icon: '🍗' }, description: 'Juicy chicken lollipops dusted with hot peri peri spices', isVeg: false, isBestseller: false, preparationTime: 15, tags: ['spicy', 'peri-peri', 'lollipop'], imageUrl: '/crispy-chicken/Peri peri chicken lollipop.jpeg' },
  { _id: 'item-cc5', name: 'Crispy chicken wings 4pcs', price: 199, category: { name: 'Crispy chicken', slug: 'crispy-chicken', icon: '🍗' }, description: 'Golden fried crunchy chicken wings seasoned to perfection', isVeg: false, isBestseller: true, preparationTime: 15, tags: ['crispy', 'wings', 'chicken'], imageUrl: '/crispy-chicken/Crispy chicken wings.jpeg' },
  { _id: 'item-cc6', name: 'Peri peri chicken wings 4pcs', price: 219, category: { name: 'Crispy chicken', slug: 'crispy-chicken', icon: '🍗' }, description: 'Spicy peri peri glazed chicken wings packed with bold flavour', isVeg: false, isBestseller: false, preparationTime: 15, tags: ['spicy', 'peri-peri', 'wings'], imageUrl: '/crispy-chicken/Peri peri chicken wings.jpeg' },
  { _id: 'item-cc7', name: 'Dynamite chicken', price: 229, category: { name: 'Crispy chicken', slug: 'crispy-chicken', icon: '🍗' }, description: 'Crispy bite-sized chicken tossed in creamy spicy dynamite sauce', isVeg: false, isBestseller: true, preparationTime: 12, tags: ['dynamite', 'spicy', 'chicken'], imageUrl: '/crispy-chicken/Dynamite chicken.jpeg' },
  { _id: 'item-bg1', name: 'Classic veg burger', price: 149, category: { name: 'Burger', slug: 'burger', icon: '🍔' }, description: 'Crispy vegetable patty with fresh lettuce, tomatoes and house special burger mayo', isVeg: true, isBestseller: true, preparationTime: 10, tags: ['veg', 'classic', 'burger'], imageUrl: '/burger/Classic veg burger.jpeg' },
  { _id: 'item-bg2', name: 'Panner burger', price: 199, category: { name: 'Burger', slug: 'burger', icon: '🍔' }, description: 'Spiced golden paneer patty layered with fresh veggies and tangy mint chutney mayo', isVeg: true, isBestseller: false, preparationTime: 12, tags: ['veg', 'paneer', 'desi'], imageUrl: '/burger/Panner burger.jpeg' },
  { _id: 'item-bg3', name: 'Crispy Chicken Burger', price: 199, category: { name: 'Burger', slug: 'burger', icon: '🍔' }, description: 'Juicy fried chicken breast in crunchy batter topped with crisp lettuce and creamy sauce', isVeg: false, isBestseller: true, preparationTime: 12, tags: ['crispy', 'chicken', 'burger'], imageUrl: '/burger/Crispy Chicken Burger.jpeg' },
  { _id: 'item-bg4', name: 'Peri peri Crispy Chicken Burger', price: 219, category: { name: 'Burger', slug: 'burger', icon: '🍔' }, description: 'Crunchy chicken patty coated in spicy peri peri spice blend with zesty sauce', isVeg: false, isBestseller: false, preparationTime: 12, tags: ['spicy', 'peri-peri', 'chicken'], imageUrl: '/burger/Peri peri Crispy Chicken Burger.jpeg' },
  { _id: 'item-bg5', name: 'Crispy Chicken Cheese Burger', price: 219, category: { name: 'Burger', slug: 'burger', icon: '🍔' }, description: 'Golden crispy chicken burger stacked with melted cheddar cheese slice', isVeg: false, isBestseller: true, preparationTime: 12, tags: ['cheese', 'crispy', 'chicken'], imageUrl: '/burger/Crispy Chicken Cheese Burger-.jpeg' },
  { _id: 'item-bg6', name: 'Dynamite chicken Burger', price: 219, category: { name: 'Burger', slug: 'burger', icon: '🍔' }, description: 'Crispy chicken patty generously glazed with spicy creamy dynamite sauce', isVeg: false, isBestseller: false, preparationTime: 12, tags: ['dynamite', 'spicy', 'chicken'], imageUrl: '/burger/Dynamite chicken Burger.jpeg' },
  { _id: 'item-bg7', name: 'Grilled Chicken Burger', price: 199, category: { name: 'Burger', slug: 'burger', icon: '🍔' }, description: 'Flame-grilled marinated chicken breast with fresh greens and herb garlic dressing', isVeg: false, isBestseller: false, preparationTime: 12, tags: ['grilled', 'healthy', 'chicken'], imageUrl: '/burger/Grilled Chicken Burger.jpeg' },
  { _id: 'item-sw1', name: 'Veg Grilled Sandwich', price: 149, category: { name: 'Sandwich', slug: 'sandwich', icon: '🥪' }, description: 'Toasted bread loaded with sliced fresh veggies, herbs and cheese spread', isVeg: true, isBestseller: true, preparationTime: 8, tags: ['veg', 'grilled', 'sandwich'], imageUrl: '/sandwich/Veg Grilled Sandwich.jpeg' },
  { _id: 'item-sw2', name: 'Egg Sandwich', price: 149, category: { name: 'Sandwich', slug: 'sandwich', icon: '🥪' }, description: 'Fluffy seasoned egg omelette with crispy veggies and pepper mayo', isVeg: false, isBestseller: false, preparationTime: 8, tags: ['egg', 'sandwich', 'protein'], imageUrl: '/sandwich/Egg Sandwich.jpeg' },
  { _id: 'item-sw3', name: 'Corn Cheese Sandwich', price: 199, category: { name: 'Sandwich', slug: 'sandwich', icon: '🥪' }, description: 'Golden sweet corn and abundant melted cheese in grilled golden bread', isVeg: true, isBestseller: true, preparationTime: 10, tags: ['veg', 'corn', 'cheese'], imageUrl: '/sandwich/Corn Cheese Sandwich.jpeg' },
  { _id: 'item-sw4', name: 'Panner Tikka Sandwich', price: 199, category: { name: 'Sandwich', slug: 'sandwich', icon: '🥪' }, description: 'Marinated spiced paneer tikka cubes with mint mayo and bell peppers', isVeg: true, isBestseller: false, preparationTime: 10, tags: ['veg', 'paneer', 'desi'], imageUrl: '/sandwich/Panner Tikka Sandwich.jpeg' },
  { _id: 'item-sw5', name: 'Grilled Chicken Sandwich', price: 199, category: { name: 'Sandwich', slug: 'sandwich', icon: '🥪' }, description: 'Juicy herb-grilled chicken breast slices with fresh greens and light mayo', isVeg: false, isBestseller: true, preparationTime: 10, tags: ['chicken', 'grilled', 'healthy'], imageUrl: '/sandwich/Grilled Chicken Sandwich.jpeg' },
  { _id: 'item-sw6', name: 'Grilled chicken Cheese sandwich', price: 219, category: { name: 'Sandwich', slug: 'sandwich', icon: '🥪' }, description: 'Herb grilled chicken and double cheddar cheese melted to perfection', isVeg: false, isBestseller: true, preparationTime: 10, tags: ['chicken', 'cheese', 'grilled'], imageUrl: '/sandwich/Grilled chicken Cheese sandwich.jpeg' },
  { _id: 'item-sw7', name: 'Fried Chicken Sandwich', price: 199, category: { name: 'Sandwich', slug: 'sandwich', icon: '🥪' }, description: 'Crispy golden fried chicken fillet with crunchy lettuce and special sauce', isVeg: false, isBestseller: false, preparationTime: 12, tags: ['chicken', 'fried', 'crispy'], imageUrl: '/sandwich/Fried Chicken Sandwich.jpeg' },
  { _id: 'item-sw8', name: 'Fried Chicken Cheese Sandwich', price: 219, category: { name: 'Sandwich', slug: 'sandwich', icon: '🥪' }, description: 'Crispy golden fried chicken topped with gooey melted cheese slice', isVeg: false, isBestseller: false, preparationTime: 12, tags: ['chicken', 'cheese', 'crispy'], imageUrl: '/sandwich/Fried Chicken Cheese Sandwich.jpeg' },
  { _id: 'item-sw9', name: 'Dynamite chicken sandwich', price: 219, category: { name: 'Sandwich', slug: 'sandwich', icon: '🥪' }, description: 'Crispy chicken tossed in fiery creamy dynamite sauce in grilled bread', isVeg: false, isBestseller: true, preparationTime: 10, tags: ['dynamite', 'spicy', 'chicken'], imageUrl: '/sandwich/Dynamite chicken sandwic.jpeg' },
  { _id: 'item-rw1', name: 'Veg Roll', price: 149, category: { name: 'Roll & Wrap', slug: 'roll-and-wrap', icon: '🌯' }, description: 'Crispy golden potato filling rolled in a soft flour tortilla with mint chutney', isVeg: true, isBestseller: true, preparationTime: 8, tags: ['veg', 'roll', 'crispy'], imageUrl: '/roll-and-wrap/Veg Roll.jpeg' },
  { _id: 'item-rw2', name: 'Peri peri Veg Roll', price: 169, category: { name: 'Roll & Wrap', slug: 'roll-and-wrap', icon: '🌯' }, description: 'Peri peri spiced veggie filling wrapped in a soft tortilla', isVeg: true, isBestseller: false, preparationTime: 8, tags: ['veg', 'peri-peri', 'spicy'], imageUrl: '/roll-and-wrap/Peri peri Veg Roll.jpeg' },
  { _id: 'item-rw3', name: 'Veg Cheese Roll', price: 169, category: { name: 'Roll & Wrap', slug: 'roll-and-wrap', icon: '🌯' }, description: 'Fresh veggies and melted cheese wrapped in a toasted flour roll', isVeg: true, isBestseller: false, preparationTime: 8, tags: ['veg', 'cheese', 'roll'], imageUrl: '/roll-and-wrap/Veg Cheese Roll.jpeg' },
  { _id: 'item-rw4', name: 'Panner Roll', price: 199, category: { name: 'Roll & Wrap', slug: 'roll-and-wrap', icon: '🌯' }, description: 'Spiced paneer pieces with onions and chutneys in a soft roll', isVeg: true, isBestseller: true, preparationTime: 10, tags: ['veg', 'paneer', 'roll'], imageUrl: '/roll-and-wrap/Panner Roll.jpeg' },
  { _id: 'item-rw5', name: 'Peri peri Panner Roll', price: 219, category: { name: 'Roll & Wrap', slug: 'roll-and-wrap', icon: '🌯' }, description: 'Peri peri marinated paneer rolled with crunchy onions and cool mint sauce', isVeg: true, isBestseller: false, preparationTime: 10, tags: ['veg', 'paneer', 'peri-peri'], imageUrl: '/roll-and-wrap/Peri peri Panner Roll.jpeg' },
  { _id: 'item-rw6', name: 'Corn Cheese Roll', price: 199, category: { name: 'Roll & Wrap', slug: 'roll-and-wrap', icon: '🌯' }, description: 'Sweet golden corn and gooey melted cheese in a crispy toasted roll', isVeg: true, isBestseller: true, preparationTime: 10, tags: ['veg', 'corn', 'cheese'], imageUrl: '/roll-and-wrap/Corn Cheese Roll.jpeg' },
  { _id: 'item-rw7', name: 'Peri peri corn Cheese Roll', price: 219, category: { name: 'Roll & Wrap', slug: 'roll-and-wrap', icon: '🌯' }, description: 'Corn and cheese roll levelled up with fiery peri peri seasoning', isVeg: true, isBestseller: false, preparationTime: 10, tags: ['veg', 'peri-peri', 'cheese'], imageUrl: '/roll-and-wrap/Peri peri corn Cheese Roll.jpeg' },
  { _id: 'item-rw8', name: 'Crispy Chicken Wrap', price: 199, category: { name: 'Roll & Wrap', slug: 'roll-and-wrap', icon: '🌯' }, description: 'Golden crispy fried chicken strips wrapped with fresh lettuce and creamy sauce', isVeg: false, isBestseller: true, preparationTime: 10, tags: ['chicken', 'crispy', 'wrap'], imageUrl: '/roll-and-wrap/Crispy Chicken Wrap.jpeg' },
  { _id: 'item-rw9', name: 'Peri peri Chicken Wrap', price: 219, category: { name: 'Roll & Wrap', slug: 'roll-and-wrap', icon: '🌯' }, description: 'Spicy peri peri chicken strips with crunchy veggies and cool sauce', isVeg: false, isBestseller: false, preparationTime: 10, tags: ['chicken', 'peri-peri', 'spicy'], imageUrl: '/roll-and-wrap/Peri peri Chicken Wrap.jpeg' },
  { _id: 'item-rw10', name: 'Grilled Chicken Wrap', price: 199, category: { name: 'Roll & Wrap', slug: 'roll-and-wrap', icon: '🌯' }, description: 'Juicy herb-grilled chicken breast with fresh greens and garlic mayo', isVeg: false, isBestseller: true, preparationTime: 10, tags: ['chicken', 'grilled', 'healthy'], imageUrl: '/roll-and-wrap/Grilled Chicken Wrap.jpeg' },
  { _id: 'item-rw11', name: 'Peri peri Grilled Chicken Wrap', price: 219, category: { name: 'Roll & Wrap', slug: 'roll-and-wrap', icon: '🌯' }, description: 'Peri peri spiced grilled chicken with crunchy slaw and tangy sauce', isVeg: false, isBestseller: false, preparationTime: 10, tags: ['chicken', 'peri-peri', 'grilled'], imageUrl: '/roll-and-wrap/Peri peri Grilled Chicken Wrap.jpeg' },
  { _id: 'item-rw12', name: 'BBQ Chicken Wrap', price: 219, category: { name: 'Roll & Wrap', slug: 'roll-and-wrap', icon: '🌯' }, description: 'Smoky BBQ glazed chicken strips with cheddar, lettuce and chipotle mayo', isVeg: false, isBestseller: true, preparationTime: 10, tags: ['chicken', 'bbq', 'smoky'], imageUrl: '/roll-and-wrap/BBQ Chicken Wrap.jpeg' },
  { _id: 'item-rw13', name: 'Dynamite Chicken Wrap', price: 219, category: { name: 'Roll & Wrap', slug: 'roll-and-wrap', icon: '🌯' }, description: 'Crispy chicken in fiery dynamite sauce wrapped with crunchy veggies', isVeg: false, isBestseller: true, preparationTime: 10, tags: ['chicken', 'dynamite', 'spicy'], imageUrl: '/roll-and-wrap/Dynamite Chicken Wrap.jpeg' },
  { _id: 'item-kr1', name: 'Korean Chicken Fries', price: 219, category: { name: 'Korean', slug: 'korean', icon: '🍜' }, description: 'Crispy seasoned french fries topped with Korean glazed chicken chunks and scallions', isVeg: false, isBestseller: true, preparationTime: 10, tags: ['korean', 'chicken', 'fries', 'crispy'], imageUrl: '/korean/Korean Chicken Fries.jpeg' },
  { _id: 'item-kr2', name: 'Korean Chicken Burger', price: 219, category: { name: 'Korean', slug: 'korean', icon: '🍜' }, description: 'Crunchy chicken thigh dipped in sweet & spicy gochujang glaze with kimchi slaw', isVeg: false, isBestseller: true, preparationTime: 12, tags: ['korean', 'chicken', 'burger', 'spicy'], imageUrl: '/korean/Korean Chicken Burger.jpeg' },
  { _id: 'item-kr3', name: 'Korean Chicken Sandwich', price: 219, category: { name: 'Korean', slug: 'korean', icon: '🍜' }, description: 'Toasted gourmet sandwich stuffed with sweet-spicy Korean chicken and melted cheese', isVeg: false, isBestseller: false, preparationTime: 10, tags: ['korean', 'chicken', 'sandwich'], imageUrl: '/korean/Korean Chicken Sandwich.jpeg' },
  { _id: 'item-kr4', name: 'Korean Chicken Wrap', price: 219, category: { name: 'Korean', slug: 'korean', icon: '🍜' }, description: 'Soft tortilla rolled with fiery Korean chicken strips, crisp cucumber and sesame mayo', isVeg: false, isBestseller: false, preparationTime: 10, tags: ['korean', 'chicken', 'wrap'], imageUrl: '/korean/Korean Chicken Wrap.jpeg' },
  { _id: 'item-kr5', name: 'Korean Ramen veg noodles', price: 199, category: { name: 'Korean', slug: 'korean', icon: '🍜' }, description: 'Authentic Korean style spicy instant noodles with fresh mixed veggies and savory broth', isVeg: true, isBestseller: true, preparationTime: 10, tags: ['korean', 'ramen', 'veg', 'noodles'], imageUrl: '/korean/Korean Ramen veg noodles.jpeg' },
  { _id: 'item-kr6', name: 'Korean Ramen panner noodles', price: 219, category: { name: 'Korean', slug: 'korean', icon: '🍜' }, description: 'Fiery Korean broth ramen noodles topped with golden paneer cubes and herbs', isVeg: true, isBestseller: false, preparationTime: 12, tags: ['korean', 'ramen', 'paneer', 'noodles'], imageUrl: '/korean/Korean Ramen panner noodles.jpeg' },
  { _id: 'item-kr7', name: 'Korean Ramen chicken noodles', price: 219, category: { name: 'Korean', slug: 'korean', icon: '🍜' }, description: 'Hearty spicy Korean ramen loaded with tender chicken pieces, scallions and boiled egg', isVeg: false, isBestseller: true, preparationTime: 12, tags: ['korean', 'ramen', 'chicken', 'noodles'], imageUrl: '/korean/Korean Ramen chicken noodles.jpeg' },
  { _id: 'item-pp1', name: 'Alfredo veg Pasta', price: 199, category: { name: 'Pasta & Pulao', slug: 'pasta-and-pulao', icon: '🍝' }, description: 'Creamy white sauce penne pasta loaded with garlic, herbs and sauteed garden veggies', isVeg: true, isBestseller: true, preparationTime: 12, tags: ['pasta', 'alfredo', 'creamy', 'veg'], imageUrl: '/pasta-and-pulao/Alfredo veg Pasta.jpeg' },
  { _id: 'item-pp2', name: 'Alfredo Egg pasta', price: 229, category: { name: 'Pasta & Pulao', slug: 'pasta-and-pulao', icon: '🍝' }, description: 'Rich and velvety Alfredo pasta tossed with seasoned boiled egg slices and parmesan', isVeg: false, isBestseller: false, preparationTime: 12, tags: ['pasta', 'alfredo', 'egg'], imageUrl: '/pasta-and-pulao/Alfredo Egg pasta.jpeg' },
  { _id: 'item-pp3', name: 'Alfredo Panner pasta', price: 219, category: { name: 'Pasta & Pulao', slug: 'pasta-and-pulao', icon: '🍝' }, description: 'Silky smooth Alfredo cream sauce pasta topped with spiced golden paneer cubes', isVeg: true, isBestseller: false, preparationTime: 12, tags: ['pasta', 'alfredo', 'paneer', 'veg'], imageUrl: '/pasta-and-pulao/Alfredo Panner pasta.jpeg' },
  { _id: 'item-pp4', name: 'Alfredo chicken pasta', price: 219, category: { name: 'Pasta & Pulao', slug: 'pasta-and-pulao', icon: '🍝' }, description: 'Tender juicy chicken chunks in an indulgent creamy garlic cheese Alfredo sauce', isVeg: false, isBestseller: true, preparationTime: 14, tags: ['pasta', 'alfredo', 'chicken'], imageUrl: '/pasta-and-pulao/Alfredo chicken pasta.jpeg' },
  { _id: 'item-pp5', name: 'Veg pulao', price: 199, category: { name: 'Pasta & Pulao', slug: 'pasta-and-pulao', icon: '🍝' }, description: 'Aromatic basmati rice simmered with whole spices, garden vegetables and ghee', isVeg: true, isBestseller: true, preparationTime: 12, tags: ['pulao', 'rice', 'veg', 'desi'], imageUrl: '/pasta-and-pulao/Veg pulao.jpeg' },
  { _id: 'item-pp6', name: 'Egg pulao', price: 229, category: { name: 'Pasta & Pulao', slug: 'pasta-and-pulao', icon: '🍝' }, description: 'Fragrant spiced basmati rice pulao served with flavorful seasoned eggs and raita', isVeg: false, isBestseller: false, preparationTime: 12, tags: ['pulao', 'rice', 'egg'], imageUrl: '/pasta-and-pulao/Egg pulao.jpeg' },
  { _id: 'item-pp7', name: 'Panner pulao', price: 249, category: { name: 'Pasta & Pulao', slug: 'pasta-and-pulao', icon: '🍝' }, description: 'Royal aromatic pulao cooked with golden roasted paneer cubes and fragrant herbs', isVeg: true, isBestseller: false, preparationTime: 14, tags: ['pulao', 'rice', 'paneer', 'veg'], imageUrl: '/pasta-and-pulao/Panner pulao.jpeg' },
  { _id: 'item-pp8', name: 'Chicken pulao', price: 249, category: { name: 'Pasta & Pulao', slug: 'pasta-and-pulao', icon: '🍝' }, description: 'Succulent marinated chicken pieces slow-cooked with long grain basmati rice and rich spices', isVeg: false, isBestseller: true, preparationTime: 15, tags: ['pulao', 'rice', 'chicken'], imageUrl: '/pasta-and-pulao/Chicken pulao.jpeg' },
  { _id: 'item-m1', name: 'Classic Virgin Mojito', price: 129, category: { name: 'Mojitos', slug: 'mojitos', icon: '🍹' }, description: 'Fresh mint, lime wedges & sparkling soda', isVeg: true, isBestseller: true, preparationTime: 5, tags: ['mint', 'soda'], imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60' },
  { _id: 'item-ms1', name: 'Belgian Chocolate Milkshake', price: 179, category: { name: 'Milkshakes', slug: 'milkshakes', icon: '🥤' }, description: 'Thick creamy milkshake made with rich Belgian dark chocolate', isVeg: true, isBestseller: true, preparationTime: 6, tags: ['chocolate'], imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=60' },
];

const filterAndSortLocal = (category, search, veg, sortBy) => {
  let list = [...DEFAULT_ITEMS];
  if (category && category !== 'all') {
    list = list.filter((i) => i.category.slug === category);
  }
  if (veg) {
    list = list.filter((i) => i.isVeg);
  }
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.category.name.toLowerCase().includes(q)
    );
  }

  list.sort((a, b) => {
    if (sortBy === 'price_asc') return a.price - b.price;
    if (sortBy === 'price_desc') return b.price - a.price;
    if (sortBy === 'prep_time') return (a.preparationTime || 0) - (b.preparationTime || 0);
    if (sortBy === 'popularity') return (b.isBestseller ? 1 : 0) - (a.isBestseller ? 1 : 0);
    return a.name.localeCompare(b.name);
  });

  return list;
};

export default function Menu() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [dsaMeta, setDsaMeta] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  // Extracted URL state data
  const selectedCategory = searchParams.get('category') || 'all';
  const activePage = parseInt(searchParams.get('page') || '1');
  const searchQuery = searchParams.get('search') || '';
  const sortBy = searchParams.get('sort') || searchParams.get('sortBy') || 'popularity';
  const onlyVeg = searchParams.get('veg') === 'true';

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    document.title = 'Menu — Dood Cafe';
    axiosInstance
      .get('/menu/categories')
      .then((res) => {
        const catList = res.data?.data;
        if (Array.isArray(catList) && catList.length > 0) {
          setCategories(catList);
        } else {
          setCategories(DEFAULT_CATEGORIES);
        }
      })
      .catch(() => setCategories(DEFAULT_CATEGORIES));
  }, []);

  // Fetch live API data using Axios based on URL params: GET /api/menu?category=${selectedCategory}...
  const fetchMenuItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (searchQuery) params.set('search', searchQuery);
      if (sortBy) {
        params.set('sort', sortBy);
        params.set('sortBy', sortBy);
      }
      if (onlyVeg) params.set('veg', 'true');
      params.set('page', activePage);
      params.set('limit', '12');

      const res = await axiosInstance.get(`/menu?${params.toString()}`);
      const responseData = res.data;
      const fetchedItems = responseData?.data;

      if (Array.isArray(fetchedItems) && fetchedItems.length > 0) {
        setItems(fetchedItems);
        setPagination(
          responseData.meta?.pagination ||
            responseData.pagination || { pages: 1, total: fetchedItems.length, page: 1 }
        );
        if (responseData.meta?.dsaEngine) {
          setDsaMeta(responseData.meta.dsaEngine);
        }
      } else {
        const fallbackList = filterAndSortLocal(selectedCategory, searchQuery, onlyVeg, sortBy);
        setItems(fallbackList);
        setPagination({ pages: 1, total: fallbackList.length, page: 1 });
      }
    } catch (err) {
      console.warn('Backend API connection warning, using local dataset:', err);
      const fallbackList = filterAndSortLocal(selectedCategory, searchQuery, onlyVeg, sortBy);
      setItems(fallbackList);
      setPagination({ pages: 1, total: fallbackList.length, page: 1 });
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, sortBy, activePage, onlyVeg]);

  useEffect(() => {
    fetchMenuItems();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [fetchMenuItems]);

  const handleCategoryChange = (slug) => {
    const p = new URLSearchParams(searchParams);
    if (slug === 'all') p.delete('category');
    else p.set('category', slug);
    p.delete('page');
    setSearchParams(p);
  };

  const categoryTabsRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollability = useCallback(() => {
    if (categoryTabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoryTabsRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  }, []);

  useEffect(() => {
    const el = categoryTabsRef.current;
    if (!el) return;
    checkScrollability();
    el.addEventListener('scroll', checkScrollability, { passive: true });
    window.addEventListener('resize', checkScrollability);
    return () => {
      el.removeEventListener('scroll', checkScrollability);
      window.removeEventListener('resize', checkScrollability);
    };
  }, [checkScrollability, categories]);

  const scrollCategories = (direction) => {
    if (categoryTabsRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      categoryTabsRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const p = new URLSearchParams(searchParams);
    if (searchInput.trim()) p.set('search', searchInput.trim());
    else p.delete('search');
    p.delete('page');
    setSearchParams(p);
  };

  const clearSearch = () => {
    setSearchInput('');
    const p = new URLSearchParams(searchParams);
    p.delete('search');
    setSearchParams(p);
  };

  const handleSortChange = (e) => {
    const val = e.target.value;
    const p = new URLSearchParams(searchParams);
    if (val) {
      p.set('sort', val);
      p.set('sortBy', val);
    } else {
      p.delete('sort');
      p.delete('sortBy');
    }
    p.delete('page');
    setSearchParams(p);
  };

  const toggleVegFilter = () => {
    const p = new URLSearchParams(searchParams);
    if (onlyVeg) p.delete('veg');
    else p.set('veg', 'true');
    p.delete('page');
    setSearchParams(p);
  };

  return (
    <main className="menu-page">
      <div className="container">
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-title">Our Menu</h1>
          <p className="page-sub">Explore our wide range of premium food &amp; beverages</p>
        </div>

        {/* Search & QuickSort Controls */}
        <div className="menu-controls flex flex-wrap gap-3 items-center justify-between">
          {/* MenuTrie Search Input */}
          <form className="search-bar flex-1 min-w-[260px]" onSubmit={handleSearchSubmit} role="search">
            <Search size={18} className="search-icon" />
            <input
              id="menu-search-input"
              type="search"
              className="search-input"
              placeholder="Search menu items (e.g. fries, burger, roll)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search menu items"
            />
            {searchQuery && (
              <button type="button" className="search-clear" onClick={clearSearch} title="Clear search">
                <X size={16} />
              </button>
            )}
            <button type="submit" className="search-btn" id="menu-search-btn">
              Search
            </button>
          </form>

          {/* QuickSort Selector */}
          <div className="sort-wrapper">
            <label htmlFor="menu-sort-select">
              <ArrowUpDown size={14} /> Sort By:
            </label>
            <select
              id="menu-sort-select"
              value={sortBy}
              onChange={handleSortChange}
              className="sort-select"
              aria-label="QuickSort order selector"
            >
              <option value="popularity">Bestsellers (Popularity)</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="prep_time">Prep Time: Quickest</option>
              <option value="name">Name (A - Z)</option>
            </select>
          </div>

          {/* Veg Filter */}
          <button
            id="veg-filter-btn"
            className={`filter-chip ${onlyVeg ? 'filter-chip-active' : ''}`}
            onClick={toggleVegFilter}
          >
            <SlidersHorizontal size={14} />
            Veg Only
          </button>
        </div>

        {/* Category Carousel / Sliding Tabs */}
        <div className="category-carousel-wrapper">
          <button
            type="button"
            className={`carousel-arrow carousel-arrow-left ${!canScrollLeft ? 'carousel-arrow-hidden' : ''}`}
            onClick={() => scrollCategories('left')}
            aria-label="Scroll categories left"
            tabIndex={canScrollLeft ? 0 : -1}
          >
            <ChevronLeft size={20} />
          </button>

          <div
            className="category-tabs"
            ref={categoryTabsRef}
            role="tablist"
            aria-label="Menu categories"
          >
            <button
              role="tab"
              aria-selected={selectedCategory === 'all'}
              className={`cat-tab ${selectedCategory === 'all' ? 'cat-tab-active' : ''}`}
              onClick={() => handleCategoryChange('all')}
            >
              <span className="cat-icon">🍽️</span>
              <span className="cat-name">All</span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat._id}
                role="tab"
                aria-selected={selectedCategory === cat.slug}
                className={`cat-tab ${selectedCategory === cat.slug ? 'cat-tab-active' : ''}`}
                id={`tab-${cat.slug}`}
                onClick={() => handleCategoryChange(cat.slug)}
              >
                <span className="cat-icon">{cat.icon}</span>
                <span className="cat-name">{cat.name}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className={`carousel-arrow carousel-arrow-right ${!canScrollRight ? 'carousel-arrow-hidden' : ''}`}
            onClick={() => scrollCategories('right')}
            aria-label="Scroll categories right"
            tabIndex={canScrollRight ? 0 : -1}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Active Search & DSA Info Bar */}
        {searchQuery && (
          <div className="search-indicator flex items-center justify-between text-sm py-2 px-3 bg-stone-900/60 rounded-md border border-stone-800 my-3">
            <span>
              Trie Search results for "<strong>{searchQuery}</strong>"
            </span>
            <button className="search-clear-inline text-amber-400 hover:underline flex items-center gap-1" onClick={clearSearch}>
              <X size={14} /> Clear Search
            </button>
          </div>
        )}

        {/* Dynamic Grid Cards Displaying Photo, Name, and Price */}
        {loading ? (
          <div className="menu-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🔍</span>
            <h3>No menu items found</h3>
            <p>Try a different search term or category filter</p>
          </div>
        ) : (
          <div className="menu-grid">
            {items.map((item) => (
              <MenuCard key={item._id} item={item} onItemClick={(it) => setSelectedItem(it)} />
            ))}
          </div>
        )}

        {/* Item Quick View Modal */}
        {selectedItem && <ItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="pagination flex items-center justify-center gap-2 mt-8">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`page-btn ${activePage === p ? 'page-btn-active' : ''}`}
                onClick={() => {
                  const sp = new URLSearchParams(searchParams);
                  sp.set('page', p);
                  setSearchParams(sp);
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
