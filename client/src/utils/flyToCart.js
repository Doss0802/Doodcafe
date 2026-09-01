/**
 * flyToCart.js — Dynamic flying cart animation utility
 * Animates a cloned thumbnail/icon from the added item to the header Cart Icon,
 * followed by a bounce micro-interaction on the target cart button.
 */

export function flyToCart(startElement, imageSrc, fallbackIcon = '🍽️') {
  const target = document.getElementById('cart-toggle-btn') || document.querySelector('.cart-btn');
  if (!target) return;

  const startRect = startElement ? startElement.getBoundingClientRect() : null;
  const targetRect = target.getBoundingClientRect();

  if (!startRect) return;

  // Flyer dimensions
  const flyerSize = 60; // px
  const startX = startRect.left + startRect.width / 2 - flyerSize / 2;
  const startY = startRect.top + startRect.height / 2 - flyerSize / 2;
  const targetX = targetRect.left + targetRect.width / 2 - flyerSize / 2;
  const targetY = targetRect.top + targetRect.height / 2 - flyerSize / 2;

  // Create flyer container
  const flyer = document.createElement('div');
  flyer.className = 'fly-to-cart-element';
  flyer.style.left = `${startX}px`;
  flyer.style.top = `${startY}px`;

  if (imageSrc) {
    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = '';
    img.className = 'fly-to-cart-img';
    flyer.appendChild(img);
  } else {
    const icon = document.createElement('span');
    icon.className = 'fly-to-cart-icon';
    icon.textContent = fallbackIcon;
    flyer.appendChild(icon);
  }

  document.body.appendChild(flyer);

  // Force DOM reflow to commit initial position
  void flyer.offsetWidth;

  // Animate to target
  requestAnimationFrame(() => {
    flyer.style.transform = `translate3d(${targetX - startX}px, ${targetY - startY}px, 0) scale(0.18) rotate(360deg)`;
    flyer.style.opacity = '0.7';
  });

  const duration = 650; // ms matching CSS transition

  setTimeout(() => {
    if (flyer.parentNode) {
      flyer.parentNode.removeChild(flyer);
    }

    // Trigger cart icon bounce micro-interaction
    target.classList.remove('cart-bump');
    void target.offsetWidth; // force reflow
    target.classList.add('cart-bump');

    setTimeout(() => {
      target.classList.remove('cart-bump');
    }, 500);
  }, duration);
}
