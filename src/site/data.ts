import type {
  HeroSlide,
  StoryCard,
  VotingCategory,
  CogvanaCover,
  MasonryImage,
  ServiceItem,
  PartnerCategory,
  FeaturedPartner,
  SponsoredStoryCard,
  Product,
  Testimonial,
} from './types';

export const tickerMessages: string[] = [
  'Woman of the Week: Amara Njeri',
  'Voting Arena Open — Cast Your Vote Now',
  'Sponsored Story: Luxe Salon Nairobi',
  'Featured Couple: The Karubis',
  'P&S Shop: New Editorial Prints Available',
  'Book Your Professional Shoot This Month',
];

export const heroSlides: HeroSlide[] = [
  {
    id: 'woman',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1600&q=80',
    badge: 'Woman of the Week',
    titleLine1: 'Amara Njeri',
    subtitle: 'Redefining Beauty on Her Own Terms',
    excerpt: "From Westlands to magazine covers — Amara's journey is the story of every woman who dared to believe.",
    ctas: [
      { label: 'Read Story', action: { type: 'openStory' } },
      { label: 'Vote Now ✦', action: { type: 'goToPage', page: 2 } },
      { label: 'Book A Shoot', action: { type: 'openModal', modal: 'bookModal' } },
      { label: 'Apply To Feature', action: { type: 'openModal', modal: 'applyModal' } },
    ],
  },
  {
    id: 'couple',
    image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=1600&q=80',
    badge: 'Couple of the Month',
    titleLine1: 'The Karubis',
    subtitle: 'A Love That Photographs Itself',
    excerpt: "Ten years, two cities, one incredible love story. Meet Nairobi's most stylish couple.",
    ctas: [
      { label: 'Read Story', action: { type: 'openStory' } },
      { label: 'Vote Now ✦', action: { type: 'goToPage', page: 2 } },
      { label: 'Book A Shoot', action: { type: 'openModal', modal: 'bookModal' } },
      { label: 'Apply To Feature', action: { type: 'openModal', modal: 'applyModal' } },
    ],
  },
  {
    id: 'artist',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1600&q=80',
    badge: 'Artist Spotlight',
    titleLine1: 'Kofi Asante',
    subtitle: "Painting Africa's Future in Gold",
    excerpt: 'The Accra-born visual artist changing how the continent sees itself — one canvas at a time.',
    ctas: [
      { label: 'Read Story', action: { type: 'openStory' } },
      { label: 'Vote Now ✦', action: { type: 'goToPage', page: 2 } },
      { label: 'Book A Shoot', action: { type: 'openModal', modal: 'bookModal' } },
    ],
  },
  {
    id: 'fashion',
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1600&q=80',
    badge: 'Fashion Feature',
    titleLine1: 'Dressed in',
    titleLine2: 'Identity',
    subtitle: 'The New African Aesthetic',
    excerpt: 'A stunning editorial celebrating African designers reshaping global fashion on their own terms.',
    ctas: [
      { label: 'View Editorial', action: { type: 'openStory' } },
      { label: 'Book A Shoot', action: { type: 'openModal', modal: 'bookModal' } },
      { label: 'Apply', action: { type: 'openModal', modal: 'applyModal' } },
    ],
  },
  {
    id: 'sponsored',
    image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=1600&q=80',
    badge: 'Sponsored Story',
    badgeType: 'sponsored',
    titleLine1: 'Luxe Salon',
    titleLine2: 'Nairobi',
    subtitle: 'Where Beauty Becomes Art',
    excerpt: "Inside the salon redefining Nairobi's luxury beauty landscape.",
    ctas: [
      { label: 'Read Story', action: { type: 'openStory' } },
      { label: 'Book Sponsored Story', action: { type: 'openModal', modal: 'sponsoredModal' } },
    ],
  },
];

export const stories: StoryCard[] = [
  {
    id: 'amara',
    size: 'large',
    image: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=900&q=80',
    category: 'Woman of the Week',
    title: 'Amara Njeri: The Face That Stopped Nairobi',
    excerpt: "She walked in with nothing but confidence. Now she's on everyone's radar.",
    cta: 'Read Story',
  },
  {
    id: 'david',
    size: 'medium',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=700&q=80',
    category: 'Man of the Week',
    title: 'David Osei: Style Is a Language',
    cta: 'Read Story',
  },
  {
    id: 'temi',
    size: 'medium',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=700&q=80',
    category: 'Artist of the Week',
    title: 'Temi Ade: Art as Resistance',
    cta: 'Read Story',
  },
  {
    id: 'karubis',
    size: 'small',
    image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600&q=80',
    category: 'Couple of the Week',
    title: 'The Karubis: Still in Love',
    cta: 'Read Story',
  },
  {
    id: 'zara',
    size: 'small',
    image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&q=80',
    category: 'Entrepreneur of the Week',
    title: 'Zara Mensah Built an Empire at 28',
    cta: 'Read Story',
  },
  {
    id: 'ankara',
    size: 'small',
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=80',
    category: 'Fashion Feature',
    title: 'The Ankara Revolution Goes Global',
    cta: 'View Editorial',
  },
];

export const votingCategories: VotingCategory[] = [
  {
    id: 'lady',
    key: 'lady',
    label: '👑 Lady',
    emoji: '👑',
    panelTitle: 'Lady of the Week',
    initialVotes: 2847,
    initialBarWidth: 65,
    contestants: [
      {
        id: 'amara',
        name: 'Amara Njeri',
        tagline: '"Redefining beauty on her own terms"',
        image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80',
        reward: '🏆 Magazine Feature',
      },
      {
        id: 'zara',
        name: 'Zara Mensah',
        tagline: '"Entrepreneur. Visionary. Unstoppable."',
        image: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&q=80',
        reward: '📷 Pro Photoshoot',
      },
      {
        id: 'temi',
        name: 'Temi Ade',
        tagline: '"Art, grace, and fire in equal measure."',
        image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80',
        reward: '💄 Beauty Package',
      },
      {
        id: 'nia',
        name: 'Nia Kamau',
        tagline: '"The camera finds her before she finds it."',
        image: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600&q=80',
        reward: '⭐ Sponsored Feature',
      },
    ],
  },
  {
    id: 'man',
    key: 'man',
    label: '🕶 Man',
    emoji: '🕶',
    panelTitle: 'Man of the Week',
    initialVotes: 1924,
    initialBarWidth: 45,
    contestants: [
      {
        id: 'david',
        name: 'David Osei',
        tagline: '"Style is a language he speaks fluently."',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
        reward: '📖 Magazine Feature',
      },
      {
        id: 'marcus',
        name: 'Marcus Boateng',
        tagline: '"The architect of his own aesthetic."',
        image: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=600&q=80',
        reward: '📷 Pro Photoshoot',
      },
      {
        id: 'kofi',
        name: 'Kofi Asante',
        tagline: '"Painting Africa\'s future in gold."',
        image: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&q=80',
        reward: '🎁 Partner Voucher',
      },
    ],
  },
  {
    id: 'couple',
    key: 'couple',
    label: '💑 Couple',
    emoji: '💑',
    panelTitle: 'Couple of the Week',
    initialVotes: 3112,
    initialBarWidth: 78,
    contestants: [
      {
        id: 'karubis',
        name: 'The Karubis',
        tagline: '"Ten years and still going strong."',
        image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600&q=80',
        reward: '💑 Couple Shoot',
      },
      {
        id: 'mwangis',
        name: 'The Mwangis',
        tagline: '"Love that found its way across oceans."',
        image: 'https://images.unsplash.com/photo-1521566652839-697aa473761a?w=600&q=80',
        reward: '📖 Feature Story',
      },
      {
        id: 'adeyemis',
        name: 'The Adeyemis',
        tagline: '"Art, culture, and love — perfectly framed."',
        image: 'https://images.unsplash.com/photo-1529636798458-92182e662485?w=600&q=80',
        reward: '🎁 Partner Voucher',
      },
    ],
  },
  {
    id: 'photo',
    key: 'photo',
    label: '📸 Photo',
    emoji: '📸',
    panelTitle: 'Photo of the Week',
    initialVotes: 1456,
    initialBarWidth: 52,
    contestants: [
      {
        id: 'between-worlds',
        name: 'Between Worlds',
        tagline: 'by Cogvana Visuals',
        image: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=600&q=80',
        reward: '🎨 Art Print',
      },
      {
        id: 'strength-softness',
        name: 'Strength & Softness',
        tagline: 'by Lena K.',
        image: 'https://images.unsplash.com/photo-1492288991661-058aa541ff43?w=600&q=80',
        reward: '📖 Feature',
      },
      {
        id: 'golden-identity',
        name: 'Golden Identity',
        tagline: 'by P. Adesanya',
        image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80',
        reward: '🏆 Exhibition Slot',
      },
    ],
  },
  {
    id: 'fashion',
    key: 'fashion',
    label: '👗 Fashion',
    emoji: '👗',
    panelTitle: 'Fashion Feature',
    initialVotes: 987,
    initialBarWidth: 38,
    contestants: [
      {
        id: 'silk-edit',
        name: 'The Silk Edit',
        tagline: 'Fluid lines, quiet power.',
        image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80',
        reward: '👗 Style Feature',
      },
      {
        id: 'ankara-royale',
        name: 'Ankara Royale',
        tagline: 'Culture worn as confidence.',
        image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=80',
        reward: '📷 Shoot',
      },
      {
        id: 'modern-kente',
        name: 'Modern Kente',
        tagline: 'Heritage meets the future.',
        image: 'https://images.unsplash.com/photo-1551232864-3f0890e580d9?w=600&q=80',
        reward: '⭐ Sponsored',
      },
    ],
  },
];

export const rewardsStrip = [
  { emoji: '📖', label: 'Magazine Feature' },
  { emoji: '📷', label: 'Pro Photoshoot' },
  { emoji: '🎁', label: 'Partner Voucher' },
  { emoji: '⭐', label: 'Sponsored Feature' },
  { emoji: '💄', label: 'Beauty Package' },
];

export const cogvanaCovers: CogvanaCover[] = [
  { id: 'c1', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80', eyebrow: 'Cover Story', title: 'The Golden Hour Series' },
  { id: 'c2', image: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=500&q=80', eyebrow: 'Featured Shoot', title: 'Identity & Grace' },
  { id: 'c3', image: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=500&q=80', eyebrow: 'Editorial', title: 'Nairobi After Dark' },
  { id: 'c4', image: 'https://images.unsplash.com/photo-1492288991661-058aa541ff43?w=500&q=80', eyebrow: 'Portrait Series', title: 'Strength & Softness' },
  { id: 'c5', image: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=500&q=80', eyebrow: 'Artist Collab', title: 'Between Light and Shadow' },
  { id: 'c6', image: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=500&q=80', eyebrow: 'Cover Story', title: 'Luminous: Vol. II' },
];

export const masonryImages: MasonryImage[] = [
  { id: 'm1', thumb: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=70', full: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80' },
  { id: 'm2', thumb: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=300&q=70', full: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800&q=80' },
  { id: 'm3', thumb: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=300&q=70', full: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=800&q=80' },
  { id: 'm4', thumb: 'https://images.unsplash.com/photo-1492288991661-058aa541ff43?w=300&q=70', full: 'https://images.unsplash.com/photo-1492288991661-058aa541ff43?w=800&q=80' },
  { id: 'm5', thumb: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=300&q=70', full: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=800&q=80' },
  { id: 'm6', thumb: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300&q=70', full: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80' },
];

export const services: ServiceItem[] = [
  { id: 'photography', image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=80', eyebrow: 'Photography', title: 'Editorial & Portrait' },
  { id: 'beauty', image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80', eyebrow: 'Beauty', title: 'Makeup Artistry' },
  { id: 'styling', image: 'https://images.unsplash.com/photo-1551232864-3f0890e580d9?w=400&q=80', eyebrow: 'Styling', title: 'Fashion Styling' },
  { id: 'hair', image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&q=80', eyebrow: 'Hair', title: 'Hair Dressing' },
  { id: 'grooming', image: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&q=80', eyebrow: 'Grooming', title: 'Barber Services' },
  { id: 'nails', image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=400&q=80', eyebrow: 'Nails', title: 'Manicure & Pedicure' },
  { id: 'branding', image: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=400&q=80', eyebrow: 'Branding', title: 'Brand Identity' },
  { id: 'events', image: 'https://images.unsplash.com/photo-1529636798458-92182e662485?w=400&q=80', eyebrow: 'Events', title: 'Event Coverage' },
];

export const testimonials: Testimonial[] = [
  {
    id: 't1',
    quote: "P&S didn't just photograph me. They saw something in me I hadn't seen in myself.",
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&q=70',
    name: 'Amara Njeri',
    role: 'Model & Entrepreneur',
  },
  {
    id: 't2',
    quote: 'Being featured as Couple of the Month brought our love story to thousands of people.',
    image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=80&q=70',
    name: 'Lena & James Karubi',
    role: 'Couple of the Month',
  },
  {
    id: 't3',
    quote: "The sponsored story P&S produced brought more clients in one week than any ad I'd paid for.",
    image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&q=70',
    name: 'Chidi Okonkwo',
    role: 'Luxe Hair Studio',
  },
];

export const partnerCategories: PartnerCategory[] = [
  { id: 'salons', emoji: '💇', label: 'Salons' },
  { id: 'barbers', emoji: '✂️', label: 'Barbers' },
  { id: 'designers', emoji: '👗', label: 'Designers' },
  { id: 'muas', emoji: '💄', label: 'MUAs' },
  { id: 'hotels', emoji: '🏨', label: 'Hotels' },
  { id: 'weddings', emoji: '💒', label: 'Weddings' },
  { id: 'gyms', emoji: '🏋️', label: 'Gyms' },
  { id: 'beauty', emoji: '🧴', label: 'Beauty' },
  { id: 'tailors', emoji: '👔', label: 'Tailors' },
  { id: 'print', emoji: '🖨️', label: 'Print' },
];

export const featuredPartners: FeaturedPartner[] = [
  { id: 'luxe', image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80', badge: 'Salon Partner', name: 'Luxe Hair Studio' },
  { id: 'adisa', image: 'https://images.unsplash.com/photo-1551232864-3f0890e580d9?w=600&q=80', badge: 'Fashion Designer', name: 'Adisa Couture' },
  { id: 'glow', image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=600&q=80', badge: 'Beauty Brand', name: 'Glow By Nia' },
];

export const sponsoredStoryCards: SponsoredStoryCard[] = [
  { id: 's1', image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80', title: "How Luxe Salon Became Nairobi's Beauty Destination" },
  { id: 's2', image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=80', title: 'The Designer Redefining African Fashion from Nairobi' },
  { id: 's3', image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=600&q=80', title: "Inside Kenya's Fastest Growing Makeup Brand" },
];

export const products: Product[] = [
  { id: 'tee', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80', category: 'Apparel', name: 'P&S Classic Tee', price: 2500 },
  { id: 'hoodie', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80', category: 'Apparel', name: 'Premium Hoodie', price: 4500 },
  { id: 'print', image: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=400&q=80', category: 'Art', name: 'Photography Print', price: 3500 },
  { id: 'canvas', image: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=400&q=80', category: 'Art', name: 'Wall Art Canvas', price: 6500 },
  { id: 'cap', image: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=400&q=80', category: 'Accessories', name: 'Signature Cap', price: 1800 },
  { id: 'mug', image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=400&q=80', category: 'Lifestyle', name: 'Coffee Mug', price: 1200 },
  { id: 'magazine', image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&q=80', category: 'Digital', name: 'Magazine Edition Vol. 7', price: 800, wide: true, digital: true },
];
