// Ultra-fast web-optimized image assets mapper for Dood Cafe
// Replaces multi-megabyte local raw images with fast 600px compressed assets

export const categoryImages = {
  coffee: [
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80',
  ],
  tea: [
    'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=600&q=80',
  ],
  burgers: [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=600&q=80',
  ],
  sandwiches: [
    'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1539252554453-80ab65ce3586?auto=format&fit=crop&w=600&q=80',
  ],
  wraps: [
    'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=600&q=80',
  ],
  pasta: [
    'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1621996346565-e3d5d6281270?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1608897013039-887f21d8c804?auto=format&fit=crop&w=600&q=80',
  ],
  'korean-ramen': [
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=600&q=80',
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
  if (item.imageUrl && item.imageUrl.startsWith('http')) {
    return item.imageUrl;
  }

  const categorySlug = item.category?.slug || item.category;
  const images = categoryImages[categorySlug];

  if (!images || images.length === 0) {
    return 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80';
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
