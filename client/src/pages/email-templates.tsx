import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Mail, Eye, Send, Plus, Edit, Trash2, Copy, Users, Building, User } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: 'promotional' | 'newsletter' | 'notification' | 'welcome';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EmailCampaign {
  id: string;
  name: string;
  templateId: string;
  subject: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduledAt?: string;
  sentAt?: string;
  stats: {
    totalRecipients: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
  };
  createdAt: string;
}

export default function EmailTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [templateFormOpen, setTemplateFormOpen] = useState(false);
  const [campaignData, setCampaignData] = useState({
    name: "",
    templateId: "",
    recipientType: "all_users",
    organizationIds: [] as string[],
    userIds: [] as string[],
    scheduledAt: ""
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["/api/email/templates"],
    retry: false,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["/api/email/campaigns"],
    retry: false,
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["/api/admin/organizations"],
    retry: false,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  // Enhanced campaign preview with real user data
  const [previewContent, setPreviewContent] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light');
  const [previewUser, setPreviewUser] = useState<any>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");

  const previewCampaignMutation = useMutation({
    mutationFn: async (data: { templateId: string; recipientType: string; recipientIds?: number[] }) => {
      return apiRequest("POST", "/api/email/campaigns/preview", data);
    },
    onSuccess: (data) => {
      if (data.success) {
        setPreviewContent(data.preview.htmlContent);
        setPreviewUser(data.sampleUser);
        setIsPreviewOpen(true);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Preview Error",
        description: error.message || "Failed to generate preview",
        variant: "destructive",
      });
    },
  });

  // Get campaign recipients
  const { data: campaignRecipients } = useQuery({
    queryKey: ["/api/email/campaigns", selectedCampaignId, "recipients"],
    enabled: !!selectedCampaignId,
    retry: false,
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/email/campaigns", data);
    },
    onSuccess: (data) => {
      toast({
        title: "Campaign Created",
        description: `Campaign "${data.name}" has been created successfully`,
      });
      setCampaignOpen(false);
      setCampaignData({
        name: "",
        templateId: "",
        recipientType: "all_users",
        organizationIds: [],
        userIds: [],
        scheduledAt: ""
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/campaigns"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Campaign",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const sendCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      return apiRequest("POST", `/api/email/campaigns/${campaignId}/send`);
    },
    onSuccess: (data) => {
      toast({
        title: "Campaign Sent Successfully",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/campaigns"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Campaign",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleCreateCampaign = () => {
    if (!campaignData.name || !campaignData.templateId) {
      toast({
        title: "Invalid Input",
        description: "Please provide campaign name and select a template",
        variant: "destructive",
      });
      return;
    }

    const recipients = {
      type: campaignData.recipientType,
      ...(campaignData.recipientType === 'organization' && { organizationIds: campaignData.organizationIds.map(Number) }),
      ...(campaignData.recipientType === 'specific_users' && { userIds: campaignData.userIds.map(Number) })
    };

    createCampaignMutation.mutate({
      name: campaignData.name,
      templateId: campaignData.templateId,
      recipients,
      scheduledAt: campaignData.scheduledAt || null,
      status: campaignData.scheduledAt ? 'scheduled' : 'draft'
    });
  };

  const handleSendCampaign = (campaignId: string) => {
    sendCampaignMutation.mutate(campaignId);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'promotional': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'newsletter': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'notification': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'welcome': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'sending': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const previewTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    setPreviewOpen(true);
  };

  const defaultTemplates = [
    {
      id: 'welcome_template',
      name: 'Welcome Email',
      subject: 'Welcome to AI Agent Platform',
      category: 'welcome' as const,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'newsletter_template',
      name: 'Monthly Newsletter',
      subject: 'AI Insights & Platform Updates',
      category: 'newsletter' as const,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'promotion_template',
      name: 'Special Promotion',
      subject: 'Limited Time: 50% Off Premium Features',
      category: 'promotional' as const,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];

  const displayTemplates = templates.length > 0 ? templates : defaultTemplates;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Email Templates</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Create beautiful email campaigns with Apple-inspired design
          </p>
        </div>
        <div className="flex gap-3">
          <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
            <DialogTrigger asChild>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Email Campaign</DialogTitle>
                <DialogDescription>
                  Set up a new email campaign to send to your users
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input
                    id="campaign-name"
                    value={campaignData.name}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter campaign name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-select">Email Template</Label>
                  <Select
                    value={campaignData.templateId}
                    onValueChange={(value) => setCampaignData(prev => ({ ...prev, templateId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {displayTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipient-type">Recipients</Label>
                  <Select
                    value={campaignData.recipientType}
                    onValueChange={(value) => setCampaignData(prev => ({ ...prev, recipientType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_users">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          All Users
                        </div>
                      </SelectItem>
                      <SelectItem value="organization">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          Specific Organizations
                        </div>
                      </SelectItem>
                      <SelectItem value="specific_users">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Specific Users
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduled-at">Schedule (Optional)</Label>
                  <Input
                    id="scheduled-at"
                    type="datetime-local"
                    value={campaignData.scheduledAt}
                    onChange={(e) => setCampaignData(prev => ({ ...prev, scheduledAt: e.target.value }))}
                  />
                </div>

                <Button
                  onClick={handleCreateCampaign}
                  disabled={createCampaignMutation.isPending}
                  className="w-full"
                >
                  {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={templateFormOpen} onOpenChange={setTemplateFormOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Email Template</DialogTitle>
                <DialogDescription>
                  Design a new email template with our Apple-inspired editor
                </DialogDescription>
              </DialogHeader>
              <div className="text-center py-8 text-gray-500">
                Template editor will be available once you provide SMTP credentials
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className={getCategoryColor(template.category)}>
                      {template.category}
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => previewTemplate(template.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {template.subject}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Updated {new Date(template.updatedAt).toLocaleDateString()}</span>
                    <Badge variant={template.isActive ? "default" : "secondary"}>
                      {template.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <div className="space-y-4">
            {campaigns.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No campaigns yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Create your first email campaign to start engaging with your users
                  </p>
                  <Button onClick={() => setCampaignOpen(true)}>
                    <Send className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                </CardContent>
              </Card>
            ) : (
              campaigns.map((campaign: EmailCampaign) => (
                <Card key={campaign.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{campaign.name}</h3>
                          <Badge className={getStatusColor(campaign.status)}>
                            {campaign.status}
                          </Badge>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-3">
                          {campaign.subject}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Recipients:</span>
                            <div className="font-medium">{campaign.stats.totalRecipients}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Sent:</span>
                            <div className="font-medium">{campaign.stats.sent}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Delivered:</span>
                            <div className="font-medium">{campaign.stats.delivered}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Opened:</span>
                            <div className="font-medium">{campaign.stats.opened}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Clicked:</span>
                            <div className="font-medium">{campaign.stats.clicked}</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {campaign.status === 'draft' && (
                          <Button
                            onClick={() => handleSendCampaign(campaign.id)}
                            disabled={sendCampaignMutation.isPending}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Send Now
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Template Preview</DialogTitle>
            <DialogDescription>
              Preview how your email will look with both light and dark themes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <Tabs defaultValue="light" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="light">Light Theme</TabsTrigger>
                <TabsTrigger value="dark">Dark Theme</TabsTrigger>
              </TabsList>
              <TabsContent value="light" className="border rounded-lg p-4 bg-white">
                <div className="text-center py-8 text-gray-500">
                  Email preview will be available once templates are loaded
                </div>
              </TabsContent>
              <TabsContent value="dark" className="border rounded-lg p-4 bg-gray-900">
                <div className="text-center py-8 text-gray-400">
                  Email preview will be available once templates are loaded
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}