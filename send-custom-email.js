import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import nodemailer from 'nodemailer';
import fs from 'fs';

// Cargamos tu llave de administrador existente
const serviceAccount = JSON.parse(
    fs.readFileSync('./serviceAccountKey.json', 'utf8')
);

initializeApp({
    credential: cert(serviceAccount)
});

// Configura tu servicio de correo (puedes usar Gmail con una contraseña de aplicación, SendGrid, Resend, etc.)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'tu-correo@gmail.com', // Coloca tu correo emisor
        pass: 'tu-contraseña-de-aplicacion' // Contraseña de aplicación de tu correo
    }
});

async function sendWideFormatVerificationEmail(emailTarget) {
    try {
        // 1. Generamos el enlace oficial de verificación de Firebase de forma segura
        const actionCodeSettings = {
            url: 'https://sistema-wide-format.vercel.app/login',
            handleCodeInApp: true,
        };
        const verificationLink = await getAuth().generateEmailVerificationLink(emailTarget, actionCodeSettings);

        // 2. Diseñamos la plantilla HTML con la identidad visual de Wide Format ERP
        const htmlTemplate = `
            <div style="background-color: #0f172a; color: #ffffff; padding: 40px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; border-radius: 12px; max-width: 600px; margin: auto; border: 1px solid #1e293b;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #10b981; margin: 0; font-size: 26px; font-weight: bold;">Wide Format ERP</h1>
                    <p style="color: #94a3b8; font-size: 13px; margin-top: 4px; letter-spacing: 1px;">TORRE DE CONTROL</p>
                </div>
                
                <div style="background-color: #1e293b; padding: 30px; border-radius: 8px; border: 1px solid #334155;">
                    <h2 style="color: #f8fafc; font-size: 18px; margin-top: 0; margin-bottom: 16px;">Verificación de cuenta requerida</h2>
                    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                        Hola, has iniciado el proceso de configuración de seguridad de dos pasos (2FA) en tu espacio de trabajo. Para proteger tus operaciones, por favor confirma tu dirección de correo electrónico haciendo clic en el siguiente botón:
                    </p>
                    
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${verificationLink}" style="background-color: #059669; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);">
                            Verificar mi Correo
                        </a>
                    </div>
                    
                    <p style="color: #64748b; font-size: 12px; line-height: 1.4; margin-top: 24px; border-top: 1px solid #334155; pt: 16px;">
                        Si no solicitaste este cambio o tienes dudas, puedes ignorar este mensaje de forma segura. El equipo de seguridad de Wide Format ERP.
                    </p>
                </div>
            </div>
        `;

        // 3. Enviamos el correo personalizado
        await transporter.sendMail({
            from: '"Wide Format ERP" <noreply@wideformat.com>',
            to: emailTarget,
            subject: 'Verifica tu cuenta - Wide Format ERP',
            html: htmlTemplate
        });

        console.log(`¡Correo con diseño corporativo enviado con éxito a ${emailTarget}!`);
    } catch (error) {
        console.error("Error al generar o enviar el correo de verificación:", error);
    }
}

// Ejecuta la función pasando el correo del usuario que necesita verificar su cuenta
sendWideFormatVerificationEmail('correo_del_usuario@gmail.com');