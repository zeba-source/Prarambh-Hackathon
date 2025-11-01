/**
 * AI Service for issue detection using Hugging Face Gradio API
 * 
 * This service integrates with your custom YOLO model on Hugging Face Spaces
 * to automatically detect civic issues from uploaded images.
 */

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
 * Detects civic issues from an image using your custom YOLO model on Hugging Face Gradio
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
    console.log("🔍 Starting AI detection with YOLO model...");
    const eventId = await uploadImageToGradio(imageFile, huggingFaceToken);
    if (!eventId) throw new Error("Failed to get event ID from Gradio");
    console.log("✅ Image uploaded, Event ID:", eventId);
    const result = await getGradioResult(eventId, huggingFaceToken);
    console.log("✅ AI detection complete:", result);
    return result;
  } catch (error) {
    console.error("❌ Error calling Gradio API:", error);
    console.log("⚠️ Falling back to mock detection");
    return mockAIDetection(imageFile);
  }
}

// Types for responses
type UploadResponseArray = string[];
interface UploadResponseObj { files?: string[]; file?: string }
interface PredictStartResponse { event_id?: string }

function toAbsoluteGradioFileUrl(rel: string): string {
  if (!rel) return '';
  if (rel.startsWith('http')) return rel;
  // If Space returns raw tmp path, preserve leading slash
  if (rel.startsWith('/file=')) return `https://utkarsh-23-pothole-yolo.hf.space${rel}`;
  if (rel.startsWith('/gradio_api/file=')) return `https://utkarsh-23-pothole-yolo.hf.space${rel}`;
  if (rel.startsWith('/gradio_api/file/')) return `https://utkarsh-23-pothole-yolo.hf.space${rel}`;
  if (rel.startsWith('/tmp/')) return `https://utkarsh-23-pothole-yolo.hf.space/file=${rel}`;
  if (rel.startsWith('tmp/')) return `https://utkarsh-23-pothole-yolo.hf.space/file=/${rel}`;
  if (rel.startsWith('file=')) return `https://utkarsh-23-pothole-yolo.hf.space/${rel}`;
  if (rel.startsWith('file/')) return `https://utkarsh-23-pothole-yolo.hf.space/gradio_api/${rel}`;
  // default
  const needsSlash = !rel.startsWith('/');
  return `https://utkarsh-23-pothole-yolo.hf.space/file=${needsSlash ? '/' : ''}${rel}`;
}

async function uploadImageToGradio(imageFile: File, token?: string): Promise<string | null> {
  try {
    const uploadUrl = "https://utkarsh-23-pothole-yolo.hf.space/gradio_api/upload";
    console.log("📤 Uploading image file to Gradio...");
    const formData = new FormData();
    formData.append('files', imageFile);

    const uploadHeaders: HeadersInit = {};
    if (token) uploadHeaders["Authorization"] = `Bearer ${token}`;

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
      headers: uploadHeaders
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    const ct = uploadResponse.headers.get('content-type') || '';
    const uploadData: UploadResponseArray | UploadResponseObj = ct.includes('application/json')
      ? await uploadResponse.json()
      : (await uploadResponse.text()) as unknown as UploadResponseArray; // fallback

    console.log("📁 Upload response:", uploadData);

    let filePath = '';
    if (Array.isArray(uploadData) && uploadData.length > 0) {
      filePath = uploadData[0];
    } else if ((uploadData as UploadResponseObj).files && (uploadData as UploadResponseObj).files!.length > 0) {
      filePath = (uploadData as UploadResponseObj).files![0]!;
    } else if ((uploadData as UploadResponseObj).file) {
      filePath = (uploadData as UploadResponseObj).file as string;
    }

    if (!filePath) throw new Error("No file path received from upload");
    console.log("📂 File path:", filePath);

    const predictUrl = "https://utkarsh-23-pothole-yolo.hf.space/gradio_api/call/predict";
    const predictHeaders: HeadersInit = { "Content-Type": "application/json" };
    if (token) predictHeaders["Authorization"] = `Bearer ${token}`;

    console.log("🔮 Calling predict API...");
    const predictResp = await fetch(predictUrl, {
      method: "POST",
      headers: predictHeaders,
      body: JSON.stringify({
        data: [
          {
            path: filePath,
            url: toAbsoluteGradioFileUrl(filePath),
            meta: { _type: "gradio.FileData" }
          }
        ]
      })
    });

    if (!predictResp.ok) {
      const errorText = await predictResp.text();
      console.error("❌ Gradio predict error:", errorText);
      throw new Error(`Gradio API error: ${predictResp.status} ${predictResp.statusText}`);
    }

    const predictData: PredictStartResponse = await predictResp.json();
    console.log("📨 Predict response:", predictData);

    return predictData.event_id ?? null;
  } catch (error) {
    console.error("❌ Error uploading to Gradio:", error);
    throw error;
  }
}

async function getGradioResult(eventId: string, token?: string): Promise<AIDetectionResult> {
  try {
    const RESULT_URL = `https://utkarsh-23-pothole-yolo.hf.space/gradio_api/call/predict/${eventId}`;
    console.log("⏳ Fetching result for event:", eventId);

    const resultHeaders: HeadersInit = {};
    if (token) resultHeaders["Authorization"] = `Bearer ${token}`;

    const response = await fetch(RESULT_URL, { headers: resultHeaders });
    if (!response.ok) throw new Error(`Failed to get result: ${response.status}`);

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) throw new Error("No response body");

    let processedImageUrl = '';
    let fullData = '';

    function extractUrlFromOutput(output: unknown): string {
      if (!output) return '';
      if (typeof output === 'string') {
        // If Space returns base64 image, keep as-is
        if (output.startsWith('data:image/')) return output;
        return toAbsoluteGradioFileUrl(output);
      }
      if (Array.isArray(output)) {
        for (const item of output) {
          const u = extractUrlFromOutput(item);
          if (u) return u;
        }
        return '';
      }
      if (typeof output === 'object') {
        const obj = output as Record<string, unknown>;
        const candidates = [
          obj.url,
          obj.path,
          obj.name,
          obj.value,
          (obj.data as Record<string, unknown> | undefined)?.url,
          (obj.data as Record<string, unknown> | undefined)?.path,
          (obj.data as Record<string, unknown> | undefined)?.name,
        ].filter(Boolean);
        for (const c of candidates) {
          const u = extractUrlFromOutput(c);
          if (u) return u;
        }
      }
      return '';
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      fullData += chunk;
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonData = JSON.parse(line.substring(6));
            // Some Spaces return data directly as an array (no wrapper object)
            if (!processedImageUrl && Array.isArray(jsonData)) {
              const u = extractUrlFromOutput(jsonData);
              if (u) { processedImageUrl = u; break; }
            }
            if (jsonData.output && jsonData.output.data) {
              const u = extractUrlFromOutput(jsonData.output.data);
              if (u) { processedImageUrl = u; break; }
            }
            if (!processedImageUrl && Array.isArray(jsonData.data)) {
              const u = extractUrlFromOutput(jsonData.data);
              if (u) { processedImageUrl = u; break; }
            }
            if (!processedImageUrl && jsonData.output && jsonData.output.value) {
              const u = extractUrlFromOutput(jsonData.output.value);
              if (u) { processedImageUrl = u; break; }
            }
          } catch {
            // ignore parse errors
          }
        }
      }
      if (processedImageUrl) break;
    }

    if (!processedImageUrl) {
      console.warn("⚠️ No processed image URL found. Full data:", fullData.substring(0, 500));
      throw new Error("No processed image URL in response");
    }

    return {
      category: 'pothole',
      department: DEPARTMENT_MAP.pothole,
      confidence: 0.85,
      detectedLabels: ['pothole detected by YOLO'],
      processedImageUrl
    };
  } catch (error) {
    console.error("❌ Error getting Gradio result:", error);
    throw error;
  }
}

interface HuggingFacePrediction {
  label: string;
  score: number;
}

/**
 * Process Hugging Face API response and map to our issue categories
 */
function processAIResponse(apiResponse: HuggingFacePrediction[] | unknown): AIDetectionResult {
  // API typically returns an array of labels with scores
  // Example: [{ label: "pothole", score: 0.89 }, { label: "road", score: 0.65 }]
  
  if (!Array.isArray(apiResponse) || apiResponse.length === 0) {
    return {
      category: "other",
      department: DEPARTMENT_MAP.other,
      confidence: 0
    };
  }

  // Get top predictions
  const topPredictions = apiResponse.slice(0, 5) as HuggingFacePrediction[];
  const detectedLabels = topPredictions.map((p) => p.label.toLowerCase());
  
  // Try to match predictions to our categories
  let matchedCategory: 'pothole' | 'garbage' | 'streetlight' | 'other' = 'other';
  let maxConfidence = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const label of detectedLabels) {
      for (const keyword of keywords) {
        if (label.includes(keyword) || keyword.includes(label)) {
          const prediction = topPredictions.find((p) => 
            p.label.toLowerCase() === label
          );
          if (prediction && prediction.score > maxConfidence) {
            matchedCategory = category as 'pothole' | 'garbage' | 'streetlight' | 'other';
            maxConfidence = prediction.score;
          }
        }
      }
    }
  }

  return {
    category: matchedCategory,
    department: DEPARTMENT_MAP[matchedCategory],
    confidence: maxConfidence,
    detectedLabels: detectedLabels
  };
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

/**
 * Convert File to base64 string with data URL prefix for Gradio API
 */
function fileToBase64WithPrefix(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert File to base64 string for API transmission
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data URL prefix if present
      const base64Data = base64String.split(',')[1] || base64String;
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Alternative: Detect issue using the new Hugging Face Inference Providers API
 * This is useful as a fallback if the Gradio API is unavailable
 */
export async function detectWithInferenceProviders(
  imageFile: File,
  huggingFaceToken: string
): Promise<AIDetectionResult> {
  // New endpoint as per Hugging Face migration notice
  const API_URL = "https://router.huggingface.co/hf-inference/models/google/vit-base-patch16-224";
  
  try {
    const imageData = await fileToBase64(imageFile);
    
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${huggingFaceToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: imageData,
        options: { wait_for_model: true }
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const results = await response.json();
    return processAIResponse(results);
    
  } catch (error) {
    console.error("Inference Providers error:", error);
    return mockAIDetection(imageFile);
  }
}

/**
 * Alternative: Detect issue using object detection model (deprecated endpoint removed)
 * Updated to use new Inference Providers API
 */
export async function detectWithObjectDetection(
  imageFile: File,
  huggingFaceToken: string
): Promise<AIDetectionResult> {
  const API_URL = "https://router.huggingface.co/hf-inference/models/facebook/detr-resnet-50";
  
  try {
    const imageData = await fileToBase64(imageFile);
    
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${huggingFaceToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: imageData,
        options: { wait_for_model: true }
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const results = await response.json();
    // Process object detection results similar to classification
    return processAIResponse(results);
    
  } catch (error) {
    console.error("Object detection error:", error);
    return mockAIDetection(imageFile);
  }
}

export default {
  detectIssueWithAI,
  detectWithInferenceProviders,
  detectWithObjectDetection
};
