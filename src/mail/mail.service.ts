import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendTestEmail(to: string) {
    await this.mailerService.sendMail({
      to,
      subject: '✅ Test email NestJS',
      html: `
        <h2>Test réussi 🎉</h2>
        <p>Ton application NestJS en local envoie des emails.</p>
        <p><b>Port :</b> localhost:3000</p>
      `,
    });
  }

  async sendVerificationEmail(to: string, code: string) {
    await this.mailerService.sendMail({
      to,
      subject: '🔐 Vérification de votre email - DEC Learning',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb; text-align: center;">DEC Learning</h1>
          <h2 style="color: #1f2937;">Vérification de votre adresse email</h2>
          <p style="color: #4b5563; font-size: 16px;">
            Bienvenue sur DEC Learning ! Pour finaliser votre inscription, veuillez utiliser le code de vérification ci-dessous :
          </p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 4px;">${code}</span>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Ce code expire dans 1 heure. Si vous n'avez pas créé de compte sur DEC Learning, ignorez cet email.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} DEC Learning - Préparation au Diplôme d'Expertise Comptable
          </p>
        </div>
      `,
    });
  }

  async sendPasswordResetEmail(to: string, resetLink: string) {
    await this.mailerService.sendMail({
      to,
      subject: '🔑 Réinitialisation de votre mot de passe - DEC Learning',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb; text-align: center;">DEC Learning</h1>
          <h2 style="color: #1f2937;">Réinitialisation de votre mot de passe</h2>
          <p style="color: #4b5563; font-size: 16px;">
            Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Réinitialiser mon mot de passe
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
            <a href="${resetLink}" style="color: #2563eb; word-break: break-all;">${resetLink}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} DEC Learning - Préparation au Diplôme d'Expertise Comptable
          </p>
        </div>
      `,
    });
  }
}
