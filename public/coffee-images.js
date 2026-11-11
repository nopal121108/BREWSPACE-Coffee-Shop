// public/coffee-images.js - Curated Coffee & Food Visual Assets for BREWSPACE
// Generates appetizing, high-resolution SVG data-URIs tailored to coffee shop products

const CoffeeImages = {
  // Generate stylized coffee SVG banner with specific theme & colors
  createSvg: (type, title, bgColor, accentColor) => {
    let iconSvg = '';

    if (type === 'latte') {
      iconSvg = `
        <ellipse cx="100" cy="115" rx="50" ry="25" fill="#C68B59" />
        <ellipse cx="100" cy="112" rx="42" ry="18" fill="#F5E6D3" />
        <path d="M100 98 C95 106, 85 110, 100 124 C115 110, 105 106, 100 98 Z" fill="#6F4E37" />
        <path d="M100 102 C97 107, 90 110, 100 118 C110 110, 103 107, 100 102 Z" fill="#FFF" />
        <path d="M55 90 C55 135 70 155 100 155 C130 155 145 135 145 90 Z" fill="none" stroke="#FFFFFF" stroke-width="5" />
        <path d="M143 100 C155 100 162 110 162 120 C162 130 152 135 140 135" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" />
      `;
    } else if (type === 'espresso') {
      iconSvg = `
        <ellipse cx="100" cy="120" rx="35" ry="14" fill="#30231D" />
        <ellipse cx="100" cy="117" rx="30" ry="10" fill="#9C6644" opacity="0.9" />
        <ellipse cx="100" cy="116" rx="22" ry="6" fill="#DDB892" opacity="0.6" />
        <path d="M70 105 C70 135 80 145 100 145 C120 145 130 135 130 105 Z" fill="none" stroke="#FFFFFF" stroke-width="4" />
        <path d="M129 112 C138 112 143 118 143 125 C143 132 136 135 128 135" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" />
        <path d="M60 145 L140 145" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" />
      `;
    } else if (type === 'coldbrew') {
      iconSvg = `
        <rect x="75" y="80" width="50" height="75" rx="10" fill="none" stroke="#FFFFFF" stroke-width="5" />
        <rect x="78" y="95" width="44" height="57" rx="6" fill="#30231D" opacity="0.85" />
        <rect x="85" y="105" width="12" height="12" rx="2" fill="#FFFFFF" opacity="0.25" />
        <rect x="102" y="115" width="12" height="12" rx="2" fill="#FFFFFF" opacity="0.25" />
        <path d="M110 70 L118 110" stroke="#E8DFD2" stroke-width="4" stroke-linecap="round" />
      `;
    } else if (type === 'v60') {
      iconSvg = `
        <polygon points="65,80 135,80 108,125 92,125" fill="#E8DFD2" opacity="0.2" stroke="#FFFFFF" stroke-width="4" />
        <path d="M85 125 L80 155 L120 155 L115 125" fill="#6F4E37" opacity="0.8" stroke="#FFFFFF" stroke-width="4" />
        <path d="M92 65 C92 72 108 72 108 65" stroke="#DDB892" stroke-width="3" stroke-linecap="round" fill="none" />
      `;
    } else if (type === 'matcha') {
      iconSvg = `
        <ellipse cx="100" cy="115" rx="48" ry="22" fill="#406343" />
        <ellipse cx="100" cy="112" rx="40" ry="16" fill="#75A47F" />
        <ellipse cx="100" cy="110" rx="30" ry="10" fill="#BACD92" opacity="0.7" />
        <path d="M58 92 C58 135 72 155 100 155 C128 155 142 135 142 92 Z" fill="none" stroke="#FFFFFF" stroke-width="5" />
      `;
    } else if (type === 'pastry') {
      iconSvg = `
        <path d="M60 130 C60 100 80 85 100 85 C120 85 140 100 140 130 C125 140 75 140 60 130 Z" fill="#DDA15E" stroke="#BC6C25" stroke-width="4" />
        <path d="M78 95 C90 90 110 90 122 95" stroke="#BC6C25" stroke-width="3" stroke-linecap="round" />
        <path d="M70 110 C85 105 115 105 130 110" stroke="#BC6C25" stroke-width="3" stroke-linecap="round" />
      `;
    } else {
      // Default food/dish
      iconSvg = `
        <ellipse cx="100" cy="120" rx="55" ry="25" fill="none" stroke="#FFFFFF" stroke-width="5" />
        <ellipse cx="100" cy="118" rx="42" ry="18" fill="#D4A373" opacity="0.7" />
        <path d="M85 110 C90 105 110 105 115 110" stroke="#6F4E37" stroke-width="4" stroke-linecap="round" />
      `;
    }

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
        <defs>
          <linearGradient id="grad-${type}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${bgColor}" />
            <stop offset="100%" stop-color="${accentColor}" />
          </linearGradient>
          <filter id="shadow">
            <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.25"/>
          </filter>
        </defs>
        <rect width="200" height="200" fill="url(#grad-${type})" />
        <circle cx="100" cy="115" r="55" fill="rgba(255,255,255,0.06)" />
        <circle cx="170" cy="30" r="40" fill="rgba(255,255,255,0.04)" />
        <g filter="url(#shadow)">
          ${iconSvg}
        </g>
      </svg>
    `;

    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg.trim());
  },

  // Map product names to suitable image representations
  getImage: (imageUrl, productName = '', categorySlug = '') => {
    // If it's an uploaded file from server
    if (imageUrl && imageUrl.startsWith('/uploads/')) {
      return imageUrl;
    }
    // If it's already a data URI or external URL
    if (imageUrl && (imageUrl.startsWith('data:') || imageUrl.startsWith('http'))) {
      return imageUrl;
    }

    const name = (productName || '').toLowerCase();
    const cat = (categorySlug || '').toLowerCase();

    if (name.includes('aren') || name.includes('latte') || name.includes('caramel') || name.includes('white')) {
      return CoffeeImages.createSvg('latte', productName, '#6F4E37', '#30231D');
    }
    if (name.includes('espresso') || name.includes('americano') || name.includes('ristretto')) {
      return CoffeeImages.createSvg('espresso', productName, '#30231D', '#1A120E');
    }
    if (name.includes('cold brew') || name.includes('coldbrew') || name.includes('iced')) {
      return CoffeeImages.createSvg('coldbrew', productName, '#4A3525', '#261B13');
    }
    if (name.includes('v60') || name.includes('drip') || name.includes('aeropress') || name.includes('manual')) {
      return CoffeeImages.createSvg('v60', productName, '#5C4033', '#3B271E');
    }
    if (name.includes('matcha') || name.includes('tea') || name.includes('green')) {
      return CoffeeImages.createSvg('matcha', productName, '#2D5A27', '#1E3D1A');
    }
    if (name.includes('croissant') || name.includes('pain') || name.includes('pastry') || name.includes('danish') || name.includes('cake') || cat.includes('pastry')) {
      return CoffeeImages.createSvg('pastry', productName, '#8C5A32', '#58361C');
    }
    if (name.includes('fries') || name.includes('pasta') || name.includes('spaghetti') || cat.includes('main')) {
      return CoffeeImages.createSvg('food', productName, '#7A482A', '#4A2A16');
    }

    // Default warm coffee blend
    return CoffeeImages.createSvg('latte', productName, '#6F4E37', '#30231D');
  }
};

window.CoffeeImages = CoffeeImages;
