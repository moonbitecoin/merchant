/**
 * Email Service
 * Sends transactional emails via SMTP (Mailpit in dev, SES/Sendgrid in prod)
 */

import nodemailer from 'nodemailer';

export interface EmailServiceConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  from: {
    name: string;
    email: string;
  };
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(config: EmailServiceConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(recipientEmail: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/verify?token=${token}`;

    const html = `
      <h2>Verify Your Email</h2>
      <p>Thank you for registering with MoonBite Merchant Hub!</p>
      <p>Please verify your email address to complete your registration:</p>
      <p><a href="${verificationUrl}" style="background-color: #000; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a></p>
      <p>Or copy this link: ${verificationUrl}</p>
      <p>This link expires in 24 hours.</p>
      <hr />
      <p><small>If you didn't register for MoonBite, please ignore this email.</small></p>
    `;

    await this.send({
      to: recipientEmail,
      subject: 'Verify Your MoonBite Account',
      html,
      text: `Verify your email: ${verificationUrl}`,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(recipientEmail: string, token: string): Promise<void> {
    const resetUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password?token=${token}`;

    const html = `
      <h2>Reset Your Password</h2>
      <p>We received a request to reset your password. Click the link below:</p>
      <p><a href="${resetUrl}" style="background-color: #000; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
      <p>Or copy this link: ${resetUrl}</p>
      <p>This link expires in 1 hour.</p>
      <hr />
      <p><small>If you didn't request a password reset, please ignore this email.</small></p>
    `;

    await this.send({
      to: recipientEmail,
      subject: 'Reset Your MoonBite Password',
      html,
      text: `Reset your password: ${resetUrl}`,
    });
  }

  /**
   * Send login notification (for suspicious activity)
   */
  async sendLoginNotification(recipientEmail: string, ipAddress: string): Promise<void> {
    const html = `
      <h2>New Login to Your Account</h2>
      <p>Your MoonBite account was just accessed from:</p>
      <p><strong>IP Address:</strong> ${ipAddress}</p>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      <p>If this wasn't you, please change your password immediately.</p>
      <hr />
      <p><small>For security, we only send this email from new locations.</small></p>
    `;

    await this.send({
      to: recipientEmail,
      subject: 'New Login to Your MoonBite Account',
      html,
      text: `New login from ${ipAddress}`,
    });
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmation(
    recipientEmail: string,
    productName: string,
    amount: string,
    downloadUrl: string
  ): Promise<void> {
    const html = `
      <h2>Payment Confirmed!</h2>
      <p>Thank you for your purchase of <strong>${productName}</strong>.</p>
      <p><strong>Amount:</strong> ${amount} MBITE</p>
      <p>Your file is ready to download:</p>
      <p><a href="${downloadUrl}" style="background-color: #000; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Download Your File</a></p>
      <p>The download link expires in 24 hours and is restricted to your IP address.</p>
      <hr />
      <p><small>Thank you for supporting this merchant!</small></p>
    `;

    await this.send({
      to: recipientEmail,
      subject: `Your Purchase: ${productName}`,
      html,
      text: `Download your file: ${downloadUrl}`,
    });
  }

  /**
   * Send payout notification
   */
  async sendPayoutNotification(
    merchantEmail: string,
    amount: string,
    wallet: string
  ): Promise<void> {
    const html = `
      <h2>Payout Processed</h2>
      <p>Your payout has been successfully processed.</p>
      <p><strong>Amount:</strong> ${amount} MBITE</p>
      <p><strong>Wallet:</strong> ${wallet}</p>
      <p>The funds should arrive within a few minutes.</p>
      <hr />
      <p>Log in to your dashboard to view more details.</p>
    `;

    await this.send({
      to: merchantEmail,
      subject: 'Payout Processed',
      html,
      text: `Payout of ${amount} MBITE processed to ${wallet}`,
    });
  }

  /**
   * Generic send email
   */
  private async send(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      // Don't throw - email failures shouldn't break the flow
      // Queue for retry in production
    }
  }

  /**
   * Verify transporter connection
   */
  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email service verification failed:', error);
      return false;
    }
  }
}

/**
 * Create email service from environment
 */
export function createEmailService(): EmailService {
  return new EmailService({
    host: process.env.MAILPIT_HOST || 'localhost',
    port: parseInt(process.env.MAILPIT_PORT || '1025', 10),
    secure: false, // Mailpit doesn't use SSL
    from: {
      name: process.env.SMTP_FROM_NAME || 'MoonBite',
      email: process.env.SMTP_FROM_EMAIL || 'noreply@moonbite.org',
    },
  });
}
