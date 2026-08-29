// Ultra-fast web-optimized image assets mapper for Dood Cafe
// Replaces multi-megabyte local raw images with fast 600px compressed assets

export const categoryImages = {
  'quick-bites': [
    '/quick-bites/French fries.jpeg',
    '/quick-bites/Peri peri fries.jpeg',
    '/quick-bites/Veg Nuggets.jpeg',
    '/quick-bites/Cheese Triangles.jpeg',
    '/quick-bites/Ring Onion.jpeg',
    '/quick-bites/Chicken nuggets.jpeg',
    '/quick-bites/Popcorn.jpeg',
  ],
  'loaded-fries': [
    '/loaded-fries/Corn cheese Fries.jpeg',
    '/loaded-fries/Chicken loaded fries.jpeg',
    '/loaded-fries/Peri peri chicken Loaded fries.jpeg',
  ],
  'crispy-chicken': [
    '/crispy-chicken/Crispy chicken strips.jpeg',
    '/crispy-chicken/Peri peri chicken strips.jpeg',
    '/crispy-chicken/Crispy chicken lollipop.jpeg',
    '/crispy-chicken/Peri peri chicken lollipop.jpeg',
    '/crispy-chicken/Crispy chicken wings.jpeg',
    '/crispy-chicken/Peri peri chicken wings.jpeg',
    '/crispy-chicken/Dynamite chicken.jpeg',
  ],
  burger: [
    '/burger/Classic veg burger.jpeg',
    '/burger/Panner burger.jpeg',
    '/burger/Crispy Chicken Burger.jpeg',
    '/burger/Peri peri Crispy Chicken Burger.jpeg',
    '/burger/Crispy Chicken Cheese Burger-.jpeg',
    '/burger/Dynamite chicken Burger.jpeg',
    '/burger/Grilled Chicken Burger.jpeg',
  ],
  sandwich: [
    '/sandwich/Veg Grilled Sandwich.jpeg',
    '/sandwich/Egg Sandwich.jpeg',
    '/sandwich/Corn Cheese Sandwich.jpeg',
    '/sandwich/Panner Tikka Sandwich.jpeg',
    '/sandwich/Grilled Chicken Sandwich.jpeg',
    '/sandwich/Grilled chicken Cheese sandwich.jpeg',
    '/sandwich/Fried Chicken Sandwich.jpeg',
    '/sandwich/Fried Chicken Cheese Sandwich.jpeg',
    '/sandwich/Dynamite chicken sandwic.jpeg',
  ],
  'roll-and-wrap': [
    '/roll-and-wrap/Veg Roll.jpeg',
    '/roll-and-wrap/Peri peri Veg Roll.jpeg',
    '/roll-and-wrap/Veg Cheese Roll.jpeg',
    '/roll-and-wrap/Panner Roll.jpeg',
    '/roll-and-wrap/Peri peri Panner Roll.jpeg',
    '/roll-and-wrap/Corn Cheese Roll.jpeg',
    '/roll-and-wrap/Peri peri corn Cheese Roll.jpeg',
    '/roll-and-wrap/Crispy Chicken Wrap.jpeg',
    '/roll-and-wrap/Peri peri Chicken Wrap.jpeg',
    '/roll-and-wrap/Grilled Chicken Wrap.jpeg',
    '/roll-and-wrap/Peri peri Grilled Chicken Wrap.jpeg',
    '/roll-and-wrap/BBQ Chicken Wrap.jpeg',
    '/roll-and-wrap/Dynamite Chicken Wrap.jpeg',
  ],
  korean: [
    '/korean/Korean Chicken Fries.jpeg',
    '/korean/Korean Chicken Burger.jpeg',
    '/korean/Korean Chicken Sandwich.jpeg',
    '/korean/Korean Chicken Wrap.jpeg',
    '/korean/Korean Ramen veg noodles.jpeg',
    '/korean/Korean Ramen panner noodles.jpeg',
    '/korean/Korean Ramen chicken noodles.jpeg',
  ],
  mojitos: [
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1546171753-97d7676e4602?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=600&q=80',
  ],
  milkshakes: [
    'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=600&q=80',
  ],
};

export const getItemImage = (item) => {
  if (item.imageUrl && (item.imageUrl.startsWith('http') || item.imageUrl.startsWith('/'))) {
    return item.imageUrl;
  }
  if (item.image && (item.image.startsWith('http') || item.image.startsWith('/'))) {
    return item.image;
  }

  const categorySlug = item.category?.slug || item.category;
  const images = categoryImages[categorySlug];

  if (!images || images.length === 0) {
    return '/quick-bites/French fries.jpeg';
  }

  // Deterministic pick based on item ID or name string hash
  let hash = 0;
  const str = item._id || item.name || '';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % images.length;
  return images[index];
};

