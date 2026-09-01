import { useMemo } from 'react'
import { computed, createUserId, Tldraw } from 'tldraw'
import { useSync } from '@tldraw/sync'
import 'tldraw/tldraw.css'

type WhiteboardProps = {
    groupId: string
    userId: string
    userName: string
    userColor: string
}

const assets = {
    async upload(_asset: any, _file: any) {
        return { src: '' }
    },
    resolve(asset: any) {
        return asset.props.src
    },
}

export default function Whiteboard({ groupId, userId, userName, userColor }: WhiteboardProps) {

    const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000'
    const uri = `${WS_URL}/whiteboard/${groupId}`

    // Must be a stable reference — useSync's useEffect depends on this object.
    // If it changes, the entire sync connection is torn down and recreated.
    const users = useMemo(() => ({
        currentUser: computed('current-user', () => ({
            id: createUserId(userId),
            typeName: 'user' as const,
            name: userName,
            color: userColor,
            imageUrl: '',
            meta: {},
        })),
    }), [userId, userName, userColor])

    const store = useSync({ uri, assets, users });

    if (store.status === "loading") {
        return <div>Connecting to collaboration session...</div>;
    }

    if (store.status === "error") {
        return <div>Failed to connect: {store.error.message}</div>;
    }

    return <Tldraw store={store.store} licenseKey={import.meta.env.VITE_TLDRAW_LICENSE_KEY}/>;
}   