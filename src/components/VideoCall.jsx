import React, { useEffect, useRef, useState } from 'react';
import {
    FaMicrophone,
    FaMicrophoneSlash,
    FaVideo,
    FaVideoSlash,
    FaPhoneSlash,
    FaTimes
} from 'react-icons/fa';
import { io } from 'socket.io-client';
import './VideoCall.css';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:1337';

const VideoCall = ({ roomId, onClose }) => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const socketRef = useRef(null);
    const localStreamRef = useRef(null);
    const peersRef = useRef(new Map());
    const pendingCandidatesRef = useRef(new Map());

    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [status, setStatus] = useState('Starting camera...');
    const [remoteConnected, setRemoteConnected] = useState(false);
    const [permissionError, setPermissionError] = useState('');

    const getOrCreatePeer = (peerId) => {
        if (peersRef.current.has(peerId)) {
            return peersRef.current.get(peerId);
        }

        const peer = new RTCPeerConnection({
            iceServers: [
                {
                    urls: 'stun:stun.l.google.com:19302'
                },
                {
                    urls: 'stun:stun1.l.google.com:19302'
                }
            ]
        });

        const stream = localStreamRef.current;

        if (stream) {
            stream.getTracks().forEach((track) => {
                peer.addTrack(track, stream);
            });
        }

        peer.ontrack = (event) => {
            const remoteStream = event.streams[0];

            if (remoteVideoRef.current && remoteStream) {
                remoteVideoRef.current.srcObject = remoteStream;
                setRemoteConnected(true);
                setStatus('Connected');
            }
        };

        peer.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
                socketRef.current.emit('ice-candidate', {
                    target: peerId,
                    candidate: event.candidate
                });
            }
        };

        peer.onconnectionstatechange = () => {
            if (peer.connectionState === 'connected') {
                setRemoteConnected(true);
                setStatus('Connected');
            }

            if (
                peer.connectionState === 'failed' ||
                peer.connectionState === 'disconnected' ||
                peer.connectionState === 'closed'
            ) {
                setRemoteConnected(false);
            }
        };

        peersRef.current.set(peerId, peer);

        return peer;
    };

    const flushCandidates = async (peerId) => {
        const peer = peersRef.current.get(peerId);

        if (!peer) {
            return;
        }

        const candidates =
            pendingCandidatesRef.current.get(peerId) || [];

        for (const candidate of candidates) {
            try {
                await peer.addIceCandidate(
                    new RTCIceCandidate(candidate)
                );
            } catch (error) {
                console.error(error);
            }
        }

        pendingCandidatesRef.current.delete(peerId);
    };

    const createOffer = async (peerId) => {
        try {
            const peer = getOrCreatePeer(peerId);

            const offer = await peer.createOffer();

            await peer.setLocalDescription(offer);

            socketRef.current?.emit('offer', {
                target: peerId,
                offer
            });
        } catch (error) {
            console.error(error);
        }
    };

    const closePeer = (peerId) => {
        const peer = peersRef.current.get(peerId);

        if (peer) {
            peer.close();
            peersRef.current.delete(peerId);
        }

        pendingCandidatesRef.current.delete(peerId);

        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }
    };

    const closeAllPeers = () => {
        peersRef.current.forEach((peer) => {
            peer.close();
        });

        peersRef.current.clear();
        pendingCandidatesRef.current.clear();

        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }
    };

    useEffect(() => {
        let active = true;

        const startCall = async () => {
            try {
                const stream =
                    await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: true
                    });

                if (!active) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                localStreamRef.current = stream;

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

                const socket = io(SOCKET_URL, {
                    transports: ['websocket', 'polling']
                });

                socketRef.current = socket;

                socket.on('connect', () => {
                    setStatus('Waiting for participant...');
                    socket.emit('join-call', roomId);
                });

                socket.on('existing-users', async (users) => {
                    for (const userId of users) {
                        await createOffer(userId);
                    }
                });

                socket.on('offer', async ({ sender, offer }) => {
                    try {
                        const peer = getOrCreatePeer(sender);

                        await peer.setRemoteDescription(
                            new RTCSessionDescription(offer)
                        );

                        await flushCandidates(sender);

                        const answer = await peer.createAnswer();

                        await peer.setLocalDescription(answer);

                        socket.emit('answer', {
                            target: sender,
                            answer
                        });
                    } catch (error) {
                        console.error(error);
                    }
                });

                socket.on('answer', async ({ sender, answer }) => {
                    try {
                        const peer = peersRef.current.get(sender);

                        if (!peer) {
                            return;
                        }

                        await peer.setRemoteDescription(
                            new RTCSessionDescription(answer)
                        );

                        await flushCandidates(sender);
                    } catch (error) {
                        console.error(error);
                    }
                });

                socket.on(
                    'ice-candidate',
                    async ({ sender, candidate }) => {
                        try {
                            const peer =
                                peersRef.current.get(sender);

                            if (!peer) {
                                return;
                            }

                            if (peer.remoteDescription) {
                                await peer.addIceCandidate(
                                    new RTCIceCandidate(candidate)
                                );
                            } else {
                                const pending =
                                    pendingCandidatesRef.current.get(
                                        sender
                                    ) || [];

                                pending.push(candidate);

                                pendingCandidatesRef.current.set(
                                    sender,
                                    pending
                                );
                            }
                        } catch (error) {
                            console.error(error);
                        }
                    }
                );

                socket.on('peer-disconnected', (peerId) => {
                    closePeer(peerId);
                    setRemoteConnected(false);
                    setStatus('Participant left the call');
                });

                socket.on('call-ended', () => {
                    closeAllPeers();
                    setRemoteConnected(false);
                    setStatus('Call ended');
                });

                socket.on('connect_error', () => {
                    setStatus(
                        'Unable to connect to call server'
                    );
                });
            } catch (error) {
                console.error(error);

                setPermissionError(
                    'Camera and microphone access is required for video calls. Please allow access in your browser and try again.'
                );

                setStatus('Camera access required');
            }
        };

        startCall();

        return () => {
            active = false;

            if (socketRef.current) {
                socketRef.current.emit('end-call', {
                    roomId
                });

                socketRef.current.disconnect();
                socketRef.current = null;
            }

            closeAllPeers();

            if (localStreamRef.current) {
                localStreamRef.current
                    .getTracks()
                    .forEach((track) => track.stop());

                localStreamRef.current = null;
            }
        };
    }, [roomId]);

    const toggleMute = () => {
        const tracks =
            localStreamRef.current?.getAudioTracks() || [];

        const nextMuted = !isMuted;

        tracks.forEach((track) => {
            track.enabled = !nextMuted;
        });

        setIsMuted(nextMuted);
    };

    const toggleCamera = () => {
        const tracks =
            localStreamRef.current?.getVideoTracks() || [];

        const nextCameraOff = !isCameraOff;

        tracks.forEach((track) => {
            track.enabled = !nextCameraOff;
        });

        setIsCameraOff(nextCameraOff);
    };

    const endCall = () => {
        socketRef.current?.emit('end-call', {
            roomId
        });

        closeAllPeers();

        if (localStreamRef.current) {
            localStreamRef.current
                .getTracks()
                .forEach((track) => track.stop());

            localStreamRef.current = null;
        }

        socketRef.current?.disconnect();
        socketRef.current = null;

        onClose();
    };

    return (
        <div className="video-call-overlay">
            <div className="video-call-window">
                <div className="video-call-header">
                    <div>
                        <h5>Video Call</h5>
                        <span>{status}</span>
                    </div>

                    <button
                        className="video-close-button"
                        onClick={endCall}
                    >
                        <FaTimes />
                    </button>
                </div>

                <div className="video-stage">
                    <div className="remote-video-container">
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="remote-video"
                        />

                        {!remoteConnected && (
                            <div className="video-placeholder">
                                <FaVideo size={40} />
                                <p>
                                    {permissionError ||
                                        'Waiting for the other participant...'}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="local-video-container">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                            className="local-video"
                        />
                    </div>
                </div>

                <div className="video-call-controls">
                    <button
                        className={`call-control ${
                            isMuted ? 'active' : ''
                        }`}
                        onClick={toggleMute}
                    >
                        {isMuted ? (
                            <FaMicrophoneSlash />
                        ) : (
                            <FaMicrophone />
                        )}
                        <span>
                            {isMuted ? 'Unmute' : 'Mute'}
                        </span>
                    </button>

                    <button
                        className={`call-control ${
                            isCameraOff ? 'active' : ''
                        }`}
                        onClick={toggleCamera}
                    >
                        {isCameraOff ? (
                            <FaVideoSlash />
                        ) : (
                            <FaVideo />
                        )}
                        <span>
                            {isCameraOff
                                ? 'Camera On'
                                : 'Camera Off'}
                        </span>
                    </button>

                    <button
                        className="call-control end-call"
                        onClick={endCall}
                    >
                        <FaPhoneSlash />
                        <span>End Call</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VideoCall;