import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Text,
    Button,
    Heading,
    Hr,
    Link,
} from "@react-email/components";
import * as React from "react";
import env from "../config/env";

export function ForgotPassword(username: string, token: string) {
    const url = `${env.APP_URL}/verify-email?token=${token}`;

    return (
        <Html>
            <Head />
            <Body
                style={{
                    backgroundColor: "#f6f9fc",
                    fontFamily: "Arial, sans-serif",
                    padding: "40px 0",
                }}
            >
                <Container
                    style={{
                        backgroundColor: "#ffffff",
                        padding: "40px",
                        borderRadius: "8px",
                        maxWidth: "480px",
                        margin: "0 auto",
                    }}
                >
                    <Heading style={{ fontSize: "24px", marginBottom: "10px" }}>
                        Reset your password
                    </Heading>

                    <Text style={{ fontSize: "16px", color: "#444" }}>
                        Hi <strong>{username}</strong>,
                    </Text>

                    <Text style={{ fontSize: "16px", color: "#444" }}>
                        We received a request to reset your password. Click the button below
                        to continue.
                    </Text>

                    <Section style={{ textAlign: "center", margin: "30px 0" }}>
                        <Button
                            href={url}
                            style={{
                                backgroundColor: "#000",
                                color: "#fff",
                                padding: "12px 24px",
                                borderRadius: "6px",
                                fontSize: "16px",
                                textDecoration: "none",
                            }}
                        >
                            Reset Password
                        </Button>
                    </Section>

                    <Text style={{ fontSize: "14px", color: "#666" }}>
                        If the button doesn't work, copy and paste this link into your
                        browser:
                    </Text>

                    <Link
                        href={url}
                        style={{
                            fontSize: "14px",
                            color: "#2754C5",
                            wordBreak: "break-all",
                        }}
                    >
                        {url}
                    </Link>

                    <Hr style={{ margin: "30px 0", borderColor: "#eee" }} />

                    <Text style={{ fontSize: "13px", color: "#888" }}>
                        This link will expire in 15 minutes. If you didn’t request a password
                        reset, you can safely ignore this email.
                    </Text>
                </Container>
            </Body>
        </Html>
    );
}