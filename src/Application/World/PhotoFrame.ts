import * as THREE from 'three';
import Application from '../Application';
import Camera, { CameraKey } from '../Camera/Camera';
import TWEEN from '@tweenjs/tween.js';
import UIEventBus from '../UI/EventBus';

export default class PhotoFrame {
    application: Application;
    camera: Camera;
    scene: THREE.Scene;

    frameGroup: THREE.Group;
    tiltGroup: THREE.Group;

    // Meshes
    photoMesh: THREE.Mesh;
    glassMesh: THREE.Mesh;
    matMesh: THREE.Group;
    outerFrameGroup: THREE.Group;
    easelMesh: THREE.Mesh;
    shadowMesh: THREE.Mesh;

    // Materials
    photoMaterial: THREE.MeshBasicMaterial;
    glassMaterial: THREE.MeshBasicMaterial;
    frameMaterial: THREE.MeshBasicMaterial;
    innerBevelMaterial: THREE.MeshBasicMaterial;
    matMaterial: THREE.MeshBasicMaterial;
    shadowMaterial: THREE.MeshBasicMaterial;

    // Textures & Reveal Canvas
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D | null;
    photoTexture: THREE.CanvasTexture;
    glassTexture: THREE.CanvasTexture;

    // Image loading & Reveal progress
    fullImg: HTMLImageElement;
    thumbImg: HTMLImageElement;
    isThumbLoaded: boolean = false;
    isFullLoaded: boolean = false;
    revealProgress = { val: 0 };
    glassSweep = { offset: 0, opacity: 0.12 };

    // Desk placement (right side of mouse, in front of coffee mug)
    restPosition: THREE.Vector3 = new THREE.Vector3(1380, -445, 1280);
    restRotation: THREE.Euler = new THREE.Euler(0, -0.32, 0); // ~ -18 deg angled to camera

    // Interaction state
    raycaster: THREE.Raycaster;
    mouseNDC: THREE.Vector2;
    isHovered: boolean = false;
    isPhotoOpen: boolean = false;
    isCVOpen: boolean = false;
    isAnimating: boolean = false;

    hoverLift = { y: 0 };
    hoverTween: any = null;
    tiltTween: any = null;

    // Blurred 20px placeholder data-URI
    placeholderDataUri =
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCAAgABgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDzwDNOMZA6U22DO4A6mta7sHgsxMDn1qXJIpRbMhvvCiiQEnIGAaKBGraWSpcbsEoOlaptpLm0fzJAq54HrWUJ2jPWnx3NxO20MSB2qJpvUpO2hSvI3gzG68DoaKsTTed8j8gUVZB//9k=';

    constructor() {
        this.application = new Application();
        this.camera = this.application.camera;
        this.scene = this.application.scene;

        this.raycaster = new THREE.Raycaster();
        this.mouseNDC = new THREE.Vector2(-999, -999);

        this.initTextures();
        this.build3DFrame();
        this.createContactShadow();
        this.setupEventListeners();
        this.startPhotoLoading();
    }

    initTextures() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 512;
        this.canvas.height = 680;
        this.ctx = this.canvas.getContext('2d');

        this.photoTexture = new THREE.CanvasTexture(this.canvas);
        this.photoTexture.encoding = THREE.sRGBEncoding;
        this.photoTexture.anisotropy = 16;
        this.photoTexture.minFilter = THREE.LinearMipmapLinearFilter;
        this.photoTexture.generateMipmaps = true;

        // Glass reflection canvas
        const glassCanvas = document.createElement('canvas');
        glassCanvas.width = 256;
        glassCanvas.height = 340;
        const gctx = glassCanvas.getContext('2d');
        if (gctx) {
            const grad = gctx.createLinearGradient(0, 0, 256, 340);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
            grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.08)');
            grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.0)');
            grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.05)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
            gctx.fillStyle = grad;
            gctx.fillRect(0, 0, 256, 340);
        }

        this.glassTexture = new THREE.CanvasTexture(glassCanvas);
    }

    startPhotoLoading() {
        // 1. Immediately draw blurred thumbnail placeholder
        this.thumbImg = new Image();
        this.thumbImg.onload = () => {
            this.isThumbLoaded = true;
            this.renderPhoto(0);
        };
        this.thumbImg.src = this.placeholderDataUri;

        // 2. Load full-resolution photo
        this.fullImg = new Image();
        this.fullImg.crossOrigin = 'anonymous';
        this.fullImg.onload = () => {
            this.isFullLoaded = true;
            this.triggerRevealAnimation();
        };
        this.fullImg.onerror = () => {
            console.warn('[PhotoFrame] Could not load /images/profile-photo.jpg, using thumbnail');
        };
        this.fullImg.src = '/images/profile-photo.jpg';
    }

    renderPhoto(progress: number) {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        const imgToDraw = progress > 0.1 && this.isFullLoaded ? this.fullImg : this.thumbImg;
        if (imgToDraw && imgToDraw.complete && imgToDraw.naturalWidth > 0) {
            // "cover" logic: crop minimum, keep face centered
            const canvasAspect = w / h;
            const imgAspect = imgToDraw.naturalWidth / imgToDraw.naturalHeight;
            let drawW: number, drawH: number, drawX: number, drawY: number;

            if (imgAspect > canvasAspect) {
                drawH = h;
                drawW = h * imgAspect;
                drawX = (w - drawW) / 2;
                drawY = 0;
            } else {
                drawW = w;
                drawH = w / imgAspect;
                drawX = 0;
                drawY = (h - drawH) * 0.45;
            }

            // Apply reveal fade & saturation
            if (progress < 1.0) {
                ctx.save();
                // Starts dimmed and slightly desaturated, eases up to full bright
                const brightness = 0.4 + 0.6 * progress;
                const saturation = 0.3 + 0.7 * progress;
                ctx.filter = `brightness(${brightness}) saturate(${saturation})`;
                ctx.drawImage(imgToDraw, drawX, drawY, drawW, drawH);
                ctx.restore();
            } else {
                ctx.drawImage(imgToDraw, drawX, drawY, drawW, drawH);
            }
        } else {
            // Soft warm loading fallback
            ctx.fillStyle = '#221e1a';
            ctx.fillRect(0, 0, w, h);
        }

        this.photoTexture.needsUpdate = true;
    }

    triggerRevealAnimation() {
        const prefersReducedMotion =
            window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const duration = prefersReducedMotion ? 400 : 3000;

        new TWEEN.Tween(this.revealProgress)
            .to({ val: 1.0 }, duration)
            .easing(TWEEN.Easing.Cubic.Out)
            .onUpdate(() => {
                this.renderPhoto(this.revealProgress.val);
            })
            .onComplete(() => {
                this.renderPhoto(1.0);
                this.triggerGlassSweep();
            })
            .start();
    }

    triggerGlassSweep() {
        // Subtle soft light sweep across the glass reflection
        new TWEEN.Tween(this.glassSweep)
            .to({ opacity: 0.28 }, 450)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate(() => {
                this.glassMaterial.opacity = this.glassSweep.opacity;
            })
            .onComplete(() => {
                new TWEEN.Tween(this.glassSweep)
                    .to({ opacity: 0.12 }, 600)
                    .easing(TWEEN.Easing.Quadratic.In)
                    .onUpdate(() => {
                        this.glassMaterial.opacity = this.glassSweep.opacity;
                    })
                    .start();
            })
            .start();
    }

    build3DFrame() {
        this.frameGroup = new THREE.Group();
        this.frameGroup.position.copy(this.restPosition);
        this.frameGroup.rotation.copy(this.restRotation);

        // Tilt group handles the 10° backward tilt around frame's bottom edge (Y = 0)
        this.tiltGroup = new THREE.Group();
        // 10° backward tilt around local X
        this.tiltGroup.rotation.x = -0.1745;
        this.frameGroup.add(this.tiltGroup);

        const frameW = 200;
        const frameH = 260;
        const frameD = 12;
        const borderT = 20;

        // 1. Outer Wooden / Espresso Frame
        this.frameMaterial = new THREE.MeshBasicMaterial({
            color: 0x241d18, // Rich dark espresso walnut wood
        });

        this.innerBevelMaterial = new THREE.MeshBasicMaterial({
            color: 0x3d322b, // Subtle warm beveled inner border highlight
        });

        this.outerFrameGroup = new THREE.Group();

        // Top bar
        const topBar = new THREE.Mesh(
            new THREE.BoxGeometry(frameW, borderT, frameD),
            this.frameMaterial
        );
        topBar.position.set(0, frameH - borderT / 2, 0);
        this.outerFrameGroup.add(topBar);

        // Bottom bar
        const bottomBar = new THREE.Mesh(
            new THREE.BoxGeometry(frameW, borderT, frameD),
            this.frameMaterial
        );
        bottomBar.position.set(0, borderT / 2, 0);
        this.outerFrameGroup.add(bottomBar);

        // Left bar
        const sideH = frameH - borderT * 2;
        const leftBar = new THREE.Mesh(
            new THREE.BoxGeometry(borderT, sideH, frameD),
            this.frameMaterial
        );
        leftBar.position.set(-frameW / 2 + borderT / 2, frameH / 2, 0);
        this.outerFrameGroup.add(leftBar);

        // Right bar
        const rightBar = new THREE.Mesh(
            new THREE.BoxGeometry(borderT, sideH, frameD),
            this.frameMaterial
        );
        rightBar.position.set(frameW / 2 - borderT / 2, frameH / 2, 0);
        this.outerFrameGroup.add(rightBar);

        // Thin inner bevel lip (accent line between wood and cream mat)
        const bevelLip = new THREE.Mesh(
            new THREE.BoxGeometry(frameW - borderT * 2 + 2, sideH + 2, 1),
            this.innerBevelMaterial
        );
        bevelLip.position.set(0, frameH / 2, 1);
        this.outerFrameGroup.add(bevelLip);

        // Sturdy Backboard behind the photo
        const backboard = new THREE.Mesh(
            new THREE.BoxGeometry(frameW - 6, frameH - 6, 3),
            new THREE.MeshBasicMaterial({ color: 0x141210 }) // Dark felt backing
        );
        backboard.position.set(0, frameH / 2, -frameD / 2 + 1.5);
        this.outerFrameGroup.add(backboard);

        this.tiltGroup.add(this.outerFrameGroup);

        // 2. Off-White Cream Mat (Passé-Partout)
        this.matMaterial = new THREE.MeshBasicMaterial({
            color: 0xf5f2ec, // Fine textured cream archival mat
        });

        this.matMesh = new THREE.Group();
        const matOuterW = frameW - borderT * 2;
        const matOuterH = frameH - borderT * 2;
        const photoOpenW = 120;
        const photoOpenH = 160;
        const matMarginX = (matOuterW - photoOpenW) / 2; // 20
        const matMarginY = (matOuterH - photoOpenH) / 2; // 30

        const matYCenter = frameH / 2;

        // Mat top
        const mTop = new THREE.Mesh(
            new THREE.PlaneGeometry(matOuterW, matMarginY),
            this.matMaterial
        );
        mTop.position.set(0, matYCenter + photoOpenH / 2 + matMarginY / 2, 0.5);
        this.matMesh.add(mTop);

        // Mat bottom
        const mBottom = new THREE.Mesh(
            new THREE.PlaneGeometry(matOuterW, matMarginY),
            this.matMaterial
        );
        mBottom.position.set(0, matYCenter - photoOpenH / 2 - matMarginY / 2, 0.5);
        this.matMesh.add(mBottom);

        // Mat left
        const mLeft = new THREE.Mesh(
            new THREE.PlaneGeometry(matMarginX, photoOpenH),
            this.matMaterial
        );
        mLeft.position.set(-photoOpenW / 2 - matMarginX / 2, matYCenter, 0.5);
        this.matMesh.add(mLeft);

        // Mat right
        const mRight = new THREE.Mesh(
            new THREE.PlaneGeometry(matMarginX, photoOpenH),
            this.matMaterial
        );
        mRight.position.set(photoOpenW / 2 + matMarginX / 2, matYCenter, 0.5);
        this.matMesh.add(mRight);

        this.tiltGroup.add(this.matMesh);

        // 3. The Photo Surface
        // Sits just behind the mat cutout with a 3px overlap so edges are clean
        const photoW = photoOpenW + 6;
        const photoH = photoOpenH + 6;
        const photoGeo = new THREE.PlaneGeometry(photoW, photoH);

        this.photoMaterial = new THREE.MeshBasicMaterial({
            map: this.photoTexture,
            color: 0xffffff,
            side: THREE.FrontSide,
        });

        this.photoMesh = new THREE.Mesh(photoGeo, this.photoMaterial);
        this.photoMesh.position.set(0, matYCenter, 0.1);
        this.tiltGroup.add(this.photoMesh);

        // 4. Front Protective Glass Layer
        const glassGeo = new THREE.PlaneGeometry(matOuterW, matOuterH);
        this.glassMaterial = new THREE.MeshBasicMaterial({
            map: this.glassTexture,
            transparent: true,
            opacity: 0.12,
            depthWrite: false,
            side: THREE.FrontSide,
        });

        this.glassMesh = new THREE.Mesh(glassGeo, this.glassMaterial);
        this.glassMesh.position.set(0, matYCenter, 1.2);
        this.tiltGroup.add(this.glassMesh);

        // 5. Back Easel Leg (Realistic strut touching table)
        // Hinge is mounted at 180 units up from base on the backboard
        const hingeY = 178;
        const legLength = 196;
        const legWidth = 16;
        const legThickness = 4;

        const easelGeo = new THREE.BoxGeometry(legWidth, legLength, legThickness);
        // Translate geometry so top of strut is at origin (hinge pivot)
        easelGeo.translate(0, -legLength / 2, 0);

        this.easelMesh = new THREE.Mesh(
            easelGeo,
            new THREE.MeshBasicMaterial({ color: 0x1f1915 })
        );
        this.easelMesh.position.set(0, hingeY, -frameD / 2);
        // Rotates backwards around X to touch table
        this.easelMesh.rotation.x = 0.43; // ~ 24.6 degrees
        this.outerFrameGroup.add(this.easelMesh);

        this.scene.add(this.frameGroup);
    }

    createContactShadow() {
        const shadowCanvas = document.createElement('canvas');
        shadowCanvas.width = 256;
        shadowCanvas.height = 256;
        const sctx = shadowCanvas.getContext('2d');
        if (sctx) {
            // Dark linear shadow directly along frame base
            const linGrad = sctx.createLinearGradient(0, 100, 0, 160);
            linGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
            linGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.7)');
            linGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            sctx.fillStyle = linGrad;
            sctx.fillRect(30, 100, 196, 60);

            // Feathered soft radial shadow extending back toward easel leg
            const radGrad = sctx.createRadialGradient(128, 140, 10, 128, 140, 110);
            radGrad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
            radGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
            radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            sctx.fillStyle = radGrad;
            sctx.fillRect(0, 0, 256, 256);
        }

        const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
        this.shadowMaterial = new THREE.MeshBasicMaterial({
            map: shadowTexture,
            transparent: true,
            opacity: 0.75,
            depthWrite: false,
        });

        const shadowGeo = new THREE.PlaneGeometry(240, 260);
        this.shadowMesh = new THREE.Mesh(shadowGeo, this.shadowMaterial);
        this.shadowMesh.rotation.x = -Math.PI / 2;
        this.shadowMesh.rotation.z = this.restRotation.y;
        this.shadowMesh.position.set(this.restPosition.x, -444.8, this.restPosition.z - 30);

        this.scene.add(this.shadowMesh);
    }

    setupEventListeners() {
        window.addEventListener('mousemove', (e) => {
            this.mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
            this.checkHover();
        });

        // Use pointerdown (matching PaperCV) so stopPropagation prevents triggering scene keyframe transitions
        window.addEventListener('pointerdown', (e) => {
            const target = e.target as HTMLElement;
            if (target && target.closest('#prevent-click')) return;

            if (this.isHovered && !this.isPhotoOpen && !this.isCVOpen && !this.isAnimating) {
                e.preventDefault();
                e.stopPropagation();
                this.openPhoto();
            }
        });

        UIEventBus.on('openCV', () => {
            this.isCVOpen = true;
        });

        UIEventBus.on('closeCV', () => {
            this.isCVOpen = false;
        });

        UIEventBus.on('openPhoto', () => {
            this.isPhotoOpen = true;
        });

        UIEventBus.on('closePhoto', () => {
            this.closePhoto();
        });
    }

    checkHover() {
        if (this.isPhotoOpen || this.isCVOpen || !this.camera || !this.camera.instance) return;

        this.raycaster.setFromCamera(this.mouseNDC, this.camera.instance);
        const hitMeshes: THREE.Object3D[] = [this.glassMesh, this.photoMesh];
        this.outerFrameGroup.traverse((child) => {
            if (child instanceof THREE.Mesh) hitMeshes.push(child);
        });

        const intersects = this.raycaster.intersectObjects(hitMeshes, false);

        if (intersects.length > 0) {
            if (!this.isHovered) {
                this.isHovered = true;
                document.body.style.cursor = 'pointer';
                this.animateHover(true);
            }
        } else {
            if (this.isHovered) {
                this.isHovered = false;
                document.body.style.cursor = 'default';
                this.animateHover(false);
            }
        }
    }

    animateHover(hovering: boolean) {
        if (this.isPhotoOpen) return;

        if (this.hoverTween) this.hoverTween.stop();

        const targetY = hovering ? 8 : 0;
        const targetGlassOpacity = hovering ? 0.22 : 0.12;

        this.hoverTween = new TWEEN.Tween(this.hoverLift)
            .to({ y: targetY }, 200)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate(() => {
                this.frameGroup.position.y = this.restPosition.y + this.hoverLift.y;
                this.glassMaterial.opacity = targetGlassOpacity;
            })
            .start();
    }

    openPhoto() {
        if (this.isAnimating || this.isPhotoOpen) return;
        this.isPhotoOpen = true;
        this.isAnimating = true;

        document.body.style.cursor = 'default';

        if (this.tiltTween) this.tiltTween.stop();

        // Gentle forward tilt toward viewer on click
        this.tiltTween = new TWEEN.Tween(this.tiltGroup.rotation)
            .to({ x: -0.05 }, 350)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onComplete(() => {
                this.isAnimating = false;
                this.tiltTween = null;
            })
            .start();

        // Safety fallback so isAnimating can never stay stuck
        setTimeout(() => {
            this.isAnimating = false;
        }, 400);

        UIEventBus.dispatch('openPhoto', {});
    }

    closePhoto() {
        if (this.tiltTween) this.tiltTween.stop();
        this.isAnimating = true;

        this.tiltTween = new TWEEN.Tween(this.tiltGroup.rotation)
            .to({ x: -0.1745 }, 400)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onComplete(() => {
                this.isAnimating = false;
                this.tiltTween = null;
                this.frameGroup.position.y = this.restPosition.y;
            })
            .start();

        // Safety fallback so isAnimating and isPhotoOpen can never stay stuck
        setTimeout(() => {
            this.isAnimating = false;
            this.isPhotoOpen = false;
            this.frameGroup.position.y = this.restPosition.y;
        }, 450);
    }

    update() {}
}

