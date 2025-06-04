import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as AppleStrategy } from 'passport-apple';
import passport from 'passport';
import { storage } from '../storage';
import { EmailService } from './email-service';

export class OAuthService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
    this.setupStrategies();
  }

  private setupStrategies() {
    // Google OAuth Strategy
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: "/api/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found in Google profile'));
        }

        // Check if user exists
        let user = await storage.getUserByEmail(email);
        
        if (!user) {
          // Auto-register under super client
          const superClient = await this.getSuperClient();
          user = await storage.createUser({
            username: email,
            email: email,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            organizationId: superClient.id,
            globalRole: 'user',
            isActive: true,
            provider: 'google',
            providerId: profile.id,
            profileImage: profile.photos?.[0]?.value
          });

          // Send welcome email
          await this.emailService.sendWelcomeEmail(user);
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }));

    // Apple OAuth Strategy
    passport.use(new AppleStrategy({
      clientID: process.env.APPLE_CLIENT_ID!,
      teamID: process.env.APPLE_TEAM_ID!,
      callbackURL: "/api/auth/apple/callback",
      keyID: process.env.APPLE_KEY_ID!,
      privateKeyString: process.env.APPLE_PRIVATE_KEY!
    }, async (accessToken, refreshToken, idToken, profile, done) => {
      try {
        const email = profile.email;
        if (!email) {
          return done(new Error('No email found in Apple profile'));
        }

        let user = await storage.getUserByEmail(email);
        
        if (!user) {
          const superClient = await this.getSuperClient();
          user = await storage.createUser({
            username: email,
            email: email,
            firstName: profile.name?.firstName,
            lastName: profile.name?.lastName,
            organizationId: superClient.id,
            globalRole: 'user',
            isActive: true,
            provider: 'apple',
            providerId: profile.sub
          });

          await this.emailService.sendWelcomeEmail(user);
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }));
  }

  private async getSuperClient() {
    // Get or create the super client organization
    let superClient = await storage.getOrganizationByName('Super Client');
    
    if (!superClient) {
      superClient = await storage.createOrganization({
        name: 'Super Client',
        description: 'Default organization for OAuth users',
        settings: {
          type: 'super_client',
          autoRegister: true,
          defaultCredits: 1000
        },
        isActive: true
      });
    }

    return superClient;
  }

  async handleUserActivation(token: string) {
    const user = await storage.getUserByActivationToken(token);
    if (!user) {
      throw new Error('Invalid activation token');
    }

    await storage.activateUser(user.id);
    return user;
  }
}