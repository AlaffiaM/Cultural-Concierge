export const cities = [
  { name: "Lagos", country: "Nigeria", icon: "🌴", iconClass: "culture", city_id: "LOS-NGA" },
  { name: "Abuja", country: "Nigeria", icon: "🏛️", iconClass: "culture", city_id: "ABV-NGA" },
  { name: "Kigali", country: "Rwanda", icon: "⛰️", iconClass: "wellness", city_id: "KGL-RWA" },
  { name: "Nairobi", country: "Kenya", icon: "🌿", iconClass: "wellness", city_id: "NBO-KEN" },
];

export const pillarIcons = { CULTURE: "◆", WELLNESS: "✦", SOCIAL: "●" };
export const pillarColors = { CULTURE: "#B45F2D", WELLNESS: "#8A9A5B", SOCIAL: "#5B8A9A" };

export const vibeMeta = {
  "Premium":       { icon: "✦", color: "#B45F2D", bg: "rgba(180,95,45,0.08)" },
  "Chic":          { icon: "◆", color: "#7E8C58", bg: "rgba(126,140,88,0.12)" },
  "Serene":        { icon: "◦", color: "#3a6b8a", bg: "rgba(100,130,180,0.1)" },
  "Intimate":      { icon: "✧", color: "#8a4a6a", bg: "rgba(160,100,140,0.1)" },
  "Vibrant":       { icon: "❖", color: "#b06a1e", bg: "rgba(200,120,50,0.1)" },
  "Curated":       { icon: "●", color: "#575760", bg: "rgba(80,80,96,0.1)" },
};

export const cityGradients = {
  culture: "linear-gradient(135deg, #B45F2D 0%, #8B4513 100%)",
  wellness: "linear-gradient(135deg, #8A9A5B 0%, #5A6B3A 100%)",
};

export const sourceLabels = {
  eventbrite: 'Eventbrite',
  kenyabuzz: 'KenyaBuzz',
  mookh: 'Mookh',
  ticketsasa: 'Ticketsasa',
  tixafrica: 'Tix Africa',
  curated: 'Curated',
  manual: 'Manual',
}

export const moodPresets = [
  { label: "Chill & Relaxed",   icon: "😌", query: "deep relaxation, spa, quiet cafes, wellness retreats" },
  { label: "Artsy & Cultural",  icon: "🎨", query: "art galleries, museums, theatre, cultural festivals" },
  { label: "Party & Social",    icon: "🎉", query: "nightlife, live music, dancing, social venues" },
  { label: "Foodie",            icon: "🍽️", query: "fine dining, local cuisine, food markets, cafes" },
  { label: "Active & Outdoors", icon: "🌿", query: "hiking, nature, outdoor activities, adventure" },
  { label: "Hidden Gems",       icon: "💎", query: "off the beaten path, secret venues, unique experiences" },
];
