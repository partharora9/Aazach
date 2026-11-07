import * as THREE from 'three';
import Application from '../Application';
import TWEEN from '@tweenjs/tween.js';

export default class PhotoFrame {
    application: Application;
    scene: THREE.Scene;

    frameGroup: THREE.Group;
    tiltGroup: THREE.Group;

    // Meshes
    outerFrameGroup: THREE.Group;
    thumbMesh: THREE.Mesh;
    photoMesh: THREE.Mesh;
    glassMesh: THREE.Mesh;
    easelMesh: THREE.Mesh;
    shadowMesh: THREE.Mesh;

    // Materials
    frameMaterial: THREE.MeshBasicMaterial;
    thumbMaterial: THREE.MeshBasicMaterial;
    photoMaterial: THREE.MeshBasicMaterial;
    glassMaterial: THREE.MeshBasicMaterial;
    shadowMaterial: THREE.MeshBasicMaterial;

    // Textures
    thumbTexture: THREE.Texture | null = null;
    photoTexture: THREE.Texture | null = null;
    glassTexture: THREE.CanvasTexture;

    // Desk placement (right side of keyboard/mouse, in front of coffee mug)
    restPosition: THREE.Vector3 = new THREE.Vector3(1380, -445, 1280);
    restRotation: THREE.Euler = new THREE.Euler(0, -0.32, 0); // ~ -18 deg turned toward camera

    // Clean portrait placeholder base64 data-URI
    placeholderDataUri =
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCAAhABgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDzzpPc/nSlWC55ptuWZhgEk9B71q3dhNa2f2hvnGcSd9p9KltIpJsymJDrgniimyZ3/L36GigRqWNgovVyztCCPnQf41reRdahp0oLRRxAjjJywz7nis1bl1J3uWOOMmpBf3NwREMFRztRcfjUTTdilK10Zt2DDmCVCrxnPI5Ioq5czi6URy87ehPJFFWRcZJ/rB9KtaR/x+f8aiis6nwMuPxFJf9YfrRRRVkH//Z';

    constructor() {
        this.application = new Application();
        this.scene = this.application.scene;

        this.initMaterials();
        this.build3DFrame();
        this.createContactShadow();
        this.disableInteractions();
        this.loadTextures();
    }

    initMaterials() {
        // 1. Rich dark espresso walnut wood outer frame
        this.frameMaterial = new THREE.MeshBasicMaterial({
            color: 0x1e1814,
            toneMapped: false,
        });

        // 2. Blurred placeholder photo material
        this.thumbMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            toneMapped: false,
            side: THREE.FrontSide,
        });

        // 3. Sharp full-res photo material
        this.photoMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0,
            toneMapped: false,
            side: THREE.FrontSide,
        });

        // 4. Very faint protective glass layer (< 0.04 opacity)
        const glassCanvas = document.createElement('canvas');
        glassCanvas.width = 256;
        glassCanvas.height = 340;
        const gctx = glassCanvas.getContext('2d');
        if (gctx) {
            const grad = gctx.createLinearGradient(0, 0, 256, 340);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
            grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.03)');
            grad.addColorStop(0.65, 'rgba(255, 255, 255, 0.0)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0.10)');
            gctx.fillStyle = grad;
            gctx.fillRect(0, 0, 256, 340);
        }
        this.glassTexture = new THREE.CanvasTexture(glassCanvas);

        this.glassMaterial = new THREE.MeshBasicMaterial({
            map: this.glassTexture,
            transparent: true,
            opacity: 0.035,
            depthWrite: false,
            side: THREE.FrontSide,
            toneMapped: false,
        });
    }

    build3DFrame() {
        this.frameGroup = new THREE.Group();
        this.frameGroup.position.copy(this.restPosition);
        this.frameGroup.rotation.copy(this.restRotation);

        this.tiltGroup = new THREE.Group();
        // 10 degree backward tilt so the photo faces the camera naturally from the desk
        this.tiltGroup.rotation.x = -0.1745;
        this.frameGroup.add(this.tiltGroup);

        const frameW = 186;
        const frameH = 246;
        const frameD = 10;
        const borderT = 12; // Sleek 12-unit outer wood molding

        this.outerFrameGroup = new THREE.Group();

        // Outer Frame: Top bar
        const topBar = new THREE.Mesh(
            new THREE.BoxGeometry(frameW, borderT, frameD),
            this.frameMaterial
        );
        topBar.position.set(0, frameH - borderT / 2, 0);
        this.outerFrameGroup.add(topBar);

        // Outer Frame: Bottom bar
        const bottomBar = new THREE.Mesh(
            new THREE.BoxGeometry(frameW, borderT, frameD),
            this.frameMaterial
        );
        bottomBar.position.set(0, borderT / 2, 0);
        this.outerFrameGroup.add(bottomBar);

        // Outer Frame: Left bar
        const sideH = frameH - borderT * 2;
        const leftBar = new THREE.Mesh(
            new THREE.BoxGeometry(borderT, sideH, frameD),
            this.frameMaterial
        );
        leftBar.position.set(-frameW / 2 + borderT / 2, frameH / 2, 0);
        this.outerFrameGroup.add(leftBar);

        // Outer Frame: Right bar
        const rightBar = new THREE.Mesh(
            new THREE.BoxGeometry(borderT, sideH, frameD),
            this.frameMaterial
        );
        rightBar.position.set(frameW / 2 - borderT / 2, frameH / 2, 0);
        this.outerFrameGroup.add(rightBar);

        // Dark felt backboard behind the photo
        const backboard = new THREE.Mesh(
            new THREE.BoxGeometry(frameW - 4, frameH - 4, 2),
            new THREE.MeshBasicMaterial({ color: 0x141210, toneMapped: false })
        );
        backboard.position.set(0, frameH / 2, -frameD / 2 + 1);
        this.outerFrameGroup.add(backboard);

        this.tiltGroup.add(this.outerFrameGroup);

        // Photo Planes (162x222 edge-to-edge inside the frame opening with zero white background)
        const photoW = frameW - borderT * 2; // 162
        const photoH = frameH - borderT * 2; // 222
        const photoYCenter = frameH / 2; // 123
        const photoGeo = new THREE.PlaneGeometry(photoW, photoH);

        // 1. Blurred placeholder plane at Z = 0.502
        this.thumbMesh = new THREE.Mesh(photoGeo, this.thumbMaterial);
        this.thumbMesh.position.set(0, photoYCenter, 0.502);
        this.tiltGroup.add(this.thumbMesh);

        // 2. High-res photo plane at Z = 0.505
        this.photoMesh = new THREE.Mesh(photoGeo, this.photoMaterial);
        this.photoMesh.position.set(0, photoYCenter, 0.505);
        this.tiltGroup.add(this.photoMesh);

        // 3. Faint protective glass layer at Z = 0.75
        this.glassMesh = new THREE.Mesh(photoGeo, this.glassMaterial);
        this.glassMesh.position.set(0, photoYCenter, 0.75);
        this.tiltGroup.add(this.glassMesh);

        // 4. Back Easel Leg (strut resting on desk at Y = -445)
        const hingeY = 168;
        const legLength = 186;
        const legWidth = 14;
        const legThickness = 4;
        const easelGeo = new THREE.BoxGeometry(legWidth, legLength, legThickness);
        easelGeo.translate(0, -legLength / 2, 0);

        this.easelMesh = new THREE.Mesh(
            easelGeo,
            new THREE.MeshBasicMaterial({ color: 0x1f1915, toneMapped: false })
        );
        this.easelMesh.position.set(0, hingeY, -frameD / 2);
        this.easelMesh.rotation.x = 0.43; // ~ 24.6 degrees backwards to touch desk surface
        this.outerFrameGroup.add(this.easelMesh);

        this.scene.add(this.frameGroup);
    }

    createContactShadow() {
        const shadowCanvas = document.createElement('canvas');
        shadowCanvas.width = 256;
        shadowCanvas.height = 256;
        const sctx = shadowCanvas.getContext('2d');
        if (sctx) {
            const linGrad = sctx.createLinearGradient(0, 100, 0, 160);
            linGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
            linGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.65)');
            linGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            sctx.fillStyle = linGrad;
            sctx.fillRect(30, 100, 196, 60);

            const radGrad = sctx.createRadialGradient(128, 140, 10, 128, 140, 110);
            radGrad.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
            radGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
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
            toneMapped: false,
        });

        const shadowGeo = new THREE.PlaneGeometry(240, 260);
        this.shadowMesh = new THREE.Mesh(shadowGeo, this.shadowMaterial);
        this.shadowMesh.rotation.x = -Math.PI / 2;
        this.shadowMesh.rotation.z = this.restRotation.y;
        this.shadowMesh.position.set(this.restPosition.x, -444.8, this.restPosition.z - 30);

        this.scene.add(this.shadowMesh);
    }

    disableInteractions() {
        const noopRaycast = () => {};
        this.frameGroup.traverse((child) => {
            child.raycast = noopRaycast;
        });
        if (this.shadowMesh) {
            this.shadowMesh.raycast = noopRaycast;
        }
    }

    loadTextures() {
        // 1. Load blurred thumbnail immediately for zero-delay first view
        const thumbImg = new Image();
        thumbImg.onload = () => {
            const tex = new THREE.Texture(thumbImg);
            tex.encoding = THREE.sRGBEncoding;
            tex.generateMipmaps = true;
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.needsUpdate = true;
            this.thumbTexture = tex;
            this.thumbMaterial.map = tex;
            this.thumbMaterial.needsUpdate = true;
        };
        thumbImg.src = this.placeholderDataUri;

        // 2. Load high-resolution portrait photo via THREE.TextureLoader
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            '/images/profile-photo.jpg',
            (texture) => {
                texture.encoding = THREE.sRGBEncoding;
                texture.generateMipmaps = true;
                texture.minFilter = THREE.LinearMipmapLinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.anisotropy = 16;

                // "Cover" fit logic for 162x222 frame opening:
                // Image: 900x1227 (0.7335 aspect), Frame: 162x222 (0.7297 aspect)
                const imgW = texture.image.width || 900;
                const imgH = texture.image.height || 1227;
                const imgAspect = imgW / imgH;
                const frameAspect = 162 / 222;

                if (imgAspect > frameAspect) {
                    const scaleX = frameAspect / imgAspect;
                    texture.repeat.set(scaleX, 1);
                    texture.offset.set((1 - scaleX) / 2, 0);
                } else {
                    const scaleY = imgAspect / frameAspect;
                    texture.repeat.set(1, scaleY);
                    texture.offset.set(0, (1 - scaleY) * 0.4);
                }
                texture.needsUpdate = true;

                this.photoTexture = texture;
                this.photoMaterial.map = texture;
                this.photoMaterial.needsUpdate = true;

                // Slow, clean progressive reveal over 2.8 seconds
                const prefersReducedMotion =
                    window.matchMedia &&
                    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                const duration = prefersReducedMotion ? 400 : 2800;

                new TWEEN.Tween(this.photoMaterial)
                    .to({ opacity: 1.0 }, duration)
                    .easing(TWEEN.Easing.Cubic.Out)
                    .onComplete(() => {
                        this.photoMaterial.transparent = false;
                        this.photoMaterial.needsUpdate = true;
                        if (this.thumbMesh.parent) {
                            this.thumbMesh.parent.remove(this.thumbMesh);
                        }
                    })
                    .start();
            },
            undefined,
            (err) => {
                console.error('[PhotoFrame] Error loading /images/profile-photo.jpg:', err);
            }
        );
    }

    update() {}
}
