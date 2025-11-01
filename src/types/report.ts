export type IssueStatus = "pending" | "in-progress" | "resolved";

export type IssueCategory = "pothole" | "garbage" | "streetlight" | "other";

export interface Report {
  id: string;
  image: string;
  aiProcessedImage?: string;
  description: string;
  location: {
    lat: number;
    lon: number;
  };
  category: IssueCategory;
  department: string;
  status: IssueStatus;
  createdAt: Date;
}
