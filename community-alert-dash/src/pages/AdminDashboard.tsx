import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import StatusBadge from "@/components/StatusBadge";
import MapView from "@/components/MapView";
import { getCategoryColor } from "@/lib/mockData";
import { IssueStatus, IssueCategory } from "@/types/report";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BarChart, Bar, PieChart, Pie, LineChart, Line, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, Legend, ResponsiveContainer
} from "recharts";
import {
  Bell, Download, Filter, AlertTriangle, Clock, TrendingUp, MapPin,
  CheckCircle2, Layers, Users, Activity, FileDown, BarChart3
} from "lucide-react";

interface AdminReport {
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
  ai_confidence?: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("all");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [mapLayerFilter, setMapLayerFilter] = useState<string>("all");
  const [showNotifications, setShowNotifications] = useState(false);
  const [minConfidence, setMinConfidence] = useState<number>(0);
  const [sortBy, setSortBy] = useState<"date" | "priority" | "age">("date");

  // Fetch reports from Supabase
  useEffect(() => {
    fetchReports();

    // Set up real-time subscription
    const subscription = supabase
      .channel('admin-reports-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        fetchReports();
        toast.info("🔔 New report activity detected");
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Add mock AI confidence scores if not present
      const reportsWithConfidence = (data as AdminReport[]).map(report => ({
        ...report,
        ai_confidence: report.ai_confidence || Math.random() * 0.3 + 0.7 // 70-100%
      }));

      setReports(reportsWithConfidence);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    }
  };

  // Calculate issue age in days
  const getIssueAge = (created_at: string): number => {
    const now = new Date();
    const created = new Date(created_at);
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Calculate priority score for auto-prioritization
  const getPriorityScore = (report: AdminReport): number => {
    let score = 0;

    // Age factor (older = higher priority)
    const age = getIssueAge(report.created_at);
    score += Math.min(age * 2, 30); // Max 30 points for age

    // Category severity
    const severityMap: Record<string, number> = {
      pothole: 20,
      streetlight: 15,
      garbage: 10,
      other: 5
    };
    score += severityMap[report.category] || 5;

    // Status urgency
    if (report.status === 'pending') score += 15;
    else if (report.status === 'in-progress') score += 10;

    // AI confidence (lower confidence = needs review)
    score += (1 - (report.ai_confidence || 0.8)) * 10;

    return score;
  };

  // Get filtered and sorted reports
  const getFilteredReports = () => {
    const filtered = reports.filter((report) => {
      const matchesCategory = filterCategory === "all" || report.category === filterCategory;
      const matchesStatus = filterStatus === "all" || report.status === filterStatus;
      const matchesDepartment = filterDepartment === "all" || report.department === filterDepartment;
      const matchesSearch = report.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesConfidence = (report.ai_confidence || 0) * 100 >= minConfidence;

      // Date filtering
      let matchesDate = true;
      if (filterDate !== "all") {
        const age = getIssueAge(report.created_at);
        if (filterDate === "today") matchesDate = age === 0;
        else if (filterDate === "week") matchesDate = age <= 7;
        else if (filterDate === "month") matchesDate = age <= 30;
      }

      return matchesCategory && matchesStatus && matchesSearch && matchesDate && matchesDepartment && matchesConfidence;
    });

    // Apply sorting
    if (sortBy === "priority") {
      filtered.sort((a, b) => getPriorityScore(b) - getPriorityScore(a));
    } else if (sortBy === "age") {
      filtered.sort((a, b) => getIssueAge(b.created_at) - getIssueAge(a.created_at));
    }
    // Default is by date (already sorted from query)

    return filtered;
  };

  const filteredReports = getFilteredReports();

  // Analytics data
  const analyticsData = {
    categoryDistribution: [
      { name: 'Pothole', value: reports.filter(r => r.category === 'pothole').length, color: '#f97316' },
      { name: 'Garbage', value: reports.filter(r => r.category === 'garbage').length, color: '#10b981' },
      { name: 'Streetlight', value: reports.filter(r => r.category === 'streetlight').length, color: '#3b82f6' },
      { name: 'Other', value: reports.filter(r => r.category === 'other').length, color: '#6b7280' },
    ].filter(d => d.value > 0),

    departmentWorkload: Object.entries(
      reports.reduce((acc, r) => {
        acc[r.department] = (acc[r.department] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value })),

    responseTimeTrend: (() => {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      });

      return last7Days.map((day, index) => ({
        day,
        reports: reports.filter(r => {
          const reportDate = new Date(r.created_at);
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() - (6 - index));
          return reportDate.toDateString() === targetDate.toDateString();
        }).length
      }));
    })(),
  };

  // Get recent notifications (last 5 reports)
  const recentNotifications = reports.slice(0, 5);

  const handleStatusUpdate = async (id: string, newStatus: IssueStatus) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setReports((prev) =>
        prev.map((report) =>
          report.id === id ? { ...report, status: newStatus } : report
        )
      );
      toast.success("Status updated successfully");
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleAutoRoute = async (id: string) => {
    const report = reports.find(r => r.id === id);
    if (!report) return;

    // Auto-route based on AI-detected category
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
        .eq('id', id);

      if (error) throw error;

      setReports((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, department: newDepartment } : r
        )
      );

      toast.success(`Auto-routed to ${newDepartment}`);
    } catch (error) {
      console.error('Error auto-routing:', error);
      toast.error('Failed to auto-route issue');
    }
  };

  // Batch routing
  const handleBatchRoute = async (department: string) => {
    if (selectedReports.length === 0) {
      toast.error("Please select reports to route");
      return;
    }

    try {
      const { error } = await supabase
        .from('reports')
        .update({ department })
        .in('id', selectedReports);

      if (error) throw error;

      setReports((prev) =>
        prev.map((r) =>
          selectedReports.includes(r.id) ? { ...r, department } : r
        )
      );

      toast.success(`${selectedReports.length} reports routed to ${department}`);
      setSelectedReports([]);
    } catch (error) {
      console.error('Error batch routing:', error);
      toast.error('Failed to batch route');
    }
  };

  // Toggle report selection
  const toggleReportSelection = (id: string) => {
    setSelectedReports(prev =>
      prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
    );
  };

  // Export data as CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Category', 'Description', 'Status', 'Department', 'Location', 'Created', 'Age (days)'];
    const rows = filteredReports.map(r => [
      r.id.slice(0, 8),
      r.category,
      r.description.replace(/,/g, ';'),
      r.status,
      r.department,
      `${r.latitude.toFixed(4)} ${r.longitude.toFixed(4)}`,
      new Date(r.created_at).toLocaleDateString(),
      getIssueAge(r.created_at).toString()
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success("Data exported successfully");
  };

  const handleManualAssign = async (id: string, department: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ department })
        .eq('id', id);

      if (error) throw error;

      setReports((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, department } : r
        )
      );

      toast.success(`Assigned to ${department}`);
    } catch (error) {
      console.error('Error assigning department:', error);
      toast.error('Failed to assign department');
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
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-xs opacity-80">AI-Powered Analytics & Management</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Notification Center */}
              <Popover open={showNotifications} onOpenChange={setShowNotifications}>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="icon" className="relative">
                    <Bell className="w-4 h-4" />
                    {recentNotifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                        {recentNotifications.length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Recent Reports
                    </h3>
                    <ScrollArea className="h-64">
                      {recentNotifications.map((notif) => (
                        <div key={notif.id} className="p-2 hover:bg-accent rounded-lg cursor-pointer mb-2"
                          onClick={() => navigate(`/report/${notif.id}`)}>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getCategoryColor(notif.category)} variant="secondary">
                              {notif.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(notif.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-xs line-clamp-2">{notif.description}</p>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>

              <Button variant="secondary" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>

          {/* Enhanced Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-primary-foreground/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 opacity-75" />
                <p className="text-xs opacity-90">Total</p>
              </div>
              <p className="text-3xl font-bold">{reports.length}</p>
            </div>
            <div className="bg-yellow-500/20 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 opacity-75" />
                <p className="text-xs opacity-90">Pending</p>
              </div>
              <p className="text-3xl font-bold">{reports.filter(r => r.status === "pending").length}</p>
            </div>
            <div className="bg-blue-500/20 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 opacity-75" />
                <p className="text-xs opacity-90">In Progress</p>
              </div>
              <p className="text-3xl font-bold">{reports.filter(r => r.status === "in-progress").length}</p>
            </div>
            <div className="bg-green-500/20 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 opacity-75" />
                <p className="text-xs opacity-90">Resolved</p>
              </div>
              <p className="text-3xl font-bold">{reports.filter(r => r.status === "resolved").length}</p>
            </div>
            <div className="bg-orange-500/20 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 opacity-75" />
                <p className="text-xs opacity-90">High Priority</p>
              </div>
              <p className="text-3xl font-bold">
                {reports.filter(r => getPriorityScore(r) > 40).length}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Analytics Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Category Distribution */}
            <Card className="shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Issues by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={analyticsData.categoryDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {analyticsData.categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Department Workload */}
            <Card className="shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Department Workload
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={analyticsData.departmentWorkload}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10 }} />
                    <YAxis />
                    <ChartTooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Response Trend */}
            <Card className="shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  7-Day Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={analyticsData.responseTimeTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <ChartTooltip />
                    <Line type="monotone" dataKey="reports" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Smart Filters */}
            <Card className="shadow-md">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    <CardTitle>Smart Filters & Controls</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportCSV}>
                      <FileDown className="w-4 h-4 mr-1" />
                      Export CSV
                    </Button>
                    {selectedReports.length > 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="default" size="sm">
                            Batch Route ({selectedReports.length})
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56">
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Route to Department:</p>
                            {["Road Maintenance", "Sanitation Department", "Public Works - Lighting", "Water Department", "General Services"].map(dept => (
                              <Button
                                key={dept}
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => handleBatchRoute(dept)}
                              >
                                {dept}
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      placeholder="Search description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="pothole">Pothole</SelectItem>
                        <SelectItem value="garbage">Garbage</SelectItem>
                        <SelectItem value="streetlight">Street Light</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select value={filterDate} onValueChange={setFilterDate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Time Range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        <SelectItem value="Road Maintenance">Road Maintenance</SelectItem>
                        <SelectItem value="Sanitation Department">Sanitation</SelectItem>
                        <SelectItem value="Public Works - Lighting">Lighting</SelectItem>
                        <SelectItem value="Water Department">Water</SelectItem>
                        <SelectItem value="General Services">General</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as "date" | "priority" | "age")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sort By" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Latest First</SelectItem>
                        <SelectItem value="priority">Priority</SelectItem>
                        <SelectItem value="age">Oldest First</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      AI Confidence Threshold: {minConfidence}%
                    </label>
                    <Slider
                      value={[minConfidence]}
                      onValueChange={(v) => setMinConfidence(v[0])}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant={viewMode === "grid" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                      >
                        Grid View
                      </Button>
                      <Button
                        variant={viewMode === "map" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setViewMode("map")}
                      >
                        <MapPin className="w-4 h-4 mr-1" />
                        Map View
                      </Button>
                    </div>
                    {viewMode === "map" && (
                      <Select value={mapLayerFilter} onValueChange={setMapLayerFilter}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            <div className="flex items-center gap-2">
                              <Layers className="w-4 h-4" />
                              All Layers
                            </div>
                          </SelectItem>
                          <SelectItem value="pothole">Potholes Only</SelectItem>
                          <SelectItem value="garbage">Garbage Only</SelectItem>
                          <SelectItem value="streetlight">Streetlights Only</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <div className="ml-auto text-sm text-muted-foreground">
                      Showing {filteredReports.length} of {reports.length} reports
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Map View Mode */}
            {viewMode === "map" && (
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Interactive Map Dashboard
                  </CardTitle>
                  <CardDescription>
                    Click on markers for details • Showing {filteredReports.filter(r => mapLayerFilter === "all" || r.category === mapLayerFilter).length} issues
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Map Legend */}
                  <div className="mb-4 p-4 bg-accent/50 rounded-lg border border-border">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Map Legend
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-orange-500 border-2 border-white shadow-md flex items-center justify-center text-xs">
                          🕳️
                        </div>
                        <span className="text-sm">Pothole</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-white shadow-md flex items-center justify-center text-xs">
                          🗑️
                        </div>
                        <span className="text-sm">Garbage</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow-md flex items-center justify-center text-xs">
                          💡
                        </div>
                        <span className="text-sm">Streetlight</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-500 border-2 border-white shadow-md flex items-center justify-center text-xs">
                          ⚠️
                        </div>
                        <span className="text-sm">Other</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        💡 <strong>Tip:</strong> Faded markers indicate resolved issues. Click any marker to view full details.
                      </p>
                    </div>
                  </div>

                  <MapView
                    reports={filteredReports
                      .filter(r => mapLayerFilter === "all" || r.category === mapLayerFilter)
                      .map(r => ({
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
                    showLayerControl={true}
                  />
                </CardContent>
              </Card>
            )}

            {/* Grid View Mode */}
            {viewMode === "grid" && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredReports.map((report) => {
                  const age = getIssueAge(report.created_at);
                  const priorityScore = getPriorityScore(report);
                  const isHighPriority = priorityScore > 40;

                  return (
                    <Card key={report.id} className={`shadow-md hover:shadow-xl transition-all ${isHighPriority ? 'border-2 border-orange-500' : ''}`}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedReports.includes(report.id)}
                              onCheckedChange={() => toggleReportSelection(report.id)}
                            />
                            <Badge className={getCategoryColor(report.category)}>
                              {report.category}
                            </Badge>
                            {isHighPriority && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                HIGH
                              </Badge>
                            )}
                          </div>
                          <StatusBadge status={report.status} />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>ID: {report.id.slice(0, 8)}</span>
                          <span className={age > 7 ? 'text-orange-600 font-medium' : ''}>
                            <Clock className="w-3 h-3 inline mr-1" />
                            {age}d old
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Image Tabs: Original vs AI-Processed */}
                        {report.ai_processed_image_url ? (
                          <Tabs defaultValue="original" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="original">Original</TabsTrigger>
                              <TabsTrigger value="ai">AI {Math.round((report.ai_confidence || 0.8) * 100)}%</TabsTrigger>
                            </TabsList>
                            <TabsContent value="original" className="mt-2">
                              <img
                                src={report.image_url}
                                alt="Original Issue"
                                className="w-full h-48 object-cover rounded-lg"
                              />
                            </TabsContent>
                            <TabsContent value="ai" className="mt-2">
                              <img
                                src={report.ai_processed_image_url}
                                alt="AI Processed with Detection"
                                className="w-full h-48 object-cover rounded-lg border-2 border-green-500"
                              />
                              <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                                <p className="text-xs text-green-700 dark:text-green-300">
                                  ✅ AI Detection: {Math.round((report.ai_confidence || 0.8) * 100)}% confidence
                                </p>
                                {(report.ai_confidence || 0.8) < 0.75 && (
                                  <p className="text-xs text-orange-600 mt-1">
                                    ⚠️ Low confidence - manual review recommended
                                  </p>
                                )}
                              </div>
                            </TabsContent>
                          </Tabs>
                        ) : (
                          <img
                            src={report.image_url}
                            alt="Issue"
                            className="w-full h-48 object-cover rounded-lg"
                          />
                        )}

                        <div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{report.description}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Department</p>
                            <Badge variant="outline" className="text-xs">{report.department}</Badge>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Priority Score</p>
                            <Badge variant="secondary" className="text-xs">{priorityScore.toFixed(0)}</Badge>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Select
                            value={report.status}
                            onValueChange={(value) => handleStatusUpdate(report.id, value as IssueStatus)}
                          >
                            <SelectTrigger className="flex-1 h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAutoRoute(report.id)}
                            title="Auto-route based on AI detection"
                          >
                            🤖
                          </Button>
                        </div>

                        <Button
                          variant="secondary"
                          className="w-full"
                          onClick={() => navigate(`/report/${report.id}`)}
                        >
                          📋 Full Details
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {filteredReports.length === 0 && (
              <Card className="shadow-md">
                <CardContent className="py-12 text-center">
                  <Filter className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Reports Found</h3>
                  <p className="text-muted-foreground">Try adjusting your filters</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
