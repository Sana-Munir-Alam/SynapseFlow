import {Html, Head, Preview, Body, Container, Heading, Text, Hr,} from '@react-email/components'

type StudyReminderEmailProps = {
    username: string
    course: string
    status: 'missed' | 'less_than'
    scheduledHours: string
}

const StudyReminderEmail = ({ username, course, status, scheduledHours,}: StudyReminderEmailProps) => {
    const isMissed = status === 'missed'
    const statusText = isMissed ? `You missed a planned ${scheduledHours}-hour study session.` : `You studied less than the planned ${scheduledHours} hours.`

    return (
        <Html>
            <Head />
            <Preview>
                You're falling behind your SynapseFlow study plan
            </Preview>

            <Body
                style={{
                    backgroundColor: '#f5f5f5',
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    padding: '24px',
                }}
            >
                <Container
                    style={{
                        backgroundColor: '#ffffff',
                        maxWidth: '600px',
                        margin: '0 auto',
                        padding: '32px',
                        borderRadius: '12px',
                    }}
                >
                    <Heading
                        style={{
                            color: '#111111',
                            fontSize: '24px',
                            fontFamily: 'Arial, Helvetica, sans-serif',
                        }}
                    >
                        You're falling behind your study plan
                    </Heading>

                    <Text>
                        Hi {username},
                    </Text>

                    <Text>
                        SynapseFlow noticed that you may be
                        falling behind your planned study schedule
                        for <strong>{course}</strong>.
                    </Text>

                    <Text>
                        {statusText}
                    </Text>

                    <Hr />

                    <Text>
                        Don't worry — falling behind happens.
                        Open SynapseFlow to review your progress
                        and adjust your study plan if necessary.
                    </Text>

                    <Text
                        style={{
                            color: '#777777',
                            fontSize: '13px',
                            marginTop: '28px',
                        }}
                    >
                        SynapseFlow — Study smarter, together.
                    </Text>
                </Container>
            </Body>
        </Html>
    )
}

export default StudyReminderEmail