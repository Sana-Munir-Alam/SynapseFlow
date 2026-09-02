import { Resend } from "resend";
import env from "../config/env";
import { ForgotPassword } from "../emails/forgotPassword";
import StudyReminderEmail from '../emails/StudyReminderEmail'
import ImportantEventReminderEmail from '../emails/ImportantEventReminderEmail'

const resend = new Resend(env.RESEND_API_KEY);

export const sendForgotPasswordEmail = async (email: string, username: string, token: string) => {
    return await resend.emails.send({
        from: env.MAIL_SENDER,
        to:  email,
        subject: 'Reset your Password',
        react: ForgotPassword(username, token),
    });
}

export const sendStudyPlanBehindReminderEmail = async (
    email: string,
    username: string,
    course: string,
    status: 'missed' | 'less_than',
    scheduledHours: string
) => {
    console.log("Sending study reminder:", {
        to: email,
        username,
        course,
        status,
        scheduledHours,
    });
    const result = await resend.emails.send({
        from: env.MAIL_SENDER,
        to: email,
        subject: `You're falling behind in ${course}`,
        react: StudyReminderEmail({
            username,
            course,
            status,
            scheduledHours,
        }),
    });

    if (result.error) {
        console.error("Resend error:", result.error);
        throw new Error(result.error.message);
    }

    console.log("Resend success:", result.data);

    return result;
};

export const sendImportantEventReminderEmail = async (
    email: string,
    username: string,
    event: {
        title: string
        course: string
        type:
            | 'assignment'
            | 'quiz'
            | 'mid'
            | 'final'
            | 'project'
        date: string
    }
) => {
    const result = await resend.emails.send({
        from: env.MAIL_SENDER,
        to: email,
        subject: `Reminder: ${event.title} is due tomorrow`,
        react: ImportantEventReminderEmail({
            username,
            title: event.title,
            course: event.course,
            type: event.type,
            date: event.date,
        }),
    });

    if (result.error) {
        console.error("Resend error:", result.error);
        throw new Error(result.error.message);
    }

    console.log("Resend success:", result.data);

    return result;
};