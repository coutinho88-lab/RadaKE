export const previewPosts = [
  {
    id: "p1",
    author: "maya.chen",
    location: "Big Sur, California",
    image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=900&auto=format&fit=crop&q=80",
    likes: 128,
    comments: 12,
    reposts: 8,
    caption: "A little fresh air goes a long way 🌿",
  },
  {
    id: "p2",
    author: "jordanlee",
    location: "Brooklyn, New York",
    image: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=900&auto=format&fit=crop&q=80",
    likes: 86,
    comments: 7,
    reposts: 3,
    caption: "Chasing the last light of the day.",
  },
];

type PreviewChat = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  savedContact: boolean;
  radaPost?: { image: string; caption: string; time: string };
};

export const previewChats: PreviewChat[] = [
  {
    id: "c1",
    name: "Maya Chen",
    lastMessage: "That sounds like a plan!",
    time: "2m",
    unread: 2,
    savedContact: true,
    radaPost: {
      image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=900&auto=format&fit=crop&q=80",
      caption: "A quiet morning by the lake.",
      time: "12 min ago",
    },
  },
  {
    id: "c2",
    name: "Weekend crew",
    lastMessage: "Jordan: sent a photo",
    time: "18m",
    unread: 4,
    savedContact: true,
    radaPost: {
      image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=80",
      caption: "The whole crew made it out!",
      time: "1 hr ago",
    },
  },
  {
    id: "c3",
    name: "Sam Rivera",
    lastMessage: "Thanks for sharing ✨",
    time: "1h",
    unread: 0,
    savedContact: true,
  },
  {
    id: "c4",
    name: "Alex Morgan",
    lastMessage: "Are we still on for tomorrow?",
    time: "3h",
    unread: 0,
    savedContact: false,
    radaPost: {
      image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=80",
      caption: "A day out.",
      time: "30 min ago",
    },
  },
];

export const previewComments: Record<string, string[]> = {
  p1: ["This view is unreal!", "Adding this trail to my list 🌿"],
  p2: ["That sky! 🌙"],
};

export const previewDiscoverItems = [
  {
    id: "d1",
    category: "TRENDING",
    title: "#WeekendOutdoors",
    description: "People are sharing their favorite local trails and views.",
    source: "Trending on Rada",
  },
  {
    id: "d2",
    category: "NEWS",
    title: "Community gardens open for the season",
    description: "Find a neighborhood garden and meet the volunteers growing it.",
    source: "Community bulletin",
  },
  {
    id: "d3",
    category: "TRENDING",
    title: "#CityAfterDark",
    description: "Night walks, late cafés, and the city after sunset.",
    source: "Trending on Rada",
  },
  {
    id: "d4",
    category: "NEWS",
    title: "Local makers market this Saturday",
    description: "A weekend guide to independent artists and small businesses.",
    source: "Community bulletin",
  },
];

export const previewMessages: Record<string, string[]> = {
  c1: ["Hey! How was your weekend?", "Really good, we found a great trail.", "That sounds like a plan!"],
  c2: ["Saturday at 10?", "Works for me 🙌"],
  c3: ["Just sent over the photos.", "Thanks for sharing ✨"],
  c4: ["Are we still on for tomorrow?"],
};
