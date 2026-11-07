import React, { useEffect, useRef, useState, useCallback } from 'react';
import UIEventBus from '../EventBus';

const PhotoModal: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isCloseHovered, setIsCloseHovered] = useState(false);
    const [isFloatingHovered, setIsFloatingHovered] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const closeBtnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleOpen = () => {
            setIsOpen(true);
            document.body.style.overflow = 'hidden';
            setTimeout(() => {
                closeBtnRef.current?.focus();
            }, 60);
        };

        const handleClose = () => {
            setIsOpen(false);
            document.body.style.overflow = '';
        };

        UIEventBus.on('openPhoto', handleOpen);
        UIEventBus.on('closePhoto', handleClose);

        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    const triggerClose = useCallback(() => {
        setIsOpen(false);
        document.body.style.overflow = '';
        UIEventBus.dispatch('closePhoto', {});
    }, []);

    // Esc key listener and focus management
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                triggerClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, triggerClose]);

    if (!isOpen) return null;

    return (
        <div
            id="prevent-click"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Antriksh Profile Photo"
            style={styles.backdrop}
            onClick={(e) => {
                if (e.target === e.currentTarget || e.target === modalRef.current) {
                    triggerClose();
                }
            }}
        >
            {/* Top Right Floating Close Button (matching CV presentation) */}
            <div style={styles.floatingControls}>
                <button
                    type="button"
                    onClick={triggerClose}
                    onMouseEnter={() => setIsFloatingHovered(true)}
                    onMouseLeave={() => setIsFloatingHovered(false)}
                    style={Object.assign(
                        {},
                        styles.floatingCloseBtn,
                        isFloatingHovered ? styles.floatingCloseBtnHover : {}
                    )}
                    aria-label="Close photo"
                    title="Close (Esc)"
                >
                    ✕
                </button>
            </div>

            {/* Content Card */}
            <div
                style={styles.card}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.headerTitleGroup}>
                        <span style={styles.title}>ANTRIKSH</span>
                        <span style={styles.badge}>Motion Graphics Designer</span>
                    </div>
                    <button
                        ref={closeBtnRef}
                        type="button"
                        onClick={triggerClose}
                        onMouseEnter={() => setIsCloseHovered(true)}
                        onMouseLeave={() => setIsCloseHovered(false)}
                        style={Object.assign(
                            {},
                            styles.closeBtn,
                            isCloseHovered ? styles.closeBtnHover : {}
                        )}
                        aria-label="Close photo"
                        title="Close (Esc)"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ width: 18, height: 18, pointerEvents: 'none' }}
                        >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Photo Display */}
                <div style={styles.imageContainer}>
                    <picture>
                        <source srcSet="/images/profile-photo.webp" type="image/webp" />
                        <img
                            src="/images/profile-photo.jpg"
                            alt="Antriksh - Motion Graphics Designer | Video Editor | Graphic Designer"
                            style={styles.image}
                        />
                    </picture>
                </div>

                {/* Footer Controls */}
                <div style={styles.footer}>
                    <div style={styles.footerBio}>
                        Video Editor &amp; Visual Designer • Delhi, India
                    </div>
                    <div style={styles.btnRow}>
                        <a
                            href="https://www.behance.net/devbaisoya"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.linkBtn}
                            title="View Behance Profile"
                        >
                            Behance ↗
                        </a>
                        <a
                            href="/images/profile-photo.jpg"
                            download="Antriksh-Photo.jpg"
                            style={styles.downloadBtn}
                            title="Download full-size photo"
                        >
                            Download ↓
                        </a>
                        <button
                            type="button"
                            onClick={triggerClose}
                            style={styles.backBtn}
                        >
                            Back to Desk
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    backdrop: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(5, 7, 12, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
        padding: '20px',
        boxSizing: 'border-box',
        pointerEvents: 'auto',
    },
    floatingControls: {
        position: 'fixed',
        top: 20,
        right: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        zIndex: 100002,
        pointerEvents: 'auto',
    },
    floatingCloseBtn: {
        width: 42,
        height: 42,
        borderRadius: '50%',
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
        transition: 'all 0.15s ease',
        pointerEvents: 'auto',
    },
    floatingCloseBtnHover: {
        background: 'rgba(239, 68, 68, 0.85)',
        borderColor: 'rgba(255, 255, 255, 0.6)',
        transform: 'scale(1.08)',
    },
    card: {
        position: 'relative',
        backgroundColor: '#12141c',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: '16px',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 40px rgba(0, 120, 255, 0.12)',
        maxWidth: '460px',
        width: '100%',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#ffffff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        pointerEvents: 'auto',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: '#161922',
        pointerEvents: 'auto',
    },
    headerTitleGroup: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    title: {
        fontSize: '16px',
        fontWeight: 700,
        letterSpacing: '0.04em',
    },
    badge: {
        fontSize: '11px',
        fontWeight: 600,
        color: '#60a5fa',
        backgroundColor: 'rgba(96, 165, 250, 0.14)',
        padding: '2px 8px',
        borderRadius: '10px',
    },
    closeBtn: {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.16)',
        color: '#cbd5e1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        outline: 'none',
        transition: 'all 0.15s ease',
        flexShrink: 0,
        pointerEvents: 'auto',
    },
    closeBtnHover: {
        backgroundColor: 'rgba(239, 68, 68, 0.25)',
        borderColor: 'rgba(239, 68, 68, 0.6)',
        color: '#ffffff',
        transform: 'scale(1.08)',
    },
    imageContainer: {
        padding: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0b0f',
        overflow: 'hidden',
    },
    image: {
        maxWidth: '100%',
        maxHeight: '62vh',
        height: 'auto',
        borderRadius: '10px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        objectFit: 'contain',
        display: 'block',
    },
    footer: {
        padding: '14px 18px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: '#161922',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'auto',
    },
    footerBio: {
        fontSize: '12px',
        color: '#94a3b8',
        textAlign: 'center',
    },
    btnRow: {
        display: 'flex',
        gap: '8px',
        justifyContent: 'center',
    },
    linkBtn: {
        fontSize: '12px',
        fontWeight: 600,
        color: '#60a5fa',
        backgroundColor: 'rgba(96, 165, 250, 0.12)',
        border: '1px solid rgba(96, 165, 250, 0.25)',
        padding: '6px 14px',
        borderRadius: '8px',
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        cursor: 'pointer',
        pointerEvents: 'auto',
    },
    downloadBtn: {
        fontSize: '12px',
        fontWeight: 600,
        color: '#ffffff',
        backgroundColor: '#2563eb',
        border: 'none',
        padding: '6px 14px',
        borderRadius: '8px',
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        cursor: 'pointer',
        pointerEvents: 'auto',
    },
    backBtn: {
        fontSize: '12px',
        fontWeight: 500,
        color: '#cbd5e1',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        padding: '6px 14px',
        borderRadius: '8px',
        cursor: 'pointer',
        pointerEvents: 'auto',
    },
};

export default PhotoModal;
