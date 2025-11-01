/**
 * AI Service for issue detection using Hugging Face Gradio API
 * 
 * This service integrates with the garbage-pothole-detector-app on Hugging Face Spaces
 * to automatically detect civic issues from uploaded images using the Gradio Client.
 * 
 * Based on: utkarsh-23/garbage-pothole-detector-app
 * Documentation: https://github.com/Rishiraj-Pathak-27/Prarambh-Hackathon
 */

import { Client } from "@gradio/client";

interface AIDetectionResult {
  category: 'pothole' | 'garbage' | 'streetlight' | 'other';
  department: string;
  confidence?: number;
  detectedLabels?: string[];
  processedImageUrl?: string; // The AI-processed image with bounding boxes
}

// Department mapping based on detected category
const DEPARTMENT_MAP: Record<string, string> = {
  pothole: "Road Maintenance",
  garbage: "Sanitation",
  streetlight: "Public Works",
  water: "Water Department",
  drainage: "Public Works",
  other: "General Services"
};

// Category keywords for mapping AI labels to our categories
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  pothole: ["pothole", "crack", "road damage", "asphalt", "pavement"],
  garbage: ["garbage", "trash", "litter", "waste", "rubbish", "dump"],
  streetlight: ["streetlight", "lamp", "light pole", "lighting", "street lamp"],
  water: ["water", "leak", "pipe", "flooding"],
  drainage: ["drain", "sewer", "gutter", "manhole"]
};

/**
 * Detects civic issues from an image using Gradio Client
 * 
 * @param imageFile - The image file to analyze
 * @param huggingFaceToken - Optional Hugging Face API token (not required for public spaces)
 * @returns Detection result with category, department, and processed image
 */
export async function detectIssueWithAI(
  imageFile: File,
  huggingFaceToken?: string
): Promise<AIDetectionResult> {
  try {
    console.log("🔍 Starting AI detection with garbage-pothole-detector-app...");
    
    // Connect to the Hugging Face Space
    console.log("🔗 Connecting to Hugging Face Space...");
    const client = await Client.connect("utkarsh-23/garbage-pothole-detector-app");
    console.log("✅ Connected to Gradio app");
    
    // Convert file to blob for Gradio
    const blob = new Blob([imageFile], { type: imageFile.type });
    
    // Call the /detect_image_1 endpoint
    console.log("📤 Sending image to /detect_image_1 endpoint...");
    const result = await client.predict("/detect_image_1", { 
      image: blob 
    });
    
    console.log("✅ Response received from Hugging Face:", result);
    
    // Parse the response according to the API documentation
    // Response format: [detectionImage, classificationText]
    const [detectionImage, classification] = result.data as [
      { url: string; path: string; orig_name: string; },
      string
    ];
    
    // Extract category from classification text
    const category = extractCategoryFromClassification(classification);
    
    return {
      category,
      department: DEPARTMENT_MAP[category],
      confidence: 0.85, // Can be extracted from classification if available
      detectedLabels: [classification],
      processedImageUrl: detectionImage.url
    };
    
  } catch (error) {
    console.error("❌ Error calling Gradio API:", error);
    console.log("⚠️ Falling back to mock detection");
    return mockAIDetection(imageFile);
  }
}

/**
 * Extract category from the classification text returned by the API
 * The API returns markdown text with department classification
 */
function extractCategoryFromClassification(classification: string): 'pothole' | 'garbage' | 'streetlight' | 'other' {
  const lowerText = classification.toLowerCase();
  
  // Check for pothole indicators
  if (lowerText.includes('pothole') || 
      lowerText.includes('road') || 
      lowerText.includes('road maintenance')) {
    return 'pothole';
  }
  
  // Check for garbage indicators
  if (lowerText.includes('garbage') || 
      lowerText.includes('waste') ||
      lowerText.includes('sanitation') ||
      lowerText.includes('trash')) {
    return 'garbage';
  }
  
  // Check for streetlight indicators
  if (lowerText.includes('light') || 
      lowerText.includes('lamp') ||
      lowerText.includes('public works')) {
    return 'streetlight';
  }
  
  // Default to other
  return 'other';
}

/**
 * Mock AI detection for development/testing
 * Simulates AI processing with random results
 */
async function mockAIDetection(imageFile: File): Promise<AIDetectionResult> {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Analyze filename for hints (development only)
  const filename = imageFile.name.toLowerCase();
  let category: 'pothole' | 'garbage' | 'streetlight' | 'other' = 'other';
  
  if (filename.includes('pothole') || filename.includes('road')) {
    category = 'pothole';
  } else if (filename.includes('garbage') || filename.includes('trash')) {
    category = 'garbage';
  } else if (filename.includes('light') || filename.includes('lamp')) {
    category = 'streetlight';
  } else {
    // Random selection for testing
    const categories: Array<'pothole' | 'garbage' | 'streetlight' | 'other'> = 
      ['pothole', 'garbage', 'streetlight', 'other'];
    category = categories[Math.floor(Math.random() * categories.length)];
  }
  
  return {
    category,
    department: DEPARTMENT_MAP[category],
    confidence: 0.75 + Math.random() * 0.2, // Mock confidence between 75-95%
    detectedLabels: [`mock_${category}_label`]
  };
}

export default {
  detectIssueWithAI
};
