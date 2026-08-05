'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, CheckCircle2, Sparkles, SwitchCamera, Upload } from 'lucide-react';
import styles from './CameraCapture.module.css';

interface CameraCaptureProps {
  onCapture: (imageSrc: string) => void;
  label: string;
}

export default function CameraCapture({ onCapture, label }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isHandDetected, setIsHandDetected] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isMobile, setIsMobile] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  const handDetectionTimer = useRef<NodeJS.Timeout | null>(null);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (handDetectionTimer.current) clearTimeout(handDetectionTimer.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    setDetecting(false);
    setIsHandDetected(false);
    setCountdown(null);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      const maxSize = 600;
      let width = video.videoWidth || 640;
      let height = video.videoHeight || 480;

      if (width > height) {
        if (width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (context) {
        // Mirror if using front camera
        if (facingMode === 'user') {
          context.translate(width, 0);
          context.scale(-1, 1);
        }
        context.drawImage(video, 0, 0, width, height);
        const imageSrc = canvas.toDataURL('image/jpeg', 0.7);
        setCapturedImage(imageSrc);
        onCapture(imageSrc);
        stopCamera();
      }
    }
  }, [facingMode, onCapture, stopCamera]);

  const startCamera = async (overrideFacing?: 'user' | 'environment') => {
    const targetFacing = overrideFacing || facingMode;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    try {
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: targetFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch (firstErr) {
        // Fallback for devices without strict facingMode support
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      }
      setStream(mediaStream);
      setDetecting(true);
      setCameraError(false);
    } catch (err) {
      console.error('Error accessing camera', err);
      setCameraError(true);
    }
  };

  const toggleCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    if (stream) {
      startCamera(nextFacing);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageSrc = event.target?.result as string;
        if (imageSrc) {
          setCapturedImage(imageSrc);
          onCapture(imageSrc);
          stopCamera();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load MediaPipe Hands dynamically when stream starts
  useEffect(() => {
    if (!stream || !detecting) return;

    let isSubscribed = true;
    let cameraInstance: any = null;

    async function initMediaPipe() {
      try {
        const handsModule = await import('@mediapipe/hands');
        const cameraModule = await import('@mediapipe/camera_utils');

        if (!isSubscribed || !videoRef.current) return;

        const hands = new handsModule.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 0, // Lower complexity for faster mobile performance
          minDetectionConfidence: 0.55,
          minTrackingConfidence: 0.55,
        });

        let countdownActive = false;

        hands.onResults((results) => {
          if (!isSubscribed) return;

          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            setIsHandDetected(true);

            if (!countdownActive) {
              countdownActive = true;
              let currentCount = 3;
              setCountdown(3);

              countdownInterval.current = setInterval(() => {
                currentCount -= 1;
                if (currentCount > 0) {
                  setCountdown(currentCount);
                } else {
                  if (countdownInterval.current) clearInterval(countdownInterval.current);
                  capturePhoto();
                }
              }, 1000);
            }
          } else {
            setIsHandDetected(false);
            if (countdownActive) {
              countdownActive = false;
              if (countdownInterval.current) clearInterval(countdownInterval.current);
              setCountdown(null);
            }
          }
        });

        cameraInstance = new cameraModule.Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current && isSubscribed) {
              try {
                await hands.send({ image: videoRef.current });
              } catch (e) {}
            }
          },
          width: 640,
          height: 480,
        });

        cameraInstance.start();
      } catch (err) {
        console.warn('MediaPipe Init Warning (Manual capture still active):', err);
      }
    }

    initMediaPipe();

    return () => {
      isSubscribed = false;
      if (cameraInstance) {
        try { cameraInstance.stop(); } catch (e) {}
      }
    };
  }, [stream, detecting, capturePhoto]);

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  return (
    <div className={styles.captureContainer}>
      <h3 className={styles.label}>{label}</h3>

      {!capturedImage ? (
        <div className={`${styles.cameraBox} ${stream ? styles.cameraBoxActive : ''}`}>
          {!stream && !cameraError ? (
            <div className={styles.startActions}>
              <button className={styles.startBtn} onClick={() => startCamera()}>
                <Camera size={isMobile ? 36 : 32} />
                <span>Scan with Camera</span>
                <span className={styles.subHint}>
                  {isMobile ? 'Tap to open camera — show your palm' : 'Auto-scans or snap manually'}
                </span>
              </button>

              <div className={styles.divider}>OR</div>

              <button className={styles.uploadBtn} onClick={() => fileInputRef.current?.click()}>
                <Upload size={20} />
                <span>Upload from Gallery</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className={styles.fileInput}
                onChange={handleFileUpload}
              />
            </div>
          ) : cameraError ? (
            <div className={styles.startActions}>
              <div className={styles.cameraErrorMsg}>
                <Camera size={36} />
                <span>Camera access denied or unavailable</span>
                <span className={styles.subHint}>
                  Please allow camera permission or upload a photo instead
                </span>
              </div>
              <button className={styles.uploadBtn} onClick={() => fileInputRef.current?.click()}>
                <Upload size={20} />
                <span>Upload Palm Photo</span>
              </button>
              <button className={styles.retryBtn} onClick={() => { setCameraError(false); startCamera(); }}>
                <RefreshCw size={16} />
                <span>Retry Camera</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className={styles.fileInput}
                onChange={handleFileUpload}
              />
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`${styles.video} ${facingMode === 'user' ? styles.mirrored : ''}`}
              />

              {/* Hand Detection Overlay Frame */}
              <div className={`${styles.handGuideFrame} ${isHandDetected ? styles.detected : ''}`}>
                <div className={styles.guideCornerTopLeft} />
                <div className={styles.guideCornerTopRight} />
                <div className={styles.guideCornerBottomLeft} />
                <div className={styles.guideCornerBottomRight} />

                {isHandDetected ? (
                  <div className={styles.detectionBadge}>
                    <CheckCircle2 size={16} />
                    <span>Hand Aligned</span>
                  </div>
                ) : (
                  <div className={styles.detectionBadgePending}>
                    <Sparkles size={16} />
                    <span>Place Palm Inside Frame</span>
                  </div>
                )}
              </div>

              {/* Camera Switch Toggle */}
              <button
                className={styles.switchCamBtn}
                onClick={toggleCamera}
                title="Switch Camera (Front/Back)"
              >
                <SwitchCamera size={20} />
              </button>

              {/* Countdown Animation */}
              {countdown !== null && (
                <div className={styles.countdownOverlay}>
                  <div className={styles.countdownNumber}>{countdown}</div>
                  <span className={styles.countdownText}>Hold Still...</span>
                </div>
              )}

              {/* Manual Snap Button */}
              <button className={styles.captureBtn} onClick={capturePhoto} title="Manual Snap">
                <div className={styles.captureInner} />
              </button>
            </>
          )}
        </div>
      ) : (
        <div className={styles.resultBox}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={capturedImage} alt="Captured Hand" className={styles.preview} />
          <button className={styles.retakeBtn} onClick={retake}>
            <RefreshCw size={18} />
            <span>Retake / Change</span>
          </button>
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
