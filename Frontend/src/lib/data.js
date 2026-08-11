export const cities = [
  { name: "Lagos", country: "Nigeria", icon: "🌴", iconClass: "culture", city_id: "LOS-NGA" },
  { name: "Abuja", country: "Nigeria", icon: "🏛️", iconClass: "culture", city_id: "ABV-NGA" },
  { name: "Kigali", country: "Rwanda", icon: "⛰️", iconClass: "wellness", city_id: "KGL-RWA" },
  { name: "Nairobi", country: "Kenya", icon: "🌿", iconClass: "wellness", city_id: "NBO-KEN" },
];

export const pillarIcons = { CULTURE: "🎭", WELLNESS: "🧘", SOCIAL: "🎨" };
export const pillarColors = { CULTURE: "#B45F2D", WELLNESS: "#8A9A5B", SOCIAL: "#5B8A9A" };

export const vibeMeta = {
  "Premium":       { icon: "✨", color: "#B45F2D", bg: "rgba(180,95,45,0.12)" },
  "Chic":          { icon: "🖤", color: "#8A9A5B", bg: "rgba(138,154,91,0.15)" },
  "Serene":        { icon: "🌊", color: "#3a6b8a", bg: "rgba(100,130,180,0.12)" },
  "Intimate":      { icon: "🕯️", color: "#8a4a6a", bg: "rgba(160,100,140,0.12)" },
  "Vibrant":       { icon: "🔥", color: "#c07020", bg: "rgba(200,120,50,0.12)" },
  "Curated":       { icon: "🎯", color: "#555",    bg: "rgba(80,80,100,0.1)" },
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
