export const previewStories = [
  { id: "s1", name: "Your story" },
  { id: "s2", name: "Maya" },
  { id: "s3", name: "Jordan" },
  { id: "s4", name: "Sam" },
  { id: "s5", name: "Alex" },
  { id: "s6", name: "Taylor" },
];

export const previewPosts = [
  {
    id: "p1",
    author: "maya.chen",
    location: "Big Sur, California",
    image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=900&auto=format&fit=crop&q=80",
    likes: 128,
    comments: 12,
    caption: "A little fresh air goes a long way 🌿",
  },
  {
    id: "p2",
    author: "jordanlee",
    location: "Brooklyn, New York",
    image: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=900&auto=format&fit=crop&q=80",
    likes: 86,
    comments: 7,
    caption: "Chasing the last light of the day.",
  },
];

export const previewChats = [
  { id: "c1", name: "Maya Chen", lastMessage: "That sounds like a plan!", time: "2m", unread: 2 },
  { id: "c2", name: "Weekend crew", lastMessage: "Jordan: sent a photo", time: "18m", unread: 4 },
  { id: "c3", name: "Sam Rivera", lastMessage: "Thanks for sharing ✨", time: "1h", unread: 0 },
  { id: "c4", name: "Alex Morgan", lastMessage: "Are we still on for tomorrow?", time: "3h", unread: 0 },
];

export const previewMessages: Record<string, string[]> = {
  c1: ["Hey! How was your weekend?", "Really good, we found a great trail.", "That sounds like a plan!"],
  c2: ["Saturday at 10?", "Works for me 🙌"],
  c3: ["Just sent over the photos.", "Thanks for sharing ✨"],
  c4: ["Are we still on for tomorrow?"],
};
