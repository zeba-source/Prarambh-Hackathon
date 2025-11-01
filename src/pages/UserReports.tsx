import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import StatusBadge from "@/components/StatusBadge";
import MapView from "@/components/MapView";
import { getCategoryColor } from "@/lib/mockData";
import { IssueStatus, IssueCategory } from "@/types/report";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
    ArrowLeft, Search, Filter, Image as ImageIcon, Map, Download,
    Bell, RefreshCw, Clock, Eye, UserCheck, CheckCircle, Zap
} from "lucide-react";

interface UserReport {
    id: string;
    image_url: string;
    ai_processed_image_url: string | null;
    description: string;
    latitude: number;
    longitude: number;
    category: IssueCategory;
    department: string;
    status: IssueStatus;
    created_at: string;
    updated_at?: string;
    viewed_at?: string;
    assigned_at?: string;
    resolved_at?: string;
}

const UserReports = () => {
    const navigate = useNavigate();
    const [reports, setReports] = useState<UserReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterCategory, setFilterCategory] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

    // Get user role from localStorage
    const userRole = localStorage.getItem("userRole") || "user";

    // Fetch all reports (for testing, we show all reports)
    // In production, you would filter by user_id
    useEffect(() => {
        fetchReports();

        // Set up auto-refresh every 30 seconds
        if (autoRefresh) {
            autoRefreshInterval.current = setInterval(() => {
                fetchReports(true); // Silent refresh
            }, 30000);
        }

        // Set up real-time subscription for status updates
        const subscription = supabase
            .channel('reports-channel')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'reports'
                },
                (payload) => {
                    console.log('Report updated:', payload);

                    // Show toast notification for status changes
                    if (payload.eventType === 'UPDATE' && payload.new) {
                        const newReport = payload.new as UserReport;
                        const oldReport = reports.find(r => r.id === newReport.id);

                        if (oldReport && oldReport.status !== newReport.status) {
                            toast.success(
                                `🔔 Status Updated: Report #${newReport.id.slice(0, 8)} is now ${newReport.status}!`,
                                { duration: 5000 }
                            );
                        }
                    }

                    fetchReports(true); // Refresh reports
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
            if (autoRefreshInterval.current) {
                clearInterval(autoRefreshInterval.current);
            }
        };
    }, [autoRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchReports = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const { data, error } = await supabase
                .from('reports')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            setReports(data as UserReport[]);
            setLastUpdate(new Date());
        } catch (error) {
            console.error('Error fetching reports:', error);
            if (!silent) toast.error('Failed to load reports');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    // Filter reports
    const filteredReports = reports.filter((report) => {
        const matchesCategory = filterCategory === "all" || report.category === filterCategory;
        const matchesStatus = filterStatus === "all" || report.status === filterStatus;
        const matchesSearch = report.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesStatus && matchesSearch;
    });

    // Stats
    const stats = {
        total: reports.length,
        pending: reports.filter(r => r.status === 'pending').length,
        inProgress: reports.filter(r => r.status === 'in-progress').length,
        resolved: reports.filter(r => r.status === 'resolved').length,
    };

    // Get timeline stages for a report
    const getReportTimeline = (report: UserReport) => {
        const stages = [
            {
                label: "Submitted",
                icon: Clock,
                completed: true,
                date: new Date(report.created_at),
                color: "text-blue-600"
            },
            {
                label: "Viewed by Admin",
                icon: Eye,
                completed: report.viewed_at !== null || report.status !== 'pending',
                date: report.viewed_at ? new Date(report.viewed_at) : null,
                color: "text-purple-600"
            },
            {
                label: "Assigned",
                icon: UserCheck,
                completed: report.assigned_at !== null || report.status === 'in-progress' || report.status === 'resolved',
                date: report.assigned_at ? new Date(report.assigned_at) : null,
                color: "text-yellow-600"
            },
            {
                label: "Resolved",
                icon: CheckCircle,
                completed: report.status === 'resolved',
                date: report.resolved_at ? new Date(report.resolved_at) : null,
                color: "text-green-600"
            }
        ];
        return stages;
    };

    // Get AI explanation for category detection
    const getAIExplanation = (category: string) => {
        const explanations: Record<string, string> = {
            pothole: "🔍 Detected cracks, uneven surface patterns, and road damage indicators typical of potholes.",
            garbage: "🗑️ Identified scattered waste materials, overflow patterns, and sanitation concerns.",
            streetlight: "💡 Recognized lighting equipment, pole structures, and electrical fixture components.",
            other: "🤖 Image analyzed but no specific category patterns matched. Manual review recommended."
        };
        return explanations[category.toLowerCase()] || explanations.other;
    };

    // Download report as PDF
    const downloadReportPDF = async (report: UserReport) => {
        try {
            toast.loading("Generating PDF...");

            // In a real implementation, you would use a library like jsPDF or call a backend API
            // For now, we'll create a simple text-based download
            const timeline = getReportTimeline(report);
            const pdfContent = `
CIVIC ISSUE REPORT
==================

Report ID: ${report.id}
Status: ${report.status.toUpperCase()}
Category: ${report.category}
${userRole === "admin" ? `Department: ${report.department}\n` : ''}

TIMELINE:
---------
${timeline.map(stage => `${stage.completed ? '✅' : '⏳'} ${stage.label}${stage.date ? `: ${stage.date.toLocaleString()}` : ''}`).join('\n')}

DESCRIPTION:
-----------
${report.description || 'No description provided'}

LOCATION:
---------
Coordinates: ${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}

AI ANALYSIS:
-----------
${getAIExplanation(report.category)}

IMAGES:
-------
Original Image: ${report.image_url}
${report.ai_processed_image_url ? `AI Processed: ${report.ai_processed_image_url}` : 'No AI processing available'}

Submitted: ${new Date(report.created_at).toLocaleString()}
Last Updated: ${new Date(lastUpdate).toLocaleString()}

---
Generated by Community Alert Dashboard
            `.trim();

            const blob = new Blob([pdfContent], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `report-${report.id.slice(0, 8)}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            toast.success("Report downloaded successfully!");
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast.error('Failed to download report');
        }
    };

    // Toggle auto-refresh
    const toggleAutoRefresh = () => {
        setAutoRefresh(!autoRefresh);
        toast.info(autoRefresh ? "Auto-refresh disabled" : "Auto-refresh enabled");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-accent via-background to-muted">
            <header className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center gap-4 mb-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(userRole === "admin" ? "/admin" : "/user-dashboard")}
                            className="text-primary-foreground hover:bg-primary-foreground/20"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
                                <ImageIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">
                                    {userRole === "admin" ? "All Reports" : "My Reports"}
                                </h1>
                                <p className="text-xs opacity-90">
                                    Last updated: {lastUpdate.toLocaleTimeString()}
                                </p>
                            </div>
                        </div>

                        {/* View Mode Toggle */}
                        <div className="ml-auto flex items-center gap-2">
                            <Button
                                variant={autoRefresh ? "secondary" : "ghost"}
                                size="sm"
                                onClick={toggleAutoRefresh}
                                className="gap-2"
                            >
                                {autoRefresh ? <Zap className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                                {autoRefresh ? "Live" : "Manual"}
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => fetchReports()}
                                className="gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Refresh
                            </Button>

                            <div className="flex bg-primary-foreground/20 rounded-lg p-1">
                                <Button
                                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setViewMode("grid")}
                                    className="gap-2"
                                >
                                    <ImageIcon className="w-4 h-4" />
                                    Grid
                                </Button>
                                <Button
                                    variant={viewMode === "map" ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setViewMode("map")}
                                    className="gap-2"
                                >
                                    <Map className="w-4 h-4" />
                                    Map
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-primary-foreground/10 rounded-lg p-4 backdrop-blur-sm">
                            <p className="text-sm opacity-90">Total Reports</p>
                            <p className="text-3xl font-bold">{stats.total}</p>
                        </div>
                        <div className="bg-primary-foreground/10 rounded-lg p-4 backdrop-blur-sm">
                            <p className="text-sm opacity-90">Pending</p>
                            <p className="text-3xl font-bold">{stats.pending}</p>
                        </div>
                        <div className="bg-primary-foreground/10 rounded-lg p-4 backdrop-blur-sm">
                            <p className="text-sm opacity-90">In Progress</p>
                            <p className="text-3xl font-bold">{stats.inProgress}</p>
                        </div>
                        <div className="bg-primary-foreground/10 rounded-lg p-4 backdrop-blur-sm">
                            <p className="text-sm opacity-90">Resolved</p>
                            <p className="text-3xl font-bold">{stats.resolved}</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {/* Filters */}
                <Card className="mb-6 shadow-md">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Filter className="w-5 h-5" />
                            <CardTitle>Filter Reports</CardTitle>
                        </div>
                        <CardDescription>Search and filter your submitted reports</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search description..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            <div>
                                <Select value={filterCategory} onValueChange={setFilterCategory}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filter by category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        <SelectItem value="pothole">Pothole</SelectItem>
                                        <SelectItem value="garbage">Garbage</SelectItem>
                                        <SelectItem value="streetlight">Street Light</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Select value={filterStatus} onValueChange={setFilterStatus}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filter by status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="in-progress">In Progress</SelectItem>
                                        <SelectItem value="resolved">Resolved</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Loading State */}
                {loading && (
                    <Card className="shadow-md">
                        <CardContent className="py-12 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Loading your reports...</p>
                        </CardContent>
                    </Card>
                )}

                {/* Reports Grid */}
                {!loading && filteredReports.length > 0 && viewMode === "grid" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredReports.map((report) => {
                            const timeline = getReportTimeline(report);
                            return (
                                <Card key={report.id} className="shadow-md hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge className={getCategoryColor(report.category)}>
                                                {report.category}
                                            </Badge>
                                            <StatusBadge status={report.status} />
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Submitted: {new Date(report.created_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Image Preview with AI Detection Toggle */}
                                        {report.ai_processed_image_url ? (
                                            <Tabs defaultValue="original" className="w-full">
                                                <TabsList className="grid w-full grid-cols-2">
                                                    <TabsTrigger value="original">Original</TabsTrigger>
                                                    <TabsTrigger value="ai">AI Detected</TabsTrigger>
                                                </TabsList>
                                                <TabsContent value="original" className="mt-2">
                                                    <img
                                                        src={report.image_url}
                                                        alt="Original"
                                                        className="w-full h-48 object-cover rounded-lg"
                                                    />
                                                    <p className="text-xs text-muted-foreground mt-1 text-center">Original Image</p>
                                                </TabsContent>
                                                <TabsContent value="ai" className="mt-2">
                                                    <img
                                                        src={report.ai_processed_image_url}
                                                        alt="AI Processed"
                                                        className="w-full h-48 object-cover rounded-lg border-2 border-green-500"
                                                    />
                                                    <p className="text-xs text-green-600 mt-1 text-center font-medium">
                                                        ✅ AI Detection (YOLO)
                                                    </p>
                                                </TabsContent>
                                            </Tabs>
                                        ) : (
                                            <div>
                                                <img
                                                    src={report.image_url}
                                                    alt="Report"
                                                    className="w-full h-48 object-cover rounded-lg"
                                                />
                                                <p className="text-xs text-muted-foreground mt-1 text-center">
                                                    No AI processing
                                                </p>
                                            </div>
                                        )}

                                        {/* AI Explanation */}
                                        {userRole === "user" && (
                                            <Alert className="bg-blue-50 border-blue-200">
                                                <Zap className="w-4 h-4 text-blue-600" />
                                                <AlertDescription className="text-xs text-blue-800">
                                                    {getAIExplanation(report.category)}
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        {/* Description */}
                                        <div>
                                            <p className="text-sm font-medium text-foreground mb-1">Description</p>
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {report.description || "No description provided"}
                                            </p>
                                        </div>

                                        {/* Department - Only show to admins */}
                                        {userRole === "admin" && (
                                            <div>
                                                <p className="text-sm font-medium text-foreground mb-1">Department</p>
                                                <Badge variant="outline" className="text-xs">
                                                    {report.department}
                                                </Badge>
                                            </div>
                                        )}

                                        {/* Location */}
                                        <div>
                                            <p className="text-sm font-medium text-foreground mb-1">Location</p>
                                            <p className="text-xs text-muted-foreground">
                                                {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                                            </p>
                                        </div>

                                        {/* Timeline Visualization */}
                                        <div className="pt-2 border-t">
                                            <p className="text-xs font-medium text-foreground mb-3">
                                                {userRole === "user" ? "🎯 Report Journey" : "Timeline"}
                                            </p>
                                            <div className="space-y-2">
                                                {timeline.map((stage, index) => {
                                                    const Icon = stage.icon;
                                                    return (
                                                        <div key={stage.label} className="flex items-center gap-2">
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${stage.completed ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                                                                }`}>
                                                                <Icon className="w-3 h-3" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className={`text-xs ${stage.completed ? 'font-medium' : 'text-muted-foreground'}`}>
                                                                    {stage.label}
                                                                </p>
                                                                {stage.date && (
                                                                    <p className="text-[10px] text-muted-foreground">
                                                                        {stage.date.toLocaleString()}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            {stage.completed && <CheckCircle className="w-4 h-4 text-green-500" />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Gamified message for users */}
                                        {userRole === "user" && (
                                            <div className="mt-2 p-2 bg-accent/50 rounded-md">
                                                <p className="text-xs text-center font-medium">
                                                    {report.status === 'pending' && '⏰ Your report is being reviewed...'}
                                                    {report.status === 'in-progress' && '🚀 Great! Your issue is being worked on!'}
                                                    {report.status === 'resolved' && '🎊 Awesome! Issue resolved! Thanks for reporting!'}
                                                </p>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                variant="outline"
                                                className="flex-1 text-xs"
                                                onClick={() => navigate(`/report/${report.id}`)}
                                            >
                                                📋 View Details
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => downloadReportPDF(report)}
                                                title="Download as PDF"
                                            >
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Map View Mode */}
                {!loading && filteredReports.length > 0 && viewMode === "map" && (
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Map className="w-5 h-5" />
                                Reports Map View
                            </CardTitle>
                            <CardDescription>
                                Showing {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''} on the map
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <MapView
                                reports={filteredReports.map(r => ({
                                    id: r.id,
                                    image: r.image_url,
                                    aiProcessedImage: r.ai_processed_image_url || undefined,
                                    description: r.description,
                                    location: { lat: r.latitude, lon: r.longitude },
                                    category: r.category,
                                    department: r.department,
                                    status: r.status,
                                    createdAt: new Date(r.created_at)
                                }))}
                                height="600px"
                                zoom={12}
                            />
                        </CardContent>
                    </Card>
                )}

                {/* Empty State */}
                {!loading && filteredReports.length === 0 && (
                    <Card className="shadow-md">
                        <CardContent className="py-12 text-center">
                            <ImageIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <h3 className="text-lg font-semibold mb-2">No Reports Found</h3>
                            <p className="text-muted-foreground mb-4">
                                {reports.length === 0
                                    ? "You haven't submitted any reports yet."
                                    : "No reports match your current filters."}
                            </p>
                            {reports.length === 0 && (
                                <Button onClick={() => navigate("/user-dashboard")}>
                                    Submit Your First Report
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
};

export default UserReports;
