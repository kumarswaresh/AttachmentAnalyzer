import { storage } from '../storage';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  category: 'promotional' | 'newsletter' | 'notification' | 'welcome';
  isActive: boolean;
  previewData: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number;
}

export interface EmailCampaign {
  id: string;
  name: string;
  templateId: string;
  subject: string;
  recipients: {
    type: 'all_users' | 'organization' | 'specific_users';
    organizationIds?: number[];
    userIds?: number[];
  };
  scheduledAt?: Date;
  sentAt?: Date;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  stats: {
    totalRecipients: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
  };
  createdAt: Date;
  createdBy: number;
}

export class EmailTemplateService {
  private getAppleLikeTemplate(content: {
    title: string;
    subtitle?: string;
    bodyContent: string;
    ctaText?: string;
    ctaUrl?: string;
    footerText?: string;
  }): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="color-scheme" content="light dark">
        <title>${content.title}</title>
        <style>
            :root {
                color-scheme: light dark;
                --bg-primary: #ffffff;
                --bg-secondary: #f5f5f7;
                --text-primary: #1d1d1f;
                --text-secondary: #86868b;
                --accent-color: #007AFF;
                --border-color: #d2d2d7;
                --shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
            }

            @media (prefers-color-scheme: dark) {
                :root {
                    --bg-primary: #000000;
                    --bg-secondary: #1c1c1e;
                    --text-primary: #ffffff;
                    --text-secondary: #8e8e93;
                    --accent-color: #0a84ff;
                    --border-color: #38383a;
                    --shadow: 0 4px 16px rgba(255, 255, 255, 0.1);
                }
            }

            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: var(--text-primary);
                background-color: var(--bg-secondary);
                padding: 20px;
            }

            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: var(--bg-primary);
                border-radius: 16px;
                overflow: hidden;
                box-shadow: var(--shadow);
            }

            .header {
                background: linear-gradient(135deg, var(--accent-color), #5856d6);
                padding: 40px 30px;
                text-align: center;
                color: white;
            }

            .logo {
                font-size: 24px;
                font-weight: 700;
                margin-bottom: 8px;
                letter-spacing: -0.5px;
            }

            .header-subtitle {
                opacity: 0.9;
                font-size: 16px;
                font-weight: 400;
            }

            .content {
                padding: 40px 30px;
            }

            .title {
                font-size: 28px;
                font-weight: 700;
                color: var(--text-primary);
                margin-bottom: 12px;
                letter-spacing: -0.5px;
                line-height: 1.2;
            }

            .subtitle {
                font-size: 18px;
                color: var(--text-secondary);
                margin-bottom: 32px;
                font-weight: 400;
            }

            .body-content {
                font-size: 16px;
                color: var(--text-primary);
                margin-bottom: 32px;
                line-height: 1.6;
            }

            .body-content p {
                margin-bottom: 16px;
            }

            .cta-container {
                text-align: center;
                margin: 40px 0;
            }

            .cta-button {
                display: inline-block;
                background: var(--accent-color);
                color: white;
                text-decoration: none;
                padding: 16px 32px;
                border-radius: 12px;
                font-weight: 600;
                font-size: 16px;
                transition: all 0.3s ease;
                border: none;
                cursor: pointer;
            }

            .cta-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0, 122, 255, 0.3);
            }

            .divider {
                height: 1px;
                background: var(--border-color);
                margin: 40px 0;
            }

            .footer {
                background-color: var(--bg-secondary);
                padding: 30px;
                text-align: center;
                border-top: 1px solid var(--border-color);
            }

            .footer-text {
                color: var(--text-secondary);
                font-size: 14px;
                line-height: 1.5;
                margin-bottom: 16px;
            }

            .social-links {
                margin: 20px 0;
            }

            .social-link {
                display: inline-block;
                margin: 0 12px;
                color: var(--text-secondary);
                text-decoration: none;
                font-size: 14px;
                font-weight: 500;
            }

            .unsubscribe {
                color: var(--text-secondary);
                font-size: 12px;
                text-decoration: none;
                margin-top: 16px;
                display: inline-block;
            }

            @media (max-width: 600px) {
                body {
                    padding: 10px;
                }

                .container {
                    border-radius: 8px;
                }

                .header,
                .content {
                    padding: 24px 20px;
                }

                .title {
                    font-size: 24px;
                }

                .subtitle {
                    font-size: 16px;
                }

                .cta-button {
                    display: block;
                    width: 100%;
                    margin: 0 auto;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🤖 AI Agent Platform</div>
                <div class="header-subtitle">Intelligent automation for the modern enterprise</div>
            </div>
            
            <div class="content">
                <h1 class="title">${content.title}</h1>
                ${content.subtitle ? `<p class="subtitle">${content.subtitle}</p>` : ''}
                
                <div class="body-content">
                    ${content.bodyContent}
                </div>
                
                ${content.ctaText && content.ctaUrl ? `
                <div class="cta-container">
                    <a href="${content.ctaUrl}" class="cta-button">${content.ctaText}</a>
                </div>
                ` : ''}
            </div>
            
            <div class="footer">
                <div class="footer-text">
                    ${content.footerText || 'Thank you for being part of our AI-powered future.'}
                </div>
                
                <div class="social-links">
                    <a href="#" class="social-link">Blog</a>
                    <a href="#" class="social-link">Documentation</a>
                    <a href="#" class="social-link">Support</a>
                    <a href="#" class="social-link">Community</a>
                </div>
                
                <a href="#" class="unsubscribe">Unsubscribe from these emails</a>
            </div>
        </div>
    </body>
    </html>`;
  }

  async createTemplate(templateData: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailTemplate> {
    const template: EmailTemplate = {
      id: `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...templateData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await storage.createEmailTemplate(template);
    return template;
  }

  async getTemplate(id: string): Promise<EmailTemplate | null> {
    return await storage.getEmailTemplate(id);
  }

  async getAllTemplates(): Promise<EmailTemplate[]> {
    return await storage.getAllEmailTemplates();
  }

  async updateTemplate(id: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate | null> {
    const template = await storage.getEmailTemplate(id);
    if (!template) return null;

    const updatedTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date()
    };

    await storage.updateEmailTemplate(id, updatedTemplate);
    return updatedTemplate;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    return await storage.deleteEmailTemplate(id);
  }

  async renderTemplate(templateId: string, data: Record<string, any>): Promise<string> {
    const template = await storage.getEmailTemplate(templateId);
    if (!template) throw new Error('Template not found');

    let html = template.htmlContent;
    
    // Replace variables in template
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, data[key] || '');
    });

    return html;
  }

  async createCampaign(campaignData: Omit<EmailCampaign, 'id' | 'createdAt' | 'stats'>): Promise<EmailCampaign> {
    const campaign: EmailCampaign = {
      id: `camp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...campaignData,
      stats: {
        totalRecipients: 0,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        failed: 0
      },
      createdAt: new Date()
    };

    await storage.createEmailCampaign(campaign);
    return campaign;
  }

  async sendCampaign(campaignId: string): Promise<{ success: boolean; message: string; stats: any }> {
    const campaign = await storage.getEmailCampaign(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const template = await storage.getEmailTemplate(campaign.templateId);
    if (!template) throw new Error('Template not found');

    // Get recipients based on campaign settings
    const recipients = await this.getRecipients(campaign.recipients);
    
    campaign.stats.totalRecipients = recipients.length;
    campaign.status = 'sending';
    
    await storage.updateEmailCampaign(campaignId, campaign);

    // Simulate email sending process
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      try {
        // In real implementation, this would send actual emails
        const personalizedContent = await this.renderTemplate(campaign.templateId, {
          firstName: recipient.firstName || 'Valued Customer',
          email: recipient.email,
          unsubscribeUrl: `${process.env.APP_URL}/unsubscribe?token=${recipient.id}`,
          blogUrl: `${process.env.APP_URL}/blog`,
          ...template.previewData
        });

        // Simulate email sending with 95% success rate
        if (Math.random() > 0.05) {
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }
    }

    // Update campaign stats
    campaign.stats.sent = sent;
    campaign.stats.failed = failed;
    campaign.stats.delivered = sent; // Simplified for demo
    campaign.status = 'sent';
    campaign.sentAt = new Date();

    await storage.updateEmailCampaign(campaignId, campaign);

    return {
      success: true,
      message: `Campaign sent successfully to ${sent} recipients`,
      stats: campaign.stats
    };
  }

  private async getRecipients(recipientConfig: EmailCampaign['recipients']): Promise<any[]> {
    switch (recipientConfig.type) {
      case 'all_users':
        return await storage.getAllUsers();
      
      case 'organization':
        if (!recipientConfig.organizationIds) return [];
        return await storage.getUsersByOrganizations(recipientConfig.organizationIds);
      
      case 'specific_users':
        if (!recipientConfig.userIds) return [];
        return await storage.getUsersByIds(recipientConfig.userIds);
      
      default:
        return [];
    }
  }

  async getDefaultTemplates(): Promise<EmailTemplate[]> {
    return [
      {
        id: 'welcome_template',
        name: 'Welcome Email',
        subject: 'Welcome to AI Agent Platform',
        category: 'welcome',
        isActive: true,
        htmlContent: this.getAppleLikeTemplate({
          title: 'Welcome to the Future of AI',
          subtitle: 'Your journey with intelligent automation begins now',
          bodyContent: `
            <p>Thank you for joining AI Agent Platform. You're now part of a revolutionary ecosystem that's transforming how businesses operate with artificial intelligence.</p>
            
            <p><strong>What's next?</strong></p>
            <ul style="margin-left: 20px; margin-bottom: 20px;">
              <li>Explore our getting started guide</li>
              <li>Build your first AI agent</li>
              <li>Join our community of innovators</li>
            </ul>
            
            <p>We're excited to see what you'll create with the power of AI automation.</p>
          `,
          ctaText: 'Start Building',
          ctaUrl: '{{dashboardUrl}}',
          footerText: 'Ready to revolutionize your workflow? Let\'s build the future together.'
        }),
        textContent: 'Welcome to AI Agent Platform...',
        previewData: {
          firstName: 'John',
          dashboardUrl: `${process.env.APP_URL}/dashboard`
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 1
      },
      {
        id: 'newsletter_template',
        name: 'Monthly Newsletter',
        subject: 'AI Insights & Platform Updates',
        category: 'newsletter',
        isActive: true,
        htmlContent: this.getAppleLikeTemplate({
          title: 'AI Insights & Updates',
          subtitle: 'The latest in artificial intelligence and platform features',
          bodyContent: `
            <p>This month brings exciting developments in AI automation and new platform capabilities.</p>
            
            <h3 style="color: var(--text-primary); margin: 24px 0 12px 0;">🚀 New Features</h3>
            <p>• Advanced agent chaining for complex workflows<br>
            • Enhanced security with enterprise-grade encryption<br>
            • Improved analytics dashboard with real-time insights</p>
            
            <h3 style="color: var(--text-primary); margin: 24px 0 12px 0;">📖 Featured Article</h3>
            <p>Learn how leading companies are using AI agents to automate customer service and increase satisfaction by 40%.</p>
          `,
          ctaText: 'Read Full Article',
          ctaUrl: '{{blogUrl}}',
          footerText: 'Stay ahead of the AI revolution with insights from industry leaders.'
        }),
        textContent: 'AI Insights & Platform Updates...',
        previewData: {
          blogUrl: `${process.env.APP_URL}/blog/ai-customer-service-automation`
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 1
      },
      {
        id: 'promotion_template',
        name: 'Special Promotion',
        subject: 'Limited Time: 50% Off Premium Features',
        category: 'promotional',
        isActive: true,
        htmlContent: this.getAppleLikeTemplate({
          title: 'Limited Time Offer',
          subtitle: 'Unlock premium AI capabilities with 50% off',
          bodyContent: `
            <p>For a limited time, we're offering 50% off all premium features to help you accelerate your AI automation journey.</p>
            
            <div style="background: var(--bg-secondary); padding: 20px; border-radius: 12px; margin: 24px 0;">
              <h4 style="margin: 0 0 12px 0; color: var(--accent-color);">Premium Features Include:</h4>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Advanced AI models (GPT-4, Claude)</li>
                <li>Unlimited agent deployments</li>
                <li>Priority support</li>
                <li>Custom integrations</li>
              </ul>
            </div>
            
            <p><strong>Offer expires in 7 days.</strong> Don't miss this opportunity to supercharge your automation.</p>
          `,
          ctaText: 'Claim 50% Discount',
          ctaUrl: '{{upgradeUrl}}',
          footerText: 'This exclusive offer is available to valued customers like you.'
        }),
        textContent: 'Limited time 50% off premium features...',
        previewData: {
          upgradeUrl: `${process.env.APP_URL}/billing?promo=SAVE50`
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 1
      }
    ];
  }
}