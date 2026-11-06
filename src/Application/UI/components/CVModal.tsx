import React, { useEffect, useRef, useState, useCallback } from 'react';
import UIEventBus from '../EventBus';

const CVModal: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isViewerReady, setIsViewerReady] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const closeBtnRef = useRef<HTMLButtonElement>(null);

    // Listen to PaperCV events
    useEffect(() => {
        const handleOpen = () => {
            setIsOpen(true);
            document.body.style.overflow = 'hidden';
        };

        const handleAnimComplete = () => {
            setIsViewerReady(true);
            setTimeout(() => {
                closeBtnRef.current?.focus();
            }, 50);
        };

        const handleClose = () => {
            setIsOpen(false);
            setIsViewerReady(false);
            document.body.style.overflow = '';
        };

        UIEventBus.on('openCV', handleOpen);
        UIEventBus.on('paperAnimComplete', handleAnimComplete);
        UIEventBus.on('closeCV', handleClose);

        return () => {
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

            if (e.key === 'Tab' && modalRef.current) {
                const focusable = document.querySelectorAll<HTMLElement>(
                    '#prevent-click button, #prevent-click [href], #prevent-click iframe'
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
            {/* ─── Pure Frameless CV Document Presentation ─── */}
            {isOpen && (
                <div
                    style={Object.assign(
                        {},
                        styles.backdrop,
                        isViewerReady ? styles.backdropActive : {}
                    )}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            triggerClose();
                        }
                    }}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Antriksh Curriculum Vitae"
                    id="prevent-click"
                >
                    {/* Sleek Floating Controls (Top Right) */}
                    <div style={styles.floatingControls}>
                        <a
                            href="/cv.pdf"
                            download="CV.pdf"
                            style={styles.floatingDownloadBtn}
                            title="Download CV (PDF)"
                            aria-label="Download CV"
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

                        <button
                            ref={closeBtnRef}
                            onClick={triggerClose}
                            style={styles.floatingCloseBtn}
                            aria-label="Close CV"
                            title="Close (Esc)"
                        >
                            ✕
                        </button>
                    </div>

                    {/* ONLY The CV Document Sheet */}
                    <div
                        ref={modalRef}
                        style={Object.assign(
                            {},
                            styles.cvSheet,
                            isViewerReady ? styles.cvSheetActive : {}
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <iframe
                            src="/cv.pdf#toolbar=0&navpanes=0&scrollbar=1&view=FitH"
                            style={styles.iframe}
                            title="Antriksh CV"
                        />
                    </div>
                </div>
            )}
        </>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    backdrop: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(5, 7, 12, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        boxSizing: 'border-box',
        opacity: 0,
        transition: 'opacity 0.35s ease',
        pointerEvents: 'auto',
    },
    backdropActive: {
        opacity: 1,
    },
    floatingControls: {
        position: 'fixed',
        top: 20,
        right: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        zIndex: 100002,
    },
    floatingDownloadBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 18px',
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: '#ffffff',
        borderRadius: '9999px',
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "'Segoe UI', -apple-system, sans-serif",
        textDecoration: 'none',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    floatingCloseBtn: {
        width: 42,
        height: 42,
        borderRadius: '50%',
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
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
        transition: 'all 0.2s ease',
    },
    cvSheet: {
        width: '92vw',
        maxWidth: 880,
        height: '94vh',
        background: '#ffffff',
        borderRadius: 8,
        boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85), 0 0 1px rgba(255, 255, 255, 0.4)',
        overflow: 'hidden',
        transform: 'scale(0.96) translateY(15px)',
        transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease',
        opacity: 0,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
    },
    cvSheetActive: {
        transform: 'scale(1) translateY(0)',
        opacity: 1,
    },
    iframe: {
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
        backgroundColor: '#ffffff',
    },
};

export default CVModal;
