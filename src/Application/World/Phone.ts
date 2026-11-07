import * as THREE from 'three';
import Application from '../Application';
import Camera, { CameraKey } from '../Camera/Camera';
import TWEEN from '@tweenjs/tween.js';
import UIEventBus from '../UI/EventBus';

export default class Phone {
    application: Application;
    camera: Camera;
    scene: THREE.Scene;

    phoneGroup: THREE.Group;
    chassisMesh: THREE.Mesh;
    screenMesh: THREE.Mesh;
    shadowMesh: THREE.Mesh;

    // Materials
    screenMaterial: THREE.MeshBasicMaterial;
    chassisMaterial: THREE.MeshBasicMaterial;
    rimMaterial: THREE.MeshBasicMaterial;
    shadowMaterial: THREE.MeshBasicMaterial;

    // Screen dynamic canvas & texture
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D | null;
    screenTexture: THREE.CanvasTexture;
    photoImg: HTMLImageElement;
    isPhotoLoaded: boolean = false;

    // Rest transforms on the desk (right side of mouse, in front of coffee mug)
    restPosition: THREE.Vector3 = new THREE.Vector3(1350, -440, 1250);
    restRotation: THREE.Euler = new THREE.Euler(0, -0.25, 0);

    // Interaction state
    raycaster: THREE.Raycaster;
    mouseNDC: THREE.Vector2;
    isHovered: boolean = false;
    isPhotoOpen: boolean = false;
    isCVOpen: boolean = false;
    isAnimating: boolean = false;

    hoverLiftOffset: number = 0;
    animProgress = { lift: 0 };
    currentTween: any = null;

    constructor() {
        this.application = new Application();
        this.camera = this.application.camera;
        this.scene = this.application.scene;

        this.raycaster = new THREE.Raycaster();
        this.mouseNDC = new THREE.Vector2(-999, -999);

        this.createScreenTexture();
        this.buildPhoneModel();
        this.createContactShadow();
        this.setupEventListeners();
    }

    createScreenTexture() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 512;
        this.canvas.height = 1024;
        this.ctx = this.canvas.getContext('2d');

        this.screenTexture = new THREE.CanvasTexture(this.canvas);
        this.screenTexture.encoding = THREE.sRGBEncoding;
        this.screenTexture.anisotropy = 16;
        this.screenTexture.minFilter = THREE.LinearMipmapLinearFilter;
        this.screenTexture.generateMipmaps = true;

        // Draw initial fallback / loading state
        this.renderScreen();

        // Load profile photo
        this.photoImg = new Image();
        this.photoImg.crossOrigin = 'anonymous';
        this.photoImg.onload = () => {
            this.isPhotoLoaded = true;
            this.renderScreen();
        };
        // Load WebP or fallback JPG
        this.photoImg.src = '/images/profile-photo.jpg';
    }

    renderScreen() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        // 1. Wallpaper background
        if (this.isPhotoLoaded && this.photoImg.complete && this.photoImg.naturalWidth > 0) {
            // "cover" logic: crop minimum, center face
            const canvasAspect = w / h;
            const imgAspect = this.photoImg.naturalWidth / this.photoImg.naturalHeight;
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
                // Offset slightly upward so the face stays prominently centered
                drawY = (h - drawH) * 0.45;
            }

            ctx.drawImage(this.photoImg, drawX, drawY, drawW, drawH);
        } else {
            // Elegant dark gradient placeholder
            const grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, '#1a1c24');
            grad.addColorStop(1, '#0c0d12');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        }

        // 2. Subtle top and bottom gradient fades for status bar & home bar contrast
        const topFade = ctx.createLinearGradient(0, 0, 0, 160);
        topFade.addColorStop(0, 'rgba(0,0,0,0.65)');
        topFade.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = topFade;
        ctx.fillRect(0, 0, w, 160);

        const bottomFade = ctx.createLinearGradient(0, h - 140, 0, h);
        bottomFade.addColorStop(0, 'rgba(0,0,0,0)');
        bottomFade.addColorStop(1, 'rgba(0,0,0,0.75)');
        ctx.fillStyle = bottomFade;
        ctx.fillRect(0, h - 140, w, 140);

        // 3. Status Bar
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 32px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif';
        ctx.textBaseline = 'middle';

        // Time (Current local time e.g. "9:41")
        const now = new Date();
        const hours = now.getHours();
        const mins = now.getMinutes().toString().padStart(2, '0');
        const timeStr = `${hours % 12 || 12}:${mins}`;
        ctx.fillText(timeStr, 48, 56);

        // Battery Icon (right side)
        const bx = w - 90;
        const by = 44;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.strokeRect(bx, by, 44, 24);
        ctx.fillStyle = '#4cd964'; // Apple battery green
        ctx.fillRect(bx + 3, by + 3, 34, 18);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bx + 45, by + 8, 3, 8); // nipple

        // Wi-Fi / Signal Bars
        ctx.fillStyle = '#ffffff';
        const sx = w - 145;
        for (let i = 0; i < 4; i++) {
            const barH = 7 + i * 5;
            ctx.fillRect(sx + i * 9, 66 - barH, 6, barH);
        }

        // 4. Modern Camera Notch / Dynamic Island (Center Top)
        const nw = 130;
        const nh = 36;
        const nx = (w - nw) / 2;
        const ny = 38;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(nx, ny, nw, nh, 18) : ctx.rect(nx, ny, nw, nh);
        ctx.fill();

        // Subtle camera lens glare dot inside the notch
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.arc(nx + nw - 28, ny + nh / 2, 6, 0, Math.PI * 2);
        ctx.fill();

        // 5. Antriksh Name Banner on Lockscreen
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.font = '700 36px -apple-system, BlinkMacSystemFont, "SF Pro Display", Inter, sans-serif';
        ctx.fillText('ANTRIKSH', w / 2, h - 85);

        ctx.font = '500 20px -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.fillText('Motion Graphics & Visuals', w / 2, h - 52);

        // 6. Home indicator pill at bottom
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        const hw = 140;
        const hh = 6;
        const hx = (w - hw) / 2;
        const hy = h - 20;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(hx, hy, hw, hh, 3) : ctx.rect(hx, hy, hw, hh);
        ctx.fill();

        // 7. Subtle glass reflection diagonal sheen across the screen
        const sheen = ctx.createLinearGradient(0, 0, w, h);
        sheen.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
        sheen.addColorStop(0.35, 'rgba(255, 255, 255, 0.04)');
        sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0.0)');
        sheen.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
        ctx.fillStyle = sheen;
        ctx.fillRect(0, 0, w, h);

        this.screenTexture.needsUpdate = true;
    }

    buildPhoneModel() {
        this.phoneGroup = new THREE.Group();

        const phoneWidth = 120;
        const phoneLength = 240;
        const phoneThickness = 10;
        const cornerRadius = 16;

        // 1. Chassis Body (extruded rounded rectangle)
        const shape = new THREE.Shape();
        const x = -phoneWidth / 2;
        const y = -phoneLength / 2;
        shape.moveTo(x + cornerRadius, y);
        shape.lineTo(x + phoneWidth - cornerRadius, y);
        shape.quadraticCurveTo(x + phoneWidth, y, x + phoneWidth, y + cornerRadius);
        shape.lineTo(x + phoneWidth, y + phoneLength - cornerRadius);
        shape.quadraticCurveTo(x + phoneWidth, y + phoneLength, x + phoneWidth - cornerRadius, y + phoneLength);
        shape.lineTo(x + cornerRadius, y + phoneLength);
        shape.quadraticCurveTo(x, y + phoneLength, x, y + phoneLength - cornerRadius);
        shape.lineTo(x, y + cornerRadius);
        shape.quadraticCurveTo(x, y, x + cornerRadius, y);

        const extrudeSettings = {
            depth: phoneThickness,
            bevelEnabled: true,
            bevelSegments: 3,
            steps: 1,
            bevelSize: 1.5,
            bevelThickness: 1.5,
        };

        const chassisGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        chassisGeo.center();

        this.chassisMaterial = new THREE.MeshBasicMaterial({
            color: 0x1c1e24, // Space-grey titanium back & frame
        });
        this.chassisMesh = new THREE.Mesh(chassisGeo, this.chassisMaterial);
        // Rotate flat so it lies horizontally on the desk
        this.chassisMesh.rotation.x = Math.PI / 2;
        this.phoneGroup.add(this.chassisMesh);

        // 2. Beveled Metal Outer Rim (Highlight edge)
        const rimGeo = new THREE.BoxGeometry(phoneWidth + 1, 1.2, phoneLength + 1);
        this.rimMaterial = new THREE.MeshBasicMaterial({
            color: 0x3d414a, // Polished metal perimeter
        });
        const rimMesh = new THREE.Mesh(rimGeo, this.rimMaterial);
        rimMesh.position.y = 0.5;
        this.phoneGroup.add(rimMesh);

        // 3. Side Buttons (Power on right, Volume rocker on left)
        const buttonMat = new THREE.MeshBasicMaterial({ color: 0x484c56 });

        // Power button (right side, x > 0)
        const powerBtn = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4, 30), buttonMat);
        powerBtn.position.set(phoneWidth / 2 + 1.2, 0, -20);
        this.phoneGroup.add(powerBtn);

        // Volume Up & Down (left side, x < 0)
        const volUp = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4, 25), buttonMat);
        volUp.position.set(-phoneWidth / 2 - 1.2, 0, -40);
        this.phoneGroup.add(volUp);

        const volDown = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4, 25), buttonMat);
        volDown.position.set(-phoneWidth / 2 - 1.2, 0, -10);
        this.phoneGroup.add(volDown);

        // 4. Camera Bump on the back (subtle generic module)
        const bumpMat = new THREE.MeshBasicMaterial({ color: 0x15161b });
        const bumpGeo = new THREE.BoxGeometry(45, 2.5, 50);
        const bumpMesh = new THREE.Mesh(bumpGeo, bumpMat);
        bumpMesh.position.set(-phoneWidth / 2 + 30, -phoneThickness / 2 - 1.5, -phoneLength / 2 + 35);
        this.phoneGroup.add(bumpMesh);

        // Camera lenses
        const lensMat = new THREE.MeshBasicMaterial({ color: 0x08090d });
        const lensRingMat = new THREE.MeshBasicMaterial({ color: 0x333742 });

        for (const [lx, lz] of [[-phoneWidth / 2 + 22, -phoneLength / 2 + 25], [-phoneWidth / 2 + 22, -phoneLength / 2 + 45]]) {
            const ring = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 3, 16), lensRingMat);
            ring.position.set(lx, -phoneThickness / 2 - 2, lz);
            this.phoneGroup.add(ring);

            const glass = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 3.2, 16), lensMat);
            glass.position.set(lx, -phoneThickness / 2 - 2, lz);
            this.phoneGroup.add(glass);
        }

        // 5. Screen Plane (Top face, lying flat at y ≈ +phoneThickness/2 + 0.1)
        const screenWidth = phoneWidth - 6;
        const screenLength = phoneLength - 6;
        const screenGeo = new THREE.PlaneGeometry(screenWidth, screenLength);

        this.screenMaterial = new THREE.MeshBasicMaterial({
            map: this.screenTexture,
            color: 0xeeeeee,
        });

        this.screenMesh = new THREE.Mesh(screenGeo, this.screenMaterial);
        // Plane defaults to facing +Z; rotate around X by -Math.PI / 2 so it faces UP (+Y)
        this.screenMesh.rotation.x = -Math.PI / 2;
        // Also rotate 180 deg around Z so the top of the screen points toward -Z (away from user)
        this.screenMesh.rotation.z = Math.PI;
        this.screenMesh.position.y = phoneThickness / 2 + 0.2;
        this.phoneGroup.add(this.screenMesh);

        // Position phone on the desk
        this.phoneGroup.position.copy(this.restPosition);
        this.phoneGroup.rotation.copy(this.restRotation);

        this.scene.add(this.phoneGroup);
    }

    createContactShadow() {
        const shadowCanvas = document.createElement('canvas');
        shadowCanvas.width = 256;
        shadowCanvas.height = 256;
        const sctx = shadowCanvas.getContext('2d');
        if (sctx) {
            const grad = sctx.createRadialGradient(128, 128, 20, 128, 128, 120);
            grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
            grad.addColorStop(0.45, 'rgba(0, 0, 0, 0.35)');
            grad.addColorStop(0.8, 'rgba(0, 0, 0, 0.08)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            sctx.fillStyle = grad;
            sctx.fillRect(0, 0, 256, 256);
        }

        const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
        this.shadowMaterial = new THREE.MeshBasicMaterial({
            map: shadowTexture,
            transparent: true,
            opacity: 0.7,
            depthWrite: false,
        });

        const shadowGeo = new THREE.PlaneGeometry(160, 290);
        this.shadowMesh = new THREE.Mesh(shadowGeo, this.shadowMaterial);
        this.shadowMesh.rotation.x = -Math.PI / 2;
        this.shadowMesh.rotation.z = this.restRotation.y;
        this.shadowMesh.position.set(this.restPosition.x, -444.8, this.restPosition.z);

        this.scene.add(this.shadowMesh);
    }

    setupEventListeners() {
        window.addEventListener('mousemove', (e) => {
            this.mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
            this.checkHover();
        });

        window.addEventListener('click', (e) => {
            // Ignore if clicking on UI buttons or modals
            const target = e.target as HTMLElement;
            if (target && target.closest('#prevent-click')) return;

            if (this.isHovered && !this.isPhotoOpen && !this.isCVOpen && !this.isAnimating) {
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
        const intersects = this.raycaster.intersectObjects([this.screenMesh, this.chassisMesh], false);

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

        if (this.currentTween) {
            this.currentTween.stop();
        }

        const targetLift = hovering ? 16 : 0;
        const targetColor = hovering ? 0xffffff : 0xeeeeee;
        const targetShadowOpacity = hovering ? 0.45 : 0.7;

        this.currentTween = new TWEEN.Tween(this.animProgress)
            .to({ lift: targetLift }, 250)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate(() => {
                this.phoneGroup.position.y = this.restPosition.y + this.animProgress.lift;
                this.shadowMaterial.opacity = targetShadowOpacity;
            })
            .start();

        this.screenMaterial.color.setHex(targetColor);
    }

    openPhoto() {
        if (this.isAnimating || this.isPhotoOpen) return;
        this.isPhotoOpen = true;
        this.isAnimating = true;

        document.body.style.cursor = 'default';

        // Lift and tilt phone slightly toward viewer
        new TWEEN.Tween(this.phoneGroup.position)
            .to({ y: this.restPosition.y + 40 }, 400)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();

        new TWEEN.Tween(this.phoneGroup.rotation)
            .to({ x: -0.15, y: -0.1 }, 400)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onComplete(() => {
                this.isAnimating = false;
            })
            .start();

        // Notify Camera and UI
        UIEventBus.dispatch('openPhoto', {});
    }

    closePhoto() {
        this.isPhotoOpen = false;
        this.isAnimating = true;

        new TWEEN.Tween(this.phoneGroup.position)
            .to({ x: this.restPosition.x, y: this.restPosition.y, z: this.restPosition.z }, 500)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .start();

        new TWEEN.Tween(this.phoneGroup.rotation)
            .to({ x: this.restRotation.x, y: this.restRotation.y, z: this.restRotation.z }, 500)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onComplete(() => {
                this.isAnimating = false;
                this.shadowMaterial.opacity = 0.7;
            })
            .start();
    }

    update() {
        // Subtle idle pulse / float animation when not hovered
        if (!this.isHovered && !this.isPhotoOpen && !this.isAnimating) {
            const time = performance.now() * 0.002;
            const floatOffset = Math.sin(time) * 0.6;
            this.phoneGroup.position.y = this.restPosition.y + floatOffset;
        }
    }
}

