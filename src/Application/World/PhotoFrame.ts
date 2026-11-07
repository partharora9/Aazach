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
    matMesh: THREE.Group;
    thumbMesh: THREE.Mesh;
    photoMesh: THREE.Mesh;
    glassMesh: THREE.Mesh;
    easelMesh: THREE.Mesh;
    shadowMesh: THREE.Mesh;

    // Materials
    frameMaterial: THREE.MeshBasicMaterial;
    matMaterial: THREE.MeshBasicMaterial;
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

    // Blurred 20px placeholder data-URI for zero-delay first render
    placeholderDataUri =
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCAAgABgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDzwDNOMZA6U22DO4A6mta7sHgsxMDn1qXJIpRbMhvvCiiQEnIGAaKBGraWSpcbsEoOlaptpLm0fzJAq54HrWUJ2jPWnx3NxO20MSB2qJpvUpO2hSvI3gzG68DoaKsTTed8j8gUVZB//9k=';

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
            color: 0x241d18,
            toneMapped: false,
        });

        // 2. Fine textured cream archival mat (passé-partout)
        this.matMaterial = new THREE.MeshBasicMaterial({
            color: 0xf6f3ed,
            toneMapped: false,
        });

        // 3. Blurred placeholder photo material
        this.thumbMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            toneMapped: false,
            side: THREE.FrontSide,
        });

        // 4. Sharp full-res photo material (starts transparent, fades in)
        this.photoMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0,
            toneMapped: false,
            side: THREE.FrontSide,
        });

        // 5. Very faint protective glass layer (< 0.08 opacity, soft reflection sheen)
        const glassCanvas = document.createElement('canvas');
        glassCanvas.width = 256;
        glassCanvas.height = 340;
        const gctx = glassCanvas.getContext('2d');
        if (gctx) {
            const grad = gctx.createLinearGradient(0, 0, 256, 340);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
            grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.05)');
            grad.addColorStop(0.65, 'rgba(255, 255, 255, 0.0)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
            gctx.fillStyle = grad;
            gctx.fillRect(0, 0, 256, 340);
        }
        this.glassTexture = new THREE.CanvasTexture(glassCanvas);

        this.glassMaterial = new THREE.MeshBasicMaterial({
            map: this.glassTexture,
            transparent: true,
            opacity: 0.05, // Faint glass layer keeping photo 100% crisp and readable
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
        // 10 degree backward tilt so the photo faces the camera naturally from desk
        this.tiltGroup.rotation.x = -0.1745;
        this.frameGroup.add(this.tiltGroup);

        const frameW = 200;
        const frameH = 260;
        const frameD = 12;
        const borderT = 20;

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

        // Dark felt backboard behind the photo (Z = -4.5)
        const backboard = new THREE.Mesh(
            new THREE.BoxGeometry(frameW - 6, frameH - 6, 3),
            new THREE.MeshBasicMaterial({ color: 0x141210, toneMapped: false })
        );
        backboard.position.set(0, frameH / 2, -frameD / 2 + 1.5);
        this.outerFrameGroup.add(backboard);

        this.tiltGroup.add(this.outerFrameGroup);

        // Cream Mat (Passé-Partout) with 120x160 Cutout at Z = 0.5
        this.matMesh = new THREE.Group();
        const matOuterW = frameW - borderT * 2; // 160
        const matOuterH = frameH - borderT * 2; // 220
        const photoOpenW = 120;
        const photoOpenH = 160;
        const matMarginX = (matOuterW - photoOpenW) / 2; // 20
        const matMarginY = (matOuterH - photoOpenH) / 2; // 30
        const matYCenter = frameH / 2; // 130

        // Mat top border
        const mTop = new THREE.Mesh(
            new THREE.PlaneGeometry(matOuterW, matMarginY),
            this.matMaterial
        );
        mTop.position.set(0, matYCenter + photoOpenH / 2 + matMarginY / 2, 0.5);
        this.matMesh.add(mTop);

        // Mat bottom border
        const mBottom = new THREE.Mesh(
            new THREE.PlaneGeometry(matOuterW, matMarginY),
            this.matMaterial
        );
        mBottom.position.set(0, matYCenter - photoOpenH / 2 - matMarginY / 2, 0.5);
        this.matMesh.add(mBottom);

        // Mat left border
        const mLeft = new THREE.Mesh(
            new THREE.PlaneGeometry(matMarginX, photoOpenH),
            this.matMaterial
        );
        mLeft.position.set(-photoOpenW / 2 - matMarginX / 2, matYCenter, 0.5);
        this.matMesh.add(mLeft);

        // Mat right border
        const mRight = new THREE.Mesh(
            new THREE.PlaneGeometry(matMarginX, photoOpenH),
            this.matMaterial
        );
        mRight.position.set(photoOpenW / 2 + matMarginX / 2, matYCenter, 0.5);
        this.matMesh.add(mRight);

        this.tiltGroup.add(this.matMesh);

        // Photo Planes (Positioned right in the cutout opening)
        // 1. Blurred placeholder plane at Z = 0.502 (in front of mat, zero z-fighting)
        const photoGeo = new THREE.PlaneGeometry(photoOpenW, photoOpenH);
        this.thumbMesh = new THREE.Mesh(photoGeo, this.thumbMaterial);
        this.thumbMesh.position.set(0, matYCenter, 0.502);
        this.tiltGroup.add(this.thumbMesh);

        // 2. High-res photo plane at Z = 0.505 (sits in front, ready to fade in)
        this.photoMesh = new THREE.Mesh(photoGeo, this.photoMaterial);
        this.photoMesh.position.set(0, matYCenter, 0.505);
        this.tiltGroup.add(this.photoMesh);

        // 3. Protective Glass Layer at Z = 0.8
        const glassGeo = new THREE.PlaneGeometry(matOuterW, matOuterH);
        this.glassMesh = new THREE.Mesh(glassGeo, this.glassMaterial);
        this.glassMesh.position.set(0, matYCenter, 0.8);
        this.tiltGroup.add(this.glassMesh);

        // 4. Back Easel Leg (strut resting on desk at Y = -445)
        const hingeY = 178;
        const legLength = 196;
        const legWidth = 16;
        const legThickness = 4;
        const easelGeo = new THREE.BoxGeometry(legWidth, legLength, legThickness);
        easelGeo.translate(0, -legLength / 2, 0);

        this.easelMesh = new THREE.Mesh(
            easelGeo,
            new THREE.MeshBasicMaterial({ color: 0x1f1915, toneMapped: false })
        );
        this.easelMesh.position.set(0, hingeY, -frameD / 2);
        this.easelMesh.rotation.x = 0.43; // ~ 24.6 degrees backwards
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
        // Completely disable raycasting on all frame meshes so clicks pass cleanly through
        const noopRaycast = () => {};
        this.frameGroup.traverse((child) => {
            child.raycast = noopRaycast;
        });
        if (this.shadowMesh) {
            this.shadowMesh.raycast = noopRaycast;
        }
    }

    loadTextures() {
        // 1. Load blurred thumbnail immediately for zero-delay initial view
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

                // "Cover" fit logic for 3:4 frame cutout (120x160):
                // Keeps Antriksh's face centered without any stretching or distortion
                const imgW = texture.image.width || 900;
                const imgH = texture.image.height || 1202;
                const imgAspect = imgW / imgH;
                const frameAspect = 120 / 160; // 0.75

                if (imgAspect > frameAspect) {
                    const scaleX = frameAspect / imgAspect;
                    texture.repeat.set(scaleX, 1);
                    texture.offset.set((1 - scaleX) / 2, 0);
                } else {
                    const scaleY = imgAspect / frameAspect;
                    texture.repeat.set(1, scaleY);
                    texture.offset.set(0, (1 - scaleY) * 0.45);
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
                        // Remove blurred placeholder once full photo is solid
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
