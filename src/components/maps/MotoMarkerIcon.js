import L from 'leaflet';

/**
 * Ícone personalizado de moto em movimento para mapas (Entregador e Gestor).
 * - Moto estilizada (vista lateral) com rodas e chassis
 * - Animação de rodas girando e leve “bounce” quando em movimento
 * - Rotação por bearing (direção no mapa: 0° = Norte, 90° = Leste)
 */
export function createMotoMarkerIcon(options = {}) {
  const {
    bearing = 0,
    isMoving = true,
    size = 52,
    accentColor = '#f97316',
  } = options;

  const rotation = bearing - 90; // 0° = Norte (moto “para cima” no mapa)

  const motoSvg = `
    <svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;">
      <defs>
        <linearGradient id="moto-body-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${accentColor}"/>
          <stop offset="100%" stop-color="#ea580c"/>
        </linearGradient>
        <linearGradient id="moto-wheel-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#475569"/>
          <stop offset="100%" stop-color="#1e293b"/>
        </linearGradient>
        <filter id="moto-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.35"/>
        </filter>
      </defs>
      <g transform="rotate(${rotation} 28 28)" filter="url(#moto-shadow)">
        <!-- Chassis / corpo -->
        <path d="M 14 34 Q 16 28 22 26 L 34 26 Q 40 26 44 28 L 48 32 L 46 34 L 42 30 Q 38 28 34 28 L 22 28 Q 18 30 16 34 Z" 
              fill="url(#moto-body-grad)" stroke="#c2410c" stroke-width="0.8" stroke-linejoin="round"/>
        <!-- Banco -->
        <ellipse cx="28" cy="26" rx="6" ry="2.5" fill="#fef3c7" stroke="#c2410c" stroke-width="0.5"/>
        <!-- Farol -->
        <circle cx="48" cy="30" r="2" fill="#fef9c3" stroke="#a16207" stroke-width="0.4"/>
        <!-- Roda traseira -->
        <g transform="translate(14, 40)">
          <g style="animation: ${isMoving ? 'moto-wheel-spin 0.5s linear infinite' : 'none'}; transform-origin: 0 0;">
            <circle cx="0" cy="0" r="6" fill="url(#moto-wheel-grad)" stroke="#0f172a" stroke-width="1.2"/>
            <circle cx="0" cy="0" r="2" fill="#64748b"/>
            <line x1="0" y1="-6" x2="0" y2="6" stroke="#94a3b8" stroke-width="0.6" opacity="0.9"/>
            <line x1="-6" y1="0" x2="6" y2="0" stroke="#94a3b8" stroke-width="0.6" opacity="0.9"/>
          </g>
        </g>
        <!-- Roda dianteira -->
        <g transform="translate(44, 40)">
          <g style="animation: ${isMoving ? 'moto-wheel-spin 0.5s linear infinite' : 'none'}; transform-origin: 0 0;">
            <circle cx="0" cy="0" r="6" fill="url(#moto-wheel-grad)" stroke="#0f172a" stroke-width="1.2"/>
            <circle cx="0" cy="0" r="2" fill="#64748b"/>
            <line x1="0" y1="-6" x2="0" y2="6" stroke="#94a3b8" stroke-width="0.6" opacity="0.9"/>
            <line x1="-6" y1="0" x2="6" y2="0" stroke="#94a3b8" stroke-width="0.6" opacity="0.9"/>
          </g>
        </g>
      </g>
    </svg>
  `;

  return L.divIcon({
    html: `
      <div class="moto-marker-wrapper" style="
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: ${isMoving ? 'moto-bounce 1.2s ease-in-out infinite' : 'none'};
      ">
        <div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: rgba(255,255,255,0.95);
          border: 3px solid ${accentColor};
          box-shadow: 0 4px 14px rgba(0,0,0,0.25);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          ${motoSvg}
        </div>
      </div>
      <style>
        @keyframes moto-wheel-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes moto-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      </style>
    `,
    className: 'moto-marker-leaflet',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/**
 * Calcula o bearing (direção em graus, 0=Norte) entre dois pontos.
 * @param {{lat, lng}} from
 * @param {{lat, lng}} to
 * @returns {number} graus 0-360
 */
export function computeBearing(from, to) {
  if (!from || !to) return 0;
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;
  const x = Math.sin(dLng) * Math.cos(lat2);
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  let bearing = Math.atan2(x, y) * 180 / Math.PI;
  return (bearing + 360) % 360;
}
