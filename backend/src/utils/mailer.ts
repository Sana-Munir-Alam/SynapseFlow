import { Resend } from "resend";
import env from "../config/env";
import { ForgotPassword } from "../emails/forgotPassword";

const resend = new Resend(env.RESEND_API_KEY);

export const sendForgotPasswordEmail = async (email: string, username: string, token: string) => {
    return await resend.emails.send({
        from: env.MAIL_SENDER,
        to:  email,
        subject: 'Reset your Password',
        react: ForgotPassword(username, token),
    });
}