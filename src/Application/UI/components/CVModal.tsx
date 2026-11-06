import React, { useEffect, useRef, useState, useCallback } from 'react';
import UIEventBus from '../EventBus';

interface HoverState {
    visible: boolean;
    x: number;
    y: number;
}

const CVModal: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isViewerReady, setIsViewerReady] = useState(false);
    const [hoverHint, setHoverHint] = useState<HoverState>({ visible: false, x: 0, y: 0 });
    const modalRef = useRef<HTMLDivElement>(null);
    const closeBtnRef = useRef<HTMLButtonElement>(null);

    // Listen to PaperCV events
    useEffect(() => {
        const handleOpen = () => {
            setIsOpen(true);
            setHoverHint({ visible: false, x: 0, y: 0 });
            document.body.style.overflow = 'hidden';
        };

        const handleAnimComplete = () => {
            setIsViewerReady(true);
            // Auto focus close button for accessibility
            setTimeout(() => {
                closeBtnRef.current?.focus();
            }, 50);
        };

        const handleClose = () => {
            setIsOpen(false);
            setIsViewerReady(false);
            document.body.style.overflow = '';
        };

        const handleHover = (data: { hovered: boolean; x?: number; y?: number }) => {
            if (data.hovered && typeof data.x === 'number' && typeof data.y === 'number') {
                setHoverHint({ visible: true, x: data.x, y: data.y });
            } else {
                setHoverHint({ visible: false, x: 0, y: 0 });
            }
        };

        UIEventBus.on('openCV', handleOpen);
        UIEventBus.on('paperAnimComplete', handleAnimComplete);
        UIEventBus.on('closeCV', handleClose);
        UIEventBus.on('paperHover', handleHover);

        return () => {
            // Clean up on unmount
            document.body.style.overflow = '';
        };
    }, []);

    const triggerClose = useCallback(() => {
        setIsViewerReady(false);
        setIsOpen(false);
        document.body.style.overflow = '';
        UIEventBus.dispatch('closeCV', {});
    }, []);

    // Handle Escape key and focus trap
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                triggerClose();
                return;
            }

            // Simple focus trap inside modal
            if (e.key === 'Tab' && modalRef.current) {
                const focusable = modalRef.current.querySelectorAll<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusable.length > 0) {
                    const first = focusable[0];
                    const last = focusable[focusable.length - 1];

                    if (e.shiftKey && document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    } else if (!e.shiftKey && document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, triggerClose]);

    return (
        <>
            {/* ─── 3D Hover Pill Badge (Follows Paper in Screen Space) ─── */}
            {hoverHint.visible && !isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        left: hoverHint.x,
                        top: hoverHint.y,
                        transform: 'translate(-50%, -100%) translateY(-12px)',
                        zIndex: 9000,
                        pointerEvents: 'none',
                        transition: 'opacity 0.2s ease, transform 0.2s ease',
                    }}
                >
                    <div style={styles.hoverPill}>
                        <span style={styles.hoverSparkle}>📄</span>
                        <span style={styles.hoverText}>View CV</span>
                        <span style={styles.hoverSubtext}>(Click Paper)</span>
                    </div>
                </div>
            )}

            {/* ─── Full-screen Dim Backdrop & Modal ─── */}
            {isOpen && (
                <div
                    style={Object.assign(
                        {},
                        styles.backdrop,
                        isViewerReady ? styles.backdropActive : {}
                    )}
                    onClick={(e) => {
                        // Click outside modal content closes the CV
                        if (e.target === e.currentTarget) {
                            triggerClose();
                        }
                    }}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Antriksh Curriculum Vitae"
                    id="prevent-click"
                >
                    <div
                        ref={modalRef}
                        style={Object.assign(
                            {},
                            styles.modalCard,
                            isViewerReady ? styles.modalCardActive : {}
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* ── Modal Header ── */}
                        <div style={styles.header}>
                            <div style={styles.headerTitleCol}>
                                <div style={styles.headerBadgeRow}>
                                    <span style={styles.headerBadge}>CURRICULUM VITAE</span>
                                    <span style={styles.authorBadge}>ANTRIKSH</span>
                                </div>
                                <h2 style={styles.headerTitle}>Antriksh — Professional Resume</h2>
                                <p style={styles.headerSubtitle}>
                                    Motion Graphics Designer | Video Editor | Graphic Designer
                                </p>
                            </div>

                            <div style={styles.headerActions}>
                                {/* Download Button */}
                                <a
                                    href="/cv.pdf"
                                    download="CV.pdf"
                                    style={styles.downloadBtn}
                                    title="Download CV as PDF"
                                    aria-label="Download CV as PDF"
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{ width: 16, height: 16 }}
                                    >
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="7 10 12 15 17 10" />
                                        <line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                    <span>Download CV</span>
                                </a>

                                {/* Close Button */}
                                <button
                                    ref={closeBtnRef}
                                    onClick={triggerClose}
                                    style={styles.closeBtn}
                                    aria-label="Close CV Viewer"
                                    title="Close (Esc)"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* ── Mobile Fallback Banner ── */}
                        <div style={styles.mobileBanner}>
                            <span>Mobile device detected. If viewer does not render:</span>
                            <a
                                href="/cv.pdf"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={styles.mobileLink}
                            >
                                Open PDF in New Tab ↗
                            </a>
                        </div>

                        {/* ── PDF Embed Container ── */}
                        <div style={styles.viewerWrapper}>
                            <iframe
                                src="/cv.pdf#toolbar=0&navpanes=0&scrollbar=1"
                                style={styles.iframe}
                                title="Antriksh CV PDF Document"
                            />
                        </div>

                        {/* ── Modal Footer Bar ── */}
                        <div style={styles.footer}>
                            <span style={styles.footerInfo}>
                                Location: South Delhi, Delhi, 110003 • Phone: +91 98717 84187 • Email: devbaisoya36@gmail.com
                            </span>
                            <div style={styles.footerRight}>
                                <a
                                    href="https://www.behance.net/devbaisoya"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={styles.behanceFooterLink}
                                >
                                    View Behance Portfolio ↗
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    hoverPill: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 14px',
        background: 'rgba(8, 10, 16, 0.92)',
        border: '1.5px solid #00f2fe',
        borderRadius: '9999px',
        boxShadow: '0 4px 20px rgba(0, 242, 254, 0.4), 0 2px 8px rgba(0,0,0,0.8)',
        backdropFilter: 'blur(10px)',
        cursor: 'pointer',
        animation: 'floatHoverPill 2s infinite ease-in-out',
    },
    hoverSparkle: {
        fontSize: 14,
    },
    hoverText: {
        color: '#ffffff',
        fontFamily: "'Segoe UI', -apple-system, sans-serif",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.04em',
    },
    hoverSubtext: {
        color: '#00f2fe',
        fontFamily: "'Segoe UI', -apple-system, sans-serif",
        fontSize: 11,
        fontWeight: 500,
    },
    backdrop: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(4, 6, 10, 0.78)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
        boxSizing: 'border-box',
        opacity: 0,
        transition: 'opacity 0.35s ease',
        pointerEvents: 'auto',
    },
    backdropActive: {
        opacity: 1,
    },
    modalCard: {
        width: '100%',
        maxWidth: 960,
        height: '92vh',
        background: '#0d1117',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: 16,
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(0, 242, 254, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transform: 'scale(0.96) translateY(15px)',
        transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease',
        opacity: 0,
        boxSizing: 'border-box',
    },
    modalCardActive: {
        transform: 'scale(1) translateY(0)',
        opacity: 1,
    },
    header: {
        padding: '16px 24px',
        background: '#161b22',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        gap: 16,
    },
    headerTitleCol: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
    },
    headerBadgeRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    },
    headerBadge: {
        fontSize: 10,
        fontFamily: "'Space Grotesk', monospace",
        fontWeight: 700,
        letterSpacing: '0.12em',
        color: '#00f2fe',
        background: 'rgba(0, 242, 254, 0.12)',
        padding: '2px 8px',
        borderRadius: 4,
    },
    authorBadge: {
        fontSize: 11,
        fontFamily: "'Space Grotesk', monospace",
        fontWeight: 700,
        color: '#ffffff',
    },
    headerTitle: {
        margin: 0,
        fontSize: 18,
        fontWeight: 700,
        color: '#ffffff',
        fontFamily: "'Segoe UI', -apple-system, sans-serif",
    },
    headerSubtitle: {
        margin: 0,
        fontSize: 12,
        color: '#94a3b8',
        fontFamily: "'Segoe UI', -apple-system, sans-serif",
    },
    headerActions: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
    },
    downloadBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        background: '#00f2fe',
        color: '#04060a',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 700,
        fontFamily: "'Segoe UI', -apple-system, sans-serif",
        textDecoration: 'none',
        transition: 'background 0.2s, transform 0.15s',
        boxShadow: '0 2px 10px rgba(0, 242, 254, 0.3)',
        cursor: 'pointer',
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 8,
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'background 0.2s, border-color 0.2s',
    },
    mobileBanner: {
        padding: '8px 16px',
        background: 'rgba(0, 242, 254, 0.08)',
        borderBottom: '1px solid rgba(0, 242, 254, 0.2)',
        fontSize: 12,
        color: '#94a3b8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
    },
    mobileLink: {
        color: '#00f2fe',
        fontWeight: 600,
        textDecoration: 'none',
    },
    viewerWrapper: {
        flex: 1,
        width: '100%',
        height: '100%',
        background: '#1e293b',
        position: 'relative',
        overflow: 'hidden',
    },
    iframe: {
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
        backgroundColor: '#ffffff',
    },
    footer: {
        padding: '10px 24px',
        background: '#161b22',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        fontSize: 11,
        color: '#64748b',
        gap: 12,
        flexWrap: 'wrap',
    },
    footerInfo: {
        color: '#94a3b8',
    },
    footerRight: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
    },
    behanceFooterLink: {
        color: '#00f2fe',
        textDecoration: 'none',
        fontWeight: 600,
    },
};

export default CVModal;
