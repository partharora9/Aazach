import * as THREE from 'three';
import Application from '../Application';
import Camera from '../Camera/Camera';
import TWEEN from '@tweenjs/tween.js';
import UIEventBus from '../UI/EventBus';

export default class PaperCV {
    application: Application;
    camera: Camera;
    scene: THREE.Scene;
    decorGroup: THREE.Group;
    paperMesh: THREE.Mesh | null = null;

    // Rest transforms
    restPosition: THREE.Vector3 = new THREE.Vector3();
    restRotation: THREE.Euler = new THREE.Euler();
    restScale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);

    // Dynamic paper texture & material
    canvas: HTMLCanvasElement;
    paperTexture: THREE.CanvasTexture;
    paperMaterial: THREE.MeshBasicMaterial;

    // Interaction state
    raycaster: THREE.Raycaster;
    mouseNDC: THREE.Vector2;
    isHovered: boolean = false;
    isCVOpen: boolean = false;
    isAnimating: boolean = false;
    hoverLiftOffset: number = 0;

    // Animation progress (0 = on desk, 1 = floating in front of camera)
    animProgress = { value: 0 };
    currentTween: any = null;

    constructor(decorGroup: THREE.Group) {
        this.application = new Application();
        this.camera = this.application.camera;
        this.scene = this.application.scene;
        this.decorGroup = decorGroup;

        this.raycaster = new THREE.Raycaster();
        this.mouseNDC = new THREE.Vector2(-999, -999);

        this.setupPaperMesh();
        this.setupEventListeners();
    }

    setupPaperMesh() {
        const mesh = this.decorGroup.getObjectByName('paper');
        if (!mesh || !(mesh instanceof THREE.Mesh)) {
            console.warn('[PaperCV] "paper" mesh not found in decor model.');
            return;
        }

        this.paperMesh = mesh;

        // Center the geometry so scaling and rotating occurs around the paper's center
        this.paperMesh.geometry = this.paperMesh.geometry.clone();
        this.paperMesh.geometry.computeBoundingBox();
        const box = this.paperMesh.geometry.boundingBox;
        if (box) {
            const center = new THREE.Vector3();
            box.getCenter(center);

            // Center geometry vertices
            this.paperMesh.geometry.center();

            // Set mesh position to match scaled center
            const scale = this.paperMesh.scale.x || 900;
            this.paperMesh.position.set(
                center.x * scale,
                center.y * scale,
                center.z * scale
            );
        }

        // Remap UV coordinates so the full high-res CV texture covers the sheet
        const uvAttr = this.paperMesh.geometry.getAttribute('uv') as THREE.BufferAttribute;
        if (uvAttr && uvAttr.count >= 4) {
            uvAttr.setXY(0, 0, 1);
            uvAttr.setXY(1, 0, 0);
            uvAttr.setXY(2, 1, 1);
            uvAttr.setXY(3, 1, 0);
            uvAttr.needsUpdate = true;
        }

        // Generate crisp CV preview canvas texture
        this.createCVCanvasTexture();

        // Dedicated material for the paper sheet
        this.paperMaterial = new THREE.MeshBasicMaterial({
            map: this.paperTexture,
            side: THREE.DoubleSide,
            color: 0xffffff,
        });

        this.paperMesh.material = this.paperMaterial;

        // Store original resting transform
        this.restPosition.copy(this.paperMesh.position);
        this.restRotation.copy(this.paperMesh.rotation);
        this.restScale.copy(this.paperMesh.scale);
    }

    createCVCanvasTexture() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 1200;
        this.canvas.height = 1700; // Standard A4 aspect ratio (1 : 1.414)
        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;

        // Crisp white paper background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Subtle paper border
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 4;
        ctx.strokeRect(8, 8, this.canvas.width - 16, this.canvas.height - 16);

        // Header: Name
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 58px "Georgia", serif';
        ctx.textAlign = 'center';
        ctx.fillText('ANTRIKSH', 600, 110);

        // Header: Title
        ctx.font = '600 24px "Segoe UI", -apple-system, sans-serif';
        ctx.fillStyle = '#000080';
        ctx.fillText('Motion Graphics Designer | Video Editor | Graphic Designer', 600, 155);

        // Header: Contact Info
        ctx.font = '17px "Segoe UI", -apple-system, sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('H No-31, Aliganj, Kotla Mubarakpur, South Delhi, Delhi, 110003', 600, 195);
        ctx.fillText('+91 98717 84187  |  devbaisoya36@gmail.com  |  behance.net/devbaisoya', 600, 225);

        // Divider
        ctx.strokeStyle = '#000080';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(100, 255);
        ctx.lineTo(1100, 255);
        ctx.stroke();

        ctx.textAlign = 'left';

        // SECTION 1: PROFESSIONAL SUMMARY
        let y = 300;
        ctx.font = 'bold 22px "Segoe UI", sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText('PROFESSIONAL SUMMARY', 100, y);
        y += 8;
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(100, y);
        ctx.lineTo(1100, y);
        ctx.stroke();
        y += 28;

        ctx.font = '16px "Segoe UI", sans-serif';
        ctx.fillStyle = '#334155';
        const summaryLines = [
            'Creative and detail-oriented visual designer specializing in Motion Graphics, Video Editing, and Graphic Design.',
            'Skilled in creating engaging visual content, animated graphics, promotional videos, and digital designs.',
            'Proficient in Adobe After Effects, Premiere Pro, Photoshop, and Illustrator, with a strong interest in visual storytelling,',
            'animation, and creative content production. Eager to contribute creative ideas and technical skills to a professional team.'
        ];
        summaryLines.forEach((line) => {
            ctx.fillText(line, 100, y);
            y += 24;
        });

        // SECTION 2: CORE SKILLS
        y += 20;
        ctx.font = 'bold 22px "Segoe UI", sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText('CORE SKILLS', 100, y);
        y += 8;
        ctx.strokeStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(100, y);
        ctx.lineTo(1100, y);
        ctx.stroke();
        y += 28;

        const skills = [
            '• Motion Graphics & 2D Animation',
            '• Video Editing & Post-Production',
            '• Graphic Design & Visual Communication',
            '• Logo Animation & Kinetic Typography',
            '• Social Media Creatives & Promotional Content',
            '• Visual Storytelling & Composition',
            '• VFX Compositing & Editing'
        ];
        ctx.font = '16px "Segoe UI", sans-serif';
        ctx.fillStyle = '#334155';
        for (let i = 0; i < skills.length; i++) {
            const col = i < 4 ? 120 : 620;
            const rowY = y + (i % 4) * 26;
            ctx.fillText(skills[i], col, rowY);
        }
        y += 4 * 26 + 20;

        // SECTION 3: SOFTWARE PROFICIENCY
        ctx.font = 'bold 22px "Segoe UI", sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText('SOFTWARE PROFICIENCY', 100, y);
        y += 8;
        ctx.strokeStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(100, y);
        ctx.lineTo(1100, y);
        ctx.stroke();
        y += 28;

        const tools = [
            '• Adobe After Effects — Motion Graphics & Animation',
            '• Adobe Premiere Pro — Video Editing & Post-Production',
            '• Adobe Photoshop — Image Editing & Digital Design',
            '• Adobe Illustrator — Vector Graphics & Design'
        ];
        ctx.font = '16px "Segoe UI", sans-serif';
        ctx.fillStyle = '#334155';
        tools.forEach((t) => {
            ctx.fillText(t, 120, y);
            y += 25;
        });

        // SECTION 4: EDUCATION
        y += 20;
        ctx.font = 'bold 22px "Segoe UI", sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText('EDUCATION', 100, y);
        y += 8;
        ctx.strokeStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(100, y);
        ctx.lineTo(1100, y);
        ctx.stroke();
        y += 28;

        const education = [
            { deg: 'Bachelor of Arts (BA)', inst: 'PGDAV College, University of Delhi', year: 'Pursuing' },
            { deg: 'VFX Compositing & Editing', inst: 'Arena Animation, South Extension', year: '2024–2025' },
            { deg: 'Senior Secondary Education (Class XII)', inst: 'National Institute of Open Schooling (NIOS)', year: '2021' }
        ];
        education.forEach((e) => {
            ctx.font = 'bold 16px "Segoe UI", sans-serif';
            ctx.fillStyle = '#0f172a';
            ctx.fillText(`• ${e.deg}`, 120, y);
            ctx.font = '15px "Segoe UI", sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.fillText(e.inst, 140, y + 20);
            ctx.textAlign = 'right';
            ctx.fillText(e.year, 1080, y);
            ctx.textAlign = 'left';
            y += 45;
        });

        // SECTION 5: CAREER OBJECTIVE
        y += 15;
        ctx.font = 'bold 22px "Segoe UI", sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText('CAREER OBJECTIVE', 100, y);
        y += 8;
        ctx.strokeStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(100, y);
        ctx.lineTo(1100, y);
        ctx.stroke();
        y += 28;

        ctx.font = 'italic 16px "Georgia", serif';
        ctx.fillStyle = '#334155';
        ctx.fillText(
            '"To join a creative team as a Motion Graphics Designer, contributing to animation, video production,',
            120,
            y
        );
        ctx.fillText(
            'and visual design projects while continuously developing my skills in motion design and post-production."',
            120,
            y + 24
        );


        this.paperTexture = new THREE.CanvasTexture(this.canvas);
        this.paperTexture.encoding = THREE.sRGBEncoding;
        this.paperTexture.minFilter = THREE.LinearFilter;
        this.paperTexture.magFilter = THREE.LinearFilter;
        this.paperTexture.generateMipmaps = true;
    }

    setupEventListeners() {
        // Track pointer movement for raycasting
        window.addEventListener('pointermove', (e) => {
            this.mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        // Handle paper click
        window.addEventListener('pointerdown', (e) => {
            if (this.isHovered && !this.isCVOpen && !this.isAnimating) {
                e.preventDefault();
                e.stopPropagation();
                this.openCV();
            }
        });

        // Listen for close event from UI
        UIEventBus.on('closeCV', () => {
            this.closeCV();
        });
    }

    openCV() {
        if (!this.paperMesh || this.isAnimating || this.isCVOpen) return;

        this.isCVOpen = true;
        this.isAnimating = true;

        // Notify UI to open CV overlay and lock camera
        UIEventBus.dispatch('openCV', {});

        // Check prefers-reduced-motion
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            this.isAnimating = false;
            UIEventBus.dispatch('paperAnimComplete', {});
            return;
        }

        // Animate paper lift, rotate, and scale toward the camera
        if (this.currentTween) this.currentTween.stop();

        this.animProgress.value = 0;
        this.currentTween = new TWEEN.Tween(this.animProgress)
            .to({ value: 1 }, 750)
            .easing(TWEEN.Easing.Cubic.Out)
            .onUpdate(() => {
                this.applyAnimationTransform(this.animProgress.value);
            })
            .onComplete(() => {
                this.isAnimating = false;
                UIEventBus.dispatch('paperAnimComplete', {});
            })
            .start();
    }

    closeCV() {
        if (!this.paperMesh || !this.isCVOpen) return;

        this.isAnimating = true;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            this.paperMesh.position.copy(this.restPosition);
            this.paperMesh.rotation.copy(this.restRotation);
            this.paperMesh.scale.copy(this.restScale);
            this.isCVOpen = false;
            this.isAnimating = false;
            return;
        }

        if (this.currentTween) this.currentTween.stop();

        this.currentTween = new TWEEN.Tween(this.animProgress)
            .to({ value: 0 }, 650)
            .easing(TWEEN.Easing.Cubic.InOut)
            .onUpdate(() => {
                this.applyAnimationTransform(this.animProgress.value);
            })
            .onComplete(() => {
                this.isCVOpen = false;
                this.isAnimating = false;
                this.paperMesh!.position.copy(this.restPosition);
                this.paperMesh!.rotation.copy(this.restRotation);
                this.paperMesh!.scale.copy(this.restScale);
            })
            .start();
    }

    applyAnimationTransform(t: number) {
        if (!this.paperMesh) return;

        // Compute a floating target position in front of the camera
        const cameraPos = this.camera.instance.position;
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
            this.camera.instance.quaternion
        );
        const targetPos = cameraPos.clone().add(forward.multiplyScalar(2200));

        // Lift, rotate flat facing camera, and scale up
        this.paperMesh.position.lerpVectors(this.restPosition, targetPos, t);

        // Smooth rotation interpolation
        const restEuler = this.restRotation;
        const targetEuler = this.camera.instance.rotation;

        this.paperMesh.rotation.x = THREE.MathUtils.lerp(restEuler.x, targetEuler.x, t);
        this.paperMesh.rotation.y = THREE.MathUtils.lerp(restEuler.y, targetEuler.y, t);
        this.paperMesh.rotation.z = THREE.MathUtils.lerp(restEuler.z, targetEuler.z, t);

        // Scale up towards viewer
        const targetScaleVal = this.restScale.x * 2.1;
        const currentScale = THREE.MathUtils.lerp(this.restScale.x, targetScaleVal, t);
        this.paperMesh.scale.set(currentScale, currentScale, currentScale);
    }

    update() {
        if (!this.paperMesh || this.isCVOpen || this.isAnimating) return;

        // Raycasting for hover state
        this.raycaster.setFromCamera(this.mouseNDC, this.camera.instance);
        const intersects = this.raycaster.intersectObject(this.paperMesh);

        if (intersects.length > 0) {
            if (!this.isHovered) {
                this.isHovered = true;
                document.body.style.cursor = 'pointer';
            }

            // Subtle paper lift on hover
            this.hoverLiftOffset = THREE.MathUtils.lerp(this.hoverLiftOffset, 28, 0.15);
            this.paperMesh.position.y = this.restPosition.y + this.hoverLiftOffset;
        } else {
            if (this.isHovered) {
                this.isHovered = false;
                document.body.style.cursor = '';
            }

            // Return to rest position
            if (this.hoverLiftOffset > 0.05) {
                this.hoverLiftOffset = THREE.MathUtils.lerp(this.hoverLiftOffset, 0, 0.15);
                this.paperMesh.position.y = this.restPosition.y + this.hoverLiftOffset;
            } else {
                this.paperMesh.position.y = this.restPosition.y;
            }
        }
    }
}

