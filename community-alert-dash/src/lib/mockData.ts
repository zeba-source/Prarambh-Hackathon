import { Report } from "@/types/report";

export const mockReports: Report[] = [
  {
    id: "1",
    image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&q=80",
    aiProcessedImage: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&q=80",
    description: "Large pothole on Main Street causing traffic issues",
    location: { lat: 40.7128, lon: -74.0060 },
    category: "pothole",
    department: "Road Maintenance",
    status: "pending",
    createdAt: new Date("2025-01-15"),
  },
  {
    id: "2",
    image: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=400&q=80",
    aiProcessedImage: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=400&q=80",
    description: "Overflowing garbage bins near Central Park entrance",
    location: { lat: 40.7829, lon: -73.9654 },
    category: "garbage",
    department: "Sanitation",
    status: "in-progress",
    createdAt: new Date("2025-01-14"),
  },
  {
    id: "3",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
    aiProcessedImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
    description: "Street light not working on Oak Avenue",
    location: { lat: 40.7580, lon: -73.9855 },
    category: "streetlight",
    department: "Public Works",
    status: "resolved",
    createdAt: new Date("2025-01-13"),
  },
];

export const getCategoryColor = (category: string): string => {
  switch (category) {
    case "pothole":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "garbage":
      return "bg-green-100 text-green-800 border-green-200";
    case "streetlight":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};
