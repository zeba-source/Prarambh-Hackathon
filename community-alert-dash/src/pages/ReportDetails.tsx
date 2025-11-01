import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import StatusBadge from "@/components/StatusBadge";
import MapView from "@/components/MapView";
import { getCategoryColor } from "@/lib/mockData";
import { IssueStatus, IssueCategory } from "@/types/report";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Calendar, MapPin, Building2, CheckCircle2 } from "lucide-react";

interface ReportDetail {
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
}

const ReportDetails = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [report, setReport] = useState<ReportDetail | null>(null);
    const [loading, setLoading] = useState(true);

    // Get user role from localStorage
    const userRole = localStorage.getItem("userRole") || "user";

    const fetchReportDetails = async () => {
        try {
            const { data, error } = await supabase
                .from('reports')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setReport(data as ReportDetail);
        } catch (error) {
            console.error('Error fetching report:', error);
            toast.error('Failed to load report details');
            navigate(userRole === "admin" ? '/admin-dashboard' : '/user-reports');
        } finally {
            setLoading(false);
        }
    };

    const subscribeToChanges = () => {
        const subscription = supabase
            .channel(`report-${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'reports',
                    filter: `id=eq.${id}`,
                },
                (payload) => {
                    setReport(payload.new as ReportDetail);
                    toast.info('Report updated');
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    };

    useEffect(() => {
        if (id) {
            fetchReportDetails();
            const cleanup = subscribeToChanges();
            return cleanup;
        }
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps


    const handleStatusUpdate = async (newStatus: IssueStatus) => {
        if (!report) return;

        try {
            const { error } = await supabase
                .from('reports')
                .update({ status: newStatus })
                .eq('id', report.id);

            if (error) throw error;

            setReport({ ...report, status: newStatus });
            toast.success(`Status updated to ${newStatus}`);
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
        }
    };

    const handleAutoRoute = async () => {
        if (!report) return;

        const departmentMap: Record<string, string> = {
            pothole: "Road Maintenance",
            garbage: "Sanitation Department",
            streetlight: "Public Works - Lighting",
            other: "General Services"
        };

        const newDepartment = departmentMap[report.category] || "General Services";

        try {
            const { error } = await supabase
                .from('reports')
                .update({ department: newDepartment })
                .eq('id', report.id);

            if (error) throw error;

            setReport({ ...report, department: newDepartment });
            toast.success(`Auto-routed to ${newDepartment}`);
        } catch (error) {
            console.error('Error auto-routing:', error);
            toast.error('Failed to auto-route issue');
        }
    };

    const handleManualAssign = async (department: string) => {
        if (!report) return;

        try {
            const { error } = await supabase
                .from('reports')
                .update({ department })
                .eq('id', report.id);

            if (error) throw error;

            setReport({ ...report, department });
            toast.success(`Assigned to ${department}`);
        } catch (error) {
            console.error('Error assigning department:', error);
            toast.error('Failed to assign department');
        }
    };

    const getStatusTimeline = () => {
        if (!report) return [];

        const statuses = [
            { label: "Submitted", value: "pending", icon: Calendar },
            { label: "In Progress", value: "in-progress", icon: Building2 },
            { label: "Resolved", value: "resolved", icon: CheckCircle2 }
        ];

        const currentIndex = statuses.findIndex(s => s.value === report.status);

        return statuses.map((status, index) => ({
            ...status,
            completed: index <= currentIndex,
            current: index === currentIndex
        }));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-accent via-background to-muted flex items-center justify-center">
                <Card className="w-16 h-16 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </Card>
            </div>
        );
    }

    if (!report) {
        return null;
    }

    const timeline = getStatusTimeline();

    return (
        <div className="min-h-screen bg-gradient-to-br from-accent via-background to-muted">
            <header className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(userRole === "admin" ? '/admin-dashboard' : '/user-reports')}
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to {userRole === "admin" ? "Dashboard" : "Reports"}
                        </Button>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold">Report Details</h1>
                            <p className="text-sm opacity-90">Report ID: {report.id.slice(0, 8)}...</p>
                        </div>
                        <Badge className={getCategoryColor(report.category)}>
                            {report.category}
                        </Badge>
                        <StatusBadge status={report.status} />
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Images and Description */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Images */}
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle>Issue Images</CardTitle>
                                <CardDescription>Original and AI-processed images</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {report.ai_processed_image_url ? (
                                    <Tabs defaultValue="original" className="w-full">
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="original">Original Image</TabsTrigger>
                                            <TabsTrigger value="ai">AI Detected</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="original" className="mt-4">
                                            <img
                                                src={report.image_url}
                                                alt="Original Issue"
                                                className="w-full h-[500px] object-contain rounded-lg bg-muted"
                                            />
                                            <p className="text-sm text-muted-foreground mt-2 text-center">
                                                Original uploaded image
                                            </p>
                                        </TabsContent>
                                        <TabsContent value="ai" className="mt-4">
                                            <img
                                                src={report.ai_processed_image_url}
                                                alt="AI Processed with Detection"
                                                className="w-full h-[500px] object-contain rounded-lg bg-muted border-4 border-green-500"
                                            />
                                            <div className="mt-2 text-center">
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                                    ✅ AI Detection Applied (YOLO)
                                                </Badge>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Image processed with object detection
                                                </p>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                ) : (
                                    <div>
                                        <img
                                            src={report.image_url}
                                            alt="Issue"
                                            className="w-full h-[500px] object-contain rounded-lg bg-muted"
                                        />
                                        <p className="text-sm text-muted-foreground mt-2 text-center">
                                            ⚠️ No AI processing available for this image
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Description */}
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle>Description</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-foreground leading-relaxed">
                                    {report.description || "No description provided"}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Interactive Map */}
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="w-5 h-5" />
                                    Location
                                </CardTitle>
                                <CardDescription>
                                    Coordinates: {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <MapView
                                    reports={[{
                                        id: report.id,
                                        image: report.image_url,
                                        aiProcessedImage: report.ai_processed_image_url || undefined,
                                        description: report.description,
                                        location: { lat: report.latitude, lon: report.longitude },
                                        category: report.category,
                                        department: report.department,
                                        status: report.status,
                                        createdAt: new Date(report.created_at)
                                    }]}
                                    center={{ lat: report.latitude, lon: report.longitude }}
                                    height="350px"
                                    zoom={15}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Status and Actions */}
                    <div className="space-y-6">
                        {/* Status Timeline */}
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle>{userRole === "user" ? "🎯 Your Report Progress" : "Status Timeline"}</CardTitle>
                                <CardDescription>
                                    {userRole === "user"
                                        ? "Track your report status in real-time"
                                        : "Track the progress of this report"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {timeline.map((step, index) => {
                                        const Icon = step.icon;
                                        return (
                                            <div key={step.value} className="flex items-start gap-3">
                                                <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center
                          ${step.completed
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-muted text-muted-foreground'}
                          ${step.current ? 'ring-4 ring-primary/30' : ''}
                        `}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`font-medium ${step.current ? 'text-primary' : ''}`}>
                                                        {step.label}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {step.completed ? 'Completed' : 'Pending'}
                                                    </p>
                                                </div>
                                                {index < timeline.length - 1 && (
                                                    <div className={`absolute left-5 w-0.5 h-8 mt-10 
                            ${step.completed ? 'bg-primary' : 'bg-muted'}`}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Gamified message for users */}
                                {userRole === "user" && (
                                    <div className="mt-4 p-3 bg-accent/50 rounded-lg border-2 border-primary/20">
                                        <p className="text-sm text-center font-medium">
                                            {report.status === 'pending' && '⏰ Your report is being reviewed by our team...'}
                                            {report.status === 'in-progress' && '🚀 Great! Your issue is actively being worked on!'}
                                            {report.status === 'resolved' && '🎊 Awesome! Issue resolved! Thank you for making your community better!'}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Update Status - ADMIN ONLY */}
                        {userRole === "admin" && (
                            <Card className="shadow-lg">
                                <CardHeader>
                                    <CardTitle>Update Status</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Select
                                        value={report.status}
                                        onValueChange={(value) => handleStatusUpdate(value as IssueStatus)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="in-progress">In Progress</SelectItem>
                                            <SelectItem value="resolved">Resolved</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Current status: <span className="font-medium">{report.status}</span>
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Department Assignment - ADMIN ONLY */}
                        {userRole === "admin" && (
                            <Card className="shadow-lg">
                                <CardHeader>
                                    <CardTitle>Department Assignment</CardTitle>
                                    <CardDescription>
                                        AI Suggested: {
                                            report.category === 'pothole' ? 'Road Maintenance' :
                                                report.category === 'garbage' ? 'Sanitation' :
                                                    report.category === 'streetlight' ? 'Public Works' :
                                                        'General Services'
                                        }
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Select
                                        value={report.department}
                                        onValueChange={handleManualAssign}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Road Maintenance">Road Maintenance</SelectItem>
                                            <SelectItem value="Sanitation Department">Sanitation Department</SelectItem>
                                            <SelectItem value="Public Works - Lighting">Public Works - Lighting</SelectItem>
                                            <SelectItem value="Water Department">Water Department</SelectItem>
                                            <SelectItem value="General Services">General Services</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={handleAutoRoute}
                                    >
                                        🤖 Auto-Route Based on AI
                                    </Button>
                                    <p className="text-xs text-muted-foreground">
                                        Currently assigned to: <span className="font-medium">{report.department}</span>
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Submission Info */}
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle>Submission Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Report ID:</span>
                                    <span className="font-mono text-xs">{report.id.slice(0, 12)}...</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Submitted:</span>
                                    <span>{new Date(report.created_at).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Category:</span>
                                    <Badge className={getCategoryColor(report.category)}>
                                        {report.category}
                                    </Badge>
                                </div>
                                <Separator />
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">AI Processing:</span>
                                    <span>{report.ai_processed_image_url ? '✅ Yes' : '❌ No'}</span>
                                </div>
                                {/* Show department only to admins */}
                                {userRole === "admin" && (
                                    <>
                                        <Separator />
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Department:</span>
                                            <Badge variant="outline" className="text-xs">
                                                {report.department}
                                            </Badge>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ReportDetails;
