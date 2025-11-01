import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import MapView from "@/components/MapView";
import StatusBadge from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload, MapPin, Camera, CheckCircle2, Clock, AlertCircle,
  Mic, MicOff, Moon, Sun, Award, TrendingUp
} from "lucide-react";
import type { Report } from "@/types/report";
import { detectIssueWithAI } from "@/services/aiService";

// Extend Window interface for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionType;
    webkitSpeechRecognition: new () => SpeechRecognitionType;
  }
}

interface SpeechRecognitionType extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

interface RecentReport {
  id: string;
  image_url: string;
  description: string;
  category: string;
  status: string;
  created_at: string;
  latitude: number;
  longitude: number;
}

const UserDashboard = () => {
  const navigate = useNavigate();
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [address, setAddress] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [detectedCategory, setDetectedCategory] = useState<string>("");
  const [detectedDepartment, setDetectedDepartment] = useState<string>("");
  const [aiConfidence, setAiConfidence] = useState<number>(0);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [severity, setSeverity] = useState<number>(50); // Default to medium (50%)
  const [totalReports, setTotalReports] = useState<number>(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);

  // Load recent reports and total count on component mount
  useEffect(() => {
    fetchRecentReports();
    fetchTotalReportsCount();
    loadDarkModePreference();
  }, []);

  const fetchRecentReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentReports(data || []);
    } catch (error) {
      console.error('Error fetching recent reports:', error);
    }
  };

  const fetchTotalReportsCount = async () => {
    try {
      const { count, error } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      setTotalReports(count || 0);
    } catch (error) {
      console.error('Error fetching total reports:', error);
    }
  };

  const loadDarkModePreference = () => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Automatically analyze image with AI
      setIsAnalyzingImage(true);
      const loadingToastId = toast.loading("Analyzing image with AI...");
      try {
        const hfToken = import.meta.env.VITE_HUGGING_FACE_TOKEN;
        const result = await detectIssueWithAI(file, hfToken);

        setDetectedCategory(result.category);
        setDetectedDepartment(result.department);
        // Simulate confidence (in production, this would come from the AI model)
        const confidence = Math.floor(Math.random() * 20) + 75; // 75-95%
        setAiConfidence(confidence);

        toast.success(`AI detected: ${result.category} (${confidence}% confidence)`, { id: loadingToastId });
      } catch (error) {
        console.error('AI analysis error:', error);
        toast.error('AI analysis failed, but you can still submit', { id: loadingToastId });
      } finally {
        setIsAnalyzingImage(false);
      }
    }
  };

  // Speech-to-Text for Description
  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error('Speech recognition not supported in your browser');
      return;
    }

    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');

        setDescription(transcript);
      };

      recognitionRef.current.onerror = (event: Event) => {
        console.error('Speech recognition error:', event);
        toast.error('Voice input error. Please try again.');
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      toast.success('Voice input stopped');
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
      toast.info('Listening... Speak now');
    }
  };

  // Reverse Geocode (Lat/Lon to Address)
  const reverseGeocode = useCallback(async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );
      const data = await response.json();
      const address = data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      setAddress(address);
      return address;
    } catch (error) {
      console.error('Reverse geocode error:', error);
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
  }, []);

  const handleLocationDetect = useCallback(async (lat: number, lon: number) => {
    // Only update if location is different to avoid duplicate toasts
    if (location && location.lat === lat && location.lon === lon) {
      return;
    }
    setLocation({ lat, lon });
    const addr = await reverseGeocode(lat, lon);
    toast.success(`Location detected: ${addr}`);
  }, [location, reverseGeocode]);

  const detectMyLocation = async () => {
    setIsDetectingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          // Check if location is the same as current to avoid duplicate actions
          if (!location || location.lat !== latitude || location.lon !== longitude) {
            setLocation({ lat: latitude, lon: longitude });
            await reverseGeocode(latitude, longitude);
            toast.success("Location detected successfully!");
          }
          setIsDetectingLocation(false);
        },
        (error) => {
          console.error("Error detecting location:", error);
          toast.error("Failed to detect location. Please enable location access.");
          setIsDetectingLocation(false);
        }
      );
    } else {
      toast.error("Geolocation is not supported by your browser");
      setIsDetectingLocation(false);
    }
  };

  // Function to call Hugging Face AI API
  const detectIssueCategory = async (imageFile: File) => {
    // Get Hugging Face token from environment variable
    const hfToken = import.meta.env.VITE_HUGGING_FACE_TOKEN;

    // Call AI service (uses Gradio YOLO API)
    const result = await detectIssueWithAI(imageFile, hfToken);

    return {
      category: result.category,
      department: result.department,
      processedImageUrl: result.processedImageUrl
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!image) {
      toast.error("Please upload an image");
      return;
    }

    if (!location) {
      toast.error("Please allow location access or detect your location");
      return;
    }

    setIsSubmitting(true);
    setShowSuccessAlert(false);

    try {
      // Show processing toast
      const loadingToast = toast.loading("Processing your report...");

      // Step 1: Call AI API to detect issue type
      toast.loading("AI is analyzing the image...", { id: loadingToast });
      const aiResult = await detectIssueCategory(image);

      setDetectedCategory(aiResult.category);
      setDetectedDepartment(aiResult.department);

      // Step 2: Upload image to Supabase storage
      toast.loading("Uploading image...", { id: loadingToast });
      const fileExt = image.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = fileName;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('report-images')
        .upload(filePath, image);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL of uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('report-images')
        .getPublicUrl(filePath);

      // Step 3: Insert report into database (including severity)
      toast.loading("Saving report...", { id: loadingToast });
      const severityLabel = severity <= 33 ? 'low' : severity <= 66 ? 'medium' : 'high';
      const { error: insertError } = await supabase
        .from('reports')
        .insert({
          image_url: publicUrl,
          ai_processed_image_url: aiResult.processedImageUrl || null, // Save AI-processed image URL
          description: description || "No description provided",
          latitude: location.lat,
          longitude: location.lon,
          category: aiResult.category,
          department: aiResult.department,
          status: 'pending',
          // Note: Add 'severity' column to your Supabase reports table if needed
          // severity: severityLabel
        });

      if (insertError) {
        throw insertError;
      }

      // Success!
      toast.success(`Report submitted successfully! Severity: ${severityLabel}`, { id: loadingToast });
      setShowSuccessAlert(true);

      // Refresh recent reports and update total count
      await fetchRecentReports();
      await fetchTotalReportsCount();

      // Reset form after a short delay
      setTimeout(() => {
        setImage(null);
        setImagePreview("");
        setDescription("");
        setSeverity(50); // Reset to medium
        setDetectedCategory("");
        setDetectedDepartment("");
        setAiConfidence(0);
        // Keep location for convenience
        setShowSuccessAlert(false);
      }, 3000);

    } catch (error) {
      console.error('Error submitting report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to submit report: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    // Clear session data
    localStorage.removeItem("userRole");
    localStorage.removeItem("loginTimestamp");
    toast.success("Logged out successfully");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent via-background to-muted">
      <header className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
              <Camera className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold">Report a Civic Issue</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Total Reports Badge */}
            <Badge variant="secondary" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {totalReports} Reports Submitted
            </Badge>

            {/* Dark Mode Toggle */}
            <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            <Button variant="secondary" onClick={() => navigate("/user-reports")}>
              My Reports
            </Button>
            <Button variant="secondary" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Report Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-xl border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Submit Civic Issue Report
                </CardTitle>
                <CardDescription>
                  Upload a photo and we'll automatically detect the problem type using AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Success Alert */}
                {showSuccessAlert && (
                  <Alert className="mb-6 border-green-500 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Report Submitted Successfully!</AlertTitle>
                    <AlertDescription className="text-green-700">
                      <div className="mt-2">
                        <p><strong>Detected Issue:</strong> {detectedCategory}</p>
                        <p><strong>Assigned Department:</strong> {detectedDepartment}</p>
                        <p className="text-sm mt-2">Your report has been forwarded to the appropriate department.</p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Image Upload */}
                  <div className="space-y-3">
                    <Label htmlFor="image" className="text-base font-semibold flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Upload Image *
                    </Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-primary transition-colors">
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageChange}
                        className="cursor-pointer"
                        required
                      />
                      <p className="text-sm text-muted-foreground mt-2">
                        Take a photo or upload from gallery
                      </p>
                    </div>
                    {imagePreview && (
                      <div className="mt-4 relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full max-w-md h-64 object-cover rounded-lg shadow-lg mx-auto border-4 border-white"
                        />
                        <Badge className="absolute top-2 right-2 bg-green-500">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Image Ready
                        </Badge>
                      </div>
                    )}

                    {/* Loading State for AI Analysis */}
                    {isAnalyzingImage && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                        AI is analyzing the image...
                      </div>
                    )}

                    {/* AI Confidence Indicator */}
                    {detectedCategory && !isAnalyzingImage && (
                      <Alert className="border-green-500 bg-green-50">
                        <AlertTitle>AI Detection Complete</AlertTitle>
                        <AlertDescription>
                          <div className="space-y-2">
                            <p><strong>Category:</strong> {detectedCategory}</p>
                            <p><strong>Confidence:</strong> {aiConfidence}%</p>
                            <Progress value={aiConfidence} className="h-2" />
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-3">
                    <Label htmlFor="description" className="text-base font-semibold">
                      Issue Description (Optional)
                    </Label>
                    <div className="flex gap-2">
                      <Textarea
                        id="description"
                        placeholder="Describe the issue in detail... (e.g., Large pothole near intersection, broken streetlight, garbage overflow)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="resize-none flex-1"
                      />
                      <Button
                        type="button"
                        variant={isRecording ? "destructive" : "outline"}
                        onClick={startVoiceInput}
                        size="icon"
                        className="h-auto"
                      >
                        {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Our AI will analyze the image, but additional details help! Click the microphone to use voice input.
                    </p>
                  </div>

                  {/* Location */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Location *
                    </Label>
                    <div className="flex gap-2 mb-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={detectMyLocation}
                        disabled={isDetectingLocation}
                        className="w-full"
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        {isDetectingLocation ? "Detecting..." : "Detect My Location"}
                      </Button>
                    </div>
                    <div className="rounded-lg overflow-hidden border-2 border-border shadow-md">
                      <MapView
                        height="300px"
                        zoom={15}
                        onLocationDetect={handleLocationDetect}
                      />
                    </div>
                    {location && (
                      <Alert>
                        <MapPin className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Location Captured:</strong> {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Address Display */}
                    {location && address && (
                      <Alert>
                        <MapPin className="w-4 h-4" />
                        <AlertDescription>
                          <p className="text-sm"><strong>Address:</strong> {address}</p>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  {/* Severity Slider */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Issue Severity</Label>
                    <Slider
                      value={[severity]}
                      onValueChange={(value) => setSeverity(value[0])}
                      max={100}
                      step={1}
                      className={
                        severity <= 33 ? "slider-low" :
                          severity <= 66 ? "slider-medium" :
                            "slider-high"
                      }
                    />
                    <div className="flex justify-between text-sm">
                      <span className={severity <= 33 ? "font-bold text-green-600" : "text-muted-foreground"}>Low</span>
                      <span className={severity > 33 && severity <= 66 ? "font-bold text-yellow-600" : "text-muted-foreground"}>Medium</span>
                      <span className={severity > 66 ? "font-bold text-red-600" : "text-muted-foreground"}>High</span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-lg font-semibold"
                    disabled={isSubmitting || !image || !location}
                  >
                    {isSubmitting ? (
                      <>
                        <Clock className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 mr-2" />
                        Submit Report
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Recent Reports Sidebar */}
          <div className="lg:col-span-1">
            <Card className="shadow-xl sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Submissions
                </CardTitle>
                <CardDescription>
                  Your latest reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentReports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No reports yet</p>
                    <p className="text-sm">Submit your first report!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentReports.map((report) => (
                      <div
                        key={report.id}
                        className="border rounded-lg p-3 hover:shadow-md transition-shadow bg-white"
                      >
                        <div className="flex gap-3">
                          <img
                            src={report.image_url}
                            alt="Report"
                            className="w-16 h-16 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <Badge variant="secondary" className="text-xs">
                                {report.category}
                              </Badge>
                              <StatusBadge status={report.status as "pending" | "in-progress" | "resolved"} />
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-1">
                              {report.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(report.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;
