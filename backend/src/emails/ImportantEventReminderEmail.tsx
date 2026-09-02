import {Html, Head, Preview, Body, Container, Heading, Text, Hr,} from '@react-email/components'

type ImportantEventReminderEmailProps = {
    username: string
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

const EVENT_LABELS = {
    assignment: 'Assignment',
    quiz: 'Quiz',
    mid: 'Midterm',
    final: 'Final Exam',
    project: 'Project',
}

const ImportantEventReminderEmail = ({ username, title, course, type, date,}: ImportantEventReminderEmailProps) => {
    return (
        <Html>
            <Head />

            <Preview>
                Reminder: your {EVENT_LABELS[type].toLowerCase()} is due tomorrow
            </Preview>

            <Body
                style={{
                    backgroundColor: '#f5f5f5',
                    fontFamily:
                        'Arial, Helvetica, sans-serif',
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
                        }}
                    >
                        {EVENT_LABELS[type]} reminder
                    </Heading>

                    <Text>
                        Hi {username},
                    </Text>

                    <Text>
                        Your upcoming{' '}
                        <strong>
                            {EVENT_LABELS[type].toLowerCase()}
                        </strong>{' '}
                        is due tomorrow.
                    </Text>

                    <Hr />

                    <Text>
                        <strong>Title:</strong> {title}
                    </Text>

                    <Text>
                        <strong>Course:</strong> {course}
                    </Text>

                    <Text>
                        <strong>Date:</strong> {date}
                    </Text>

                    <Hr />

                    <Text>
                        Make sure you have enough time to review
                        and complete it.
                    </Text>

                    <Text
                        style={{
                            color: '#777777',
                            fontSize: '13px',
                            marginTop: '28px',
                        }}
                    >
                        Sent by SynapseFlow
                    </Text>
                </Container>
            </Body>
        </Html>
    )
}

export default ImportantEventReminderEmail