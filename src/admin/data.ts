import type {
  AdminStory,
  VotingCategory,
  RequestsState,
  SponsoredDeal,
  Partner,
  Product,
  GalleryImage,
  ActivityLogEntry,
  LoginAttempt,
  Guard,
} from './types';

let uid = 1;
const nid = () => uid++;

export function createInitialStories(): AdminStory[] {
  return [
    { id: nid(), title: 'Amara Njeri: The Face That Stopped Nairobi', category: 'Woman of the Week', excerpt: "She walked in with nothing but confidence. Now she's on everyone's radar.", body: 'Full editorial coming soon.', image: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600&q=80', status: 'live', author: 'Editorial Team', date: 'Jun 9, 2026' },
    { id: nid(), title: 'David Osei: Style Is a Language', category: 'Man of the Week', excerpt: "He's redefining what masculine elegance looks like in West Africa.", body: 'Full editorial coming soon.', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80', status: 'live', author: 'Editorial Team', date: 'Jun 9, 2026' },
    { id: nid(), title: 'Temi Ade: Art as Resistance', category: 'Artist of the Week', excerpt: 'Her canvases speak louder than most protest signs.', body: 'Full editorial coming soon.', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80', status: 'live', author: 'L. Achebe', date: 'Jun 8, 2026' },
    { id: nid(), title: 'The Karubis: Still in Love', category: 'Couple of the Week', excerpt: 'Ten years married, and somehow more in love than the wedding day.', body: 'Full editorial coming soon.', image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600&q=80', status: 'live', author: 'Editorial Team', date: 'Jun 7, 2026' },
    { id: nid(), title: 'Zara Mensah Built an Empire at 28', category: 'Entrepreneur of the Week', excerpt: 'From a single sewing machine to a continental fashion house.', body: 'Full editorial coming soon.', image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&q=80', status: 'live', author: 'K. Owusu', date: 'Jun 6, 2026' },
    { id: nid(), title: 'The Ankara Revolution Goes Global', category: 'Fashion Feature', excerpt: 'How a fabric born of resistance became a global runway staple.', body: 'Full editorial coming soon.', image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=80', status: 'scheduled', author: 'Editorial Team', date: 'Jun 22, 2026' },
    { id: nid(), title: "Kofi Asante: Painting Africa's Future in Gold", category: 'Artist of the Week', excerpt: 'A draft profile awaiting final approval before publishing.', body: 'Draft text…', image: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&q=80', status: 'draft', author: 'L. Achebe', date: '—' },
    { id: nid(), title: 'Naledi Dlamini: From Soweto to the Cover', category: 'Woman of the Week', excerpt: 'A street-style photo went viral. Now she\u2019s shooting campaigns.', body: 'Draft text…', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80', status: 'draft', author: 'Editorial Team', date: '—' },
  ];
}

export function createInitialVotingCategories(): VotingCategory[] {
  return [
    { id: nid(), key: 'lady', name: 'Lady of the Week', icon: '👑', status: 'open', opens: '2026-06-15', closes: '2026-06-21', contestants: [
      { id: nid(), name: 'Amara Njeri', tagline: '"Redefining beauty on her own terms"', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80', reward: '🏆 Magazine Feature', votes: 2847 },
      { id: nid(), name: 'Zara Mensah', tagline: '"Entrepreneur. Visionary. Unstoppable."', image: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300&q=80', reward: '📷 Pro Photoshoot', votes: 2103 },
      { id: nid(), name: 'Temi Ade', tagline: '"Art, grace, and fire in equal measure."', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&q=80', reward: '💄 Beauty Package', votes: 1654 },
      { id: nid(), name: 'Nia Kamau', tagline: '"The camera finds her before she finds it."', image: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=300&q=80', reward: '⭐ Sponsored Feature', votes: 987 },
    ]},
    { id: nid(), key: 'man', name: 'Man of the Week', icon: '🕶', status: 'open', opens: '2026-06-15', closes: '2026-06-21', contestants: [
      { id: nid(), name: 'David Osei', tagline: '"Style is a language he speaks fluently."', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80', reward: '🏆 Magazine Feature', votes: 1924 },
      { id: nid(), name: 'Marcus Boateng', tagline: '"The architect of his own aesthetic."', image: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=300&q=80', reward: '📷 Pro Photoshoot', votes: 1402 },
      { id: nid(), name: 'Kofi Asante', tagline: "\"Painting Africa's future in gold.\"", image: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&q=80', reward: '🎨 Studio Session', votes: 1188 },
    ]},
    { id: nid(), key: 'couple', name: 'Couple of the Week', icon: '💑', status: 'open', opens: '2026-06-15', closes: '2026-06-21', contestants: [
      { id: nid(), name: 'The Karubis', tagline: '"Ten years and still going strong."', image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=300&q=80', reward: '💍 Anniversary Shoot', votes: 3112 },
      { id: nid(), name: 'The Mwangis', tagline: '"Love that found its way across oceans."', image: 'https://images.unsplash.com/photo-1521566652839-697aa473761a?w=300&q=80', reward: '✈️ Weekend Getaway', votes: 1876 },
      { id: nid(), name: 'The Adeyemis', tagline: '"Art, culture, and love — perfectly framed."', image: 'https://images.unsplash.com/photo-1529636798458-92182e662485?w=300&q=80', reward: '📸 Family Portrait', votes: 1334 },
    ]},
    { id: nid(), key: 'photo', name: 'Photo of the Week', icon: '📸', status: 'open', opens: '2026-06-15', closes: '2026-06-21', contestants: [
      { id: nid(), name: 'Between Worlds', tagline: 'by Cogvana Visuals', image: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=300&q=80', reward: '🖼 Print Feature', votes: 1456 },
      { id: nid(), name: 'Strength & Softness', tagline: 'by Lena K.', image: 'https://images.unsplash.com/photo-1492288991661-058aa541ff43?w=300&q=80', reward: '💰 Cash Prize', votes: 982 },
      { id: nid(), name: 'Golden Identity', tagline: 'by P. Adesanya', image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300&q=80', reward: '📷 Gear Voucher', votes: 765 },
    ]},
    { id: nid(), key: 'fashion', name: 'Fashion Feature', icon: '👗', status: 'scheduled', opens: '2026-06-22', closes: '2026-06-28', contestants: [
      { id: nid(), name: 'The Silk Edit', tagline: 'Fluid lines, quiet power.', image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=300&q=80', reward: '🏆 Cover Feature', votes: 987 },
      { id: nid(), name: 'Ankara Royale', tagline: 'Culture worn as confidence.', image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=300&q=80', reward: '👗 Designer Spotlight', votes: 1240 },
      { id: nid(), name: 'Modern Kente', tagline: 'Heritage meets the future.', image: 'https://images.unsplash.com/photo-1551232864-3f0890e580d9?w=300&q=80', reward: '💄 Styling Session', votes: 654 },
    ]},
  ];
}

export function createInitialRequests(): RequestsState {
  return {
    featured: [
      { id: nid(), name: 'Aisha Bello', email: 'aisha.bello@gmail.com', category: 'Woman of the Week', instagram: '@aishabello_', detail: 'I started my own tailoring line at 19 after dropping out of design school — now I dress brides across three counties.', status: 'pending', date: '2 days ago' },
      { id: nid(), name: 'Themba Nkosi', email: 'themba.nkosi@outlook.com', category: 'Man of the Week', instagram: '@themba.nkosi', detail: 'Self-taught barber turned style consultant for three radio presenters in Joburg.', status: 'approved', date: '5 days ago' },
      { id: nid(), name: 'Chidinma Okafor', email: 'chidinma.o@yahoo.com', category: 'Artist Spotlight', instagram: '@chidinma.paints', detail: 'Mixed-media painter exploring diaspora identity through reclaimed fabric.', status: 'pending', date: '1 day ago' },
      { id: nid(), name: 'Kwame & Linda Boateng', email: 'kwame.linda@gmail.com', category: 'Couple of the Week', instagram: '@kwameandlinda', detail: 'Married for 2 years, run a community kitchen together every Sunday.', status: 'pending', date: '4 hours ago' },
      { id: nid(), name: 'Folake Adeyemi', email: 'folake.a@gmail.com', category: 'Entrepreneur Feature', instagram: '@folake.builds', detail: 'Application missing required business documentation.', status: 'rejected', date: '1 week ago' },
    ],
    booking: [
      { id: nid(), name: 'Grace Wambui', email: 'grace.wambui@gmail.com', phone: '+254 712 345 678', service: 'Photography – Portraits', prefDate: 'Jun 18, 2026', message: 'Looking for a clean studio portrait set for a new headshot.', status: 'approved', date: '3 days ago' },
      { id: nid(), name: 'Daniel Mutiso', email: 'd.mutiso@gmail.com', phone: '+254 700 112 233', service: 'Couple Shoot', prefDate: 'Jun 25, 2026', message: 'Engagement shoot, prefer outdoor golden hour.', status: 'pending', date: '3 hours ago' },
      { id: nid(), name: 'Velvet Braids Studio', email: 'hello@velvetbraids.co', phone: '+254 722 998 877', service: 'Branding Package', prefDate: 'Jul 2, 2026', message: 'Need full branding shoot for new salon location.', status: 'pending', date: '6 hours ago' },
      { id: nid(), name: 'Ife Okonkwo', email: 'ife.okonkwo@gmail.com', phone: '+234 803 221 990', service: 'Beauty – Makeup', prefDate: 'Jun 20, 2026', message: 'Bridal trial makeup session.', status: 'contacted', date: '2 days ago' },
    ],
    sponsored: [
      { id: nid(), business: 'Luxe Salon Nairobi', contact: 'Wanjiru Kamau', email: 'wanjiru@luxesalon.co', industry: 'Beauty & Wellness', budget: 'KES 30,000 – 60,000', goals: 'Launch our new bridal package to a younger audience.', status: 'approved', date: '1 week ago' },
      { id: nid(), business: 'Coastal Glow Spa', contact: 'Amani Said', email: 'amani@coastalglow.co', industry: 'Beauty & Wellness', budget: 'KES 15,000 – 30,000', goals: 'Drive bookings during the low season.', status: 'pending', date: '1 day ago' },
      { id: nid(), business: 'Maua Florals & Events', contact: 'Esther Njoki', email: 'esther@mauaflorals.co', industry: 'Events & Entertainment', budget: 'KES 60,000 – 100,000', goals: 'Position as the go-to florist for weddings.', status: 'pending', date: '2 days ago' },
      { id: nid(), business: 'The Kente House', contact: 'Yaw Darko', email: 'yaw@kentehouse.co', industry: 'Fashion & Apparel', budget: 'Above KES 100,000', goals: 'Tell the story behind our weaving cooperative.', status: 'contacted', date: '4 days ago' },
    ],
    partnership: [
      { id: nid(), business: 'Sundowner Events Co.', email: 'team@sundownerevents.co', category: 'Wedding Planner', about: 'Full-service wedding and events planning across Nairobi.', status: 'pending', date: '2 days ago' },
      { id: nid(), business: 'Nairobi Ink Tattoo Co.', email: 'book@nairobiink.co', category: 'Other', about: 'Custom tattoo studio specialising in Adinkra-inspired work.', status: 'approved', date: '1 week ago' },
      { id: nid(), business: 'Glow By Nia', email: 'hello@glowbynia.co', category: 'Beauty Shop', about: 'Clean beauty products made with shea and baobab oil.', status: 'pending', date: '3 days ago' },
      { id: nid(), business: 'Coral Print Studio', email: 'info@coralprint.co', category: 'Print Shop', about: 'Could not verify business registration on file.', status: 'rejected', date: '2 weeks ago' },
    ],
    mediaKit: [
      { id: nid(), email: 'partnerships@nimbuscreative.co', company: 'Nimbus Creative Agency', status: 'contacted', date: '5 days ago' },
      { id: nid(), email: 'brand@tendwabeverages.co', company: 'Tendwa Beverages Ltd', status: 'pending', date: '2 days ago' },
      { id: nid(), email: 'marketing@solacehospitality.co', company: 'Solace Hospitality Group', status: 'pending', date: '6 hours ago' },
    ],
  };
}

export function createInitialSponsoredDeals(): SponsoredDeal[] {
  return [
    { id: nid(), business: 'Luxe Salon Nairobi Story', industry: 'Beauty & Wellness', budget: 'KES 30K–60K', contact: 'Wanjiru Kamau', stage: 'live' },
    { id: nid(), business: 'Adisa Couture Spotlight', industry: 'Fashion & Apparel', budget: 'KES 60K–100K', contact: 'Adisa Owusu', stage: 'live' },
    { id: nid(), business: 'Glow By Nia Feature', industry: 'Beauty & Wellness', budget: 'KES 15K–30K', contact: 'Nia Kamau', stage: 'production' },
    { id: nid(), business: 'Coastal Glow Spa Story', industry: 'Beauty & Wellness', budget: 'KES 15K–30K', contact: 'Amani Said', stage: 'inquiry' },
    { id: nid(), business: 'Zuri Cosmetics Holiday Edit', industry: 'Beauty & Wellness', budget: 'KES 100K+', contact: 'Zuri Achieng', stage: 'completed' },
  ];
}

export function createInitialPartners(): Partner[] {
  return [
    { id: nid(), name: 'Luxe Salon Nairobi', category: 'Salon', status: 'active', email: 'wanjiru@luxesalon.co' },
    { id: nid(), name: 'Adisa Couture', category: 'Fashion Designer', status: 'active', email: 'hello@adisacouture.co' },
    { id: nid(), name: 'The Kente House', category: 'Fashion Designer', status: 'pending', email: 'yaw@kentehouse.co' },
    { id: nid(), name: 'Glow By Nia', category: 'Beauty Shop', status: 'active', email: 'hello@glowbynia.co' },
    { id: nid(), name: 'Coral Print Studio', category: 'Print Shop', status: 'suspended', email: 'info@coralprint.co' },
    { id: nid(), name: 'Velvet Braids Studio', category: 'Salon', status: 'active', email: 'hello@velvetbraids.co' },
    { id: nid(), name: 'Nairobi Ink Tattoo Co.', category: 'Other', status: 'active', email: 'book@nairobiink.co' },
    { id: nid(), name: 'Sundowner Events Co.', category: 'Wedding Planner', status: 'pending', email: 'team@sundownerevents.co' },
  ];
}

export function createInitialProducts(): Product[] {
  return [
    { id: nid(), name: 'Editorial Print Set "Faces of Africa Vol. 1"', price: 4500, stock: 4, category: 'Prints', image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80' },
    { id: nid(), name: 'P&S Tote Bag — Gold Edition', price: 1800, stock: 32, category: 'Accessories', image: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=400&q=80' },
    { id: nid(), name: '"Every Face Has A Story" Tee', price: 2200, stock: 18, category: 'Apparel', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80' },
    { id: nid(), name: 'Cogvana Photography Zine Issue 3', price: 3000, stock: 0, category: 'Prints', image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=80' },
    { id: nid(), name: 'P&S Enamel Pin Set', price: 1200, stock: 56, category: 'Accessories', image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=400&q=80' },
    { id: nid(), name: 'Limited Cover Poster — Amara Njeri', price: 2800, stock: 7, category: 'Prints', image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&q=80' },
  ];
}

export function createInitialGallery(): GalleryImage[] {
  return [
    { id: nid(), image: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=500&q=80', caption: 'Between Worlds', credit: 'by Cogvana Visuals' },
    { id: nid(), image: 'https://images.unsplash.com/photo-1492288991661-058aa541ff43?w=500&q=80', caption: 'Strength & Softness', credit: 'by Lena K.' },
    { id: nid(), image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=500&q=80', caption: 'Golden Identity', credit: 'by P. Adesanya' },
    { id: nid(), image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=500&q=80', caption: 'The Silk Edit', credit: 'by Cogvana Visuals' },
    { id: nid(), image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=500&q=80', caption: 'Ankara Royale', credit: 'by N. Achieng' },
    { id: nid(), image: 'https://images.unsplash.com/photo-1551232864-3f0890e580d9?w=500&q=80', caption: 'Modern Kente', credit: 'by Cogvana Visuals' },
    { id: nid(), image: 'https://images.unsplash.com/photo-1521566652839-697aa473761a?w=500&q=80', caption: 'Two Hearts, One Frame', credit: 'by Lena K.' },
    { id: nid(), image: 'https://images.unsplash.com/photo-1529636798458-92182e662485?w=500&q=80', caption: 'Golden Hour Vows', credit: 'by P. Adesanya' },
  ];
}

export function createInitialActivityLog(): ActivityLogEntry[] {
  return [
    { text: "Amara Editor approved Themba Nkosi's featured application", time: '2 hours ago', type: 'admin' },
    { text: 'New booking request received from Daniel Mutiso', time: '3 hours ago', type: 'system' },
    { text: 'Voting totals synced from Firestore', time: '6 hours ago', type: 'system' },
    { text: 'Amara Editor published "The Ankara Revolution Goes Global"', time: '1 day ago', type: 'admin' },
    { text: 'Sponsored deal "Glow By Nia Feature" moved to Production', time: '1 day ago', type: 'admin' },
    { text: 'Failed login attempt blocked from unrecognized device', time: '2 days ago', type: 'security' },
    { text: 'Amara Editor added new partner: Velvet Braids Studio', time: '3 days ago', type: 'admin' },
    { text: 'Weekly vote totals reset for new voting cycle', time: '5 days ago', type: 'system' },
    { text: 'Amara Editor rejected partnership application: Coral Print Studio', time: '6 days ago', type: 'admin' },
    { text: 'Automated backup snapshot saved to Cloud Storage', time: '6 days ago', type: 'system' },
  ];
}

export function createInitialLoginAttempts(): LoginAttempt[] {
  return [
    { email: 'editor@pnsmagazine.com', status: 'success', location: 'Nairobi, KE', device: 'Chrome · macOS', time: '2 hours ago' },
    { email: 'unknown@unknown.com', status: 'blocked', location: 'Lagos, NG', device: 'flagged — repeated failures', time: '2 days ago' },
    { email: 'editor@pnsmagazine.com', status: 'success', location: 'Nairobi, KE', device: 'Safari · iPhone', time: '4 days ago' },
    { email: '—', status: 'blocked', location: 'Unknown IP', device: 'bot signature — honeypot triggered', time: '5 days ago' },
    { email: 'editor@pnsmagazine.com', status: 'success', location: 'Nairobi, KE', device: 'Chrome · macOS', time: '6 days ago' },
  ];
}

export function createInitialTickerMessages(): string[] {
  return [
    'Woman of the Week: Amara Njeri',
    'Voting Arena Open — Cast Your Vote Now',
    'Sponsored Story: Luxe Salon Nairobi',
    'Featured Couple: The Karubis',
    'P&S Shop: New Editorial Prints Available',
    'Book Your Professional Shoot This Month',
  ];
}

export const GUARDS: Guard[] = [
  { label: 'Brute-force lockout', desc: '3 failed logins triggers a 30-second cooldown' },
  { label: 'Two-factor authentication', desc: 'Required on every admin login, no exceptions' },
  { label: 'CSRF token verification', desc: 'Every form submission checked against a session token' },
  { label: 'Honeypot bot traps', desc: 'Hidden fields on public forms catch automated submissions' },
  { label: 'Input sanitization', desc: 'All content is validated and escaped before writing to Firestore' },
  { label: 'Firestore security rules', desc: 'Writes restricted server-side to the authenticated admin UID' },
  { label: 'Session auto-timeout', desc: 'Idle sessions are signed out automatically' },
  { label: 'Full audit logging', desc: 'Every create, edit, approval, and deletion is recorded' },
];

export const REQUEST_TYPE_LABELS: Record<keyof RequestsState, string> = {
  featured: 'Featured Applications',
  booking: 'Booking Requests',
  sponsored: 'Sponsored Inquiries',
  partnership: 'Partnership Applications',
  mediaKit: 'Media Kit Requests',
};

export const nextId = nid;
