import nodemailer from 'nodemailer';
import crypto from 'crypto';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendWelcomeEmail(user: any) {
    const activationToken = crypto.randomBytes(32).toString('hex');
    
    // Store activation token in database
    await this.storeActivationToken(user.id, activationToken);

    const activationLink = `${process.env.APP_URL}/activate?token=${activationToken}`;
    
    const html = this.generateWelcomeEmailHTML(user, activationLink);

    const mailOptions = {
      from: `"AI Agent Platform" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Welcome to AI Agent Platform - Activate Your Account',
      html: html
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Welcome email sent to ${user.email}`);
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw error;
    }
  }

  async sendClientOnboardingEmail(clientEmail: string, clientName: string, adminCredentials: any) {
    const html = this.generateClientOnboardingHTML(clientName, adminCredentials);

    const mailOptions = {
      from: `"AI Agent Platform" <${process.env.SMTP_USER}>`,
      to: clientEmail,
      subject: 'Welcome to AI Agent Platform - Your Organization is Ready',
      html: html
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Client onboarding email sent to ${clientEmail}`);
    } catch (error) {
      console.error('Error sending client onboarding email:', error);
      throw error;
    }
  }

  private generateWelcomeEmailHTML(user: any, activationLink: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Welcome to AI Agent Platform</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
            .logo { color: white; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .header-text { color: rgba(255,255,255,0.9); font-size: 16px; }
            .content { padding: 40px 30px; }
            .welcome-text { font-size: 24px; font-weight: 600; color: #2d3748; margin-bottom: 20px; }
            .message { font-size: 16px; color: #4a5568; margin-bottom: 30px; line-height: 1.7; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; transition: all 0.3s ease; }
            .cta-button:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3); }
            .features { margin: 40px 0; }
            .feature { display: flex; align-items: center; margin-bottom: 20px; }
            .feature-icon { width: 40px; height: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; margin-right: 15px; }
            .feature-text { flex: 1; }
            .feature-title { font-weight: 600; color: #2d3748; margin-bottom: 5px; }
            .feature-desc { color: #718096; font-size: 14px; }
            .footer { background: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
            .footer-text { color: #718096; font-size: 14px; }
            .social-links { margin: 20px 0; }
            .social-link { display: inline-block; margin: 0 10px; color: #667eea; text-decoration: none; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🤖 AI Agent Platform</div>
                <div class="header-text">Intelligent automation for the modern enterprise</div>
            </div>
            
            <div class="content">
                <div class="welcome-text">Welcome${user.firstName ? `, ${user.firstName}` : ''}!</div>
                
                <div class="message">
                    Thank you for joining AI Agent Platform. You're now part of a revolutionary platform that empowers organizations to build, deploy, and manage intelligent AI agents at scale.
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${activationLink}" class="cta-button">Activate Your Account</a>
                </div>
                
                <div class="features">
                    <div class="feature">
                        <div class="feature-icon">🚀</div>
                        <div class="feature-text">
                            <div class="feature-title">Quick Setup</div>
                            <div class="feature-desc">Get started in minutes with our intuitive agent builder</div>
                        </div>
                    </div>
                    
                    <div class="feature">
                        <div class="feature-icon">🔧</div>
                        <div class="feature-text">
                            <div class="feature-title">Powerful Tools</div>
                            <div class="feature-desc">Access enterprise-grade AI models and integrations</div>
                        </div>
                    </div>
                    
                    <div class="feature">
                        <div class="feature-icon">📊</div>
                        <div class="feature-text">
                            <div class="feature-title">Analytics & Insights</div>
                            <div class="feature-desc">Monitor performance and optimize your AI workflows</div>
                        </div>
                    </div>
                    
                    <div class="feature">
                        <div class="feature-icon">🔒</div>
                        <div class="feature-text">
                            <div class="feature-title">Enterprise Security</div>
                            <div class="feature-desc">Bank-level security with role-based access controls</div>
                        </div>
                    </div>
                </div>
                
                <div class="message">
                    <strong>What's next?</strong><br>
                    1. Click the activation button above<br>
                    2. Complete your profile setup<br>
                    3. Start building your first AI agent<br>
                    4. Explore our template library for quick starts
                </div>
            </div>
            
            <div class="footer">
                <div class="social-links">
                    <a href="#" class="social-link">Documentation</a> |
                    <a href="#" class="social-link">Support</a> |
                    <a href="#" class="social-link">Community</a>
                </div>
                <div class="footer-text">
                    If you have any questions, our support team is here to help.<br>
                    © 2025 AI Agent Platform. All rights reserved.
                </div>
            </div>
        </div>
    </body>
    </html>`;
  }

  private generateClientOnboardingHTML(clientName: string, adminCredentials: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Welcome to AI Agent Platform</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
            .logo { color: white; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .content { padding: 40px 30px; }
            .credentials-box { background: #f8f9fa; border: 2px solid #e9ecef; border-radius: 12px; padding: 25px; margin: 25px 0; }
            .credential-item { margin-bottom: 15px; }
            .credential-label { font-weight: 600; color: #495057; margin-bottom: 5px; }
            .credential-value { background: white; padding: 12px; border-radius: 6px; border: 1px solid #dee2e6; font-family: monospace; font-size: 14px; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0; color: #856404; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🤖 AI Agent Platform</div>
            </div>
            
            <div class="content">
                <h2>Welcome to AI Agent Platform, ${clientName}!</h2>
                
                <p>Your organization has been successfully set up on our platform. Below are your admin credentials to get started:</p>
                
                <div class="credentials-box">
                    <div class="credential-item">
                        <div class="credential-label">Organization Admin Email:</div>
                        <div class="credential-value">${adminCredentials.email}</div>
                    </div>
                    <div class="credential-item">
                        <div class="credential-label">Temporary Password:</div>
                        <div class="credential-value">${adminCredentials.password}</div>
                    </div>
                    <div class="credential-item">
                        <div class="credential-label">Login URL:</div>
                        <div class="credential-value">${process.env.APP_URL}/login</div>
                    </div>
                </div>
                
                <div class="warning">
                    <strong>Important:</strong> Please change your password immediately after first login for security purposes.
                </div>
                
                <div style="text-align: center;">
                    <a href="${process.env.APP_URL}/login" class="cta-button">Access Your Platform</a>
                </div>
                
                <h3>Your Platform Includes:</h3>
                <ul>
                    <li>🤖 Unlimited AI agent creation</li>
                    <li>👥 User management and role-based access</li>
                    <li>🔗 Integration with popular business tools</li>
                    <li>📊 Advanced analytics and reporting</li>
                    <li>🔒 Enterprise-grade security</li>
                    <li>💬 24/7 priority support</li>
                </ul>
            </div>
        </div>
    </body>
    </html>`;
  }

  private async storeActivationToken(userId: number, token: string) {
    // Implementation depends on your database structure
    // This would typically store the token with an expiration date
    console.log(`Storing activation token for user ${userId}: ${token}`);
  }
}