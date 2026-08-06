'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, RefreshCw, CheckCircle2, Sparkles, SwitchCamera, Upload } from 'lucide-react';
import styles from './CameraCapture.module.css';

interface CameraCaptureProps {
  onCapture: (imageSrc: string) => void;
  label: string;
}

export default function CameraCapture({ onCapture, label }: CameraCaptureProps) {
  const { t } = useTranslation();
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

      // Keep palm images small to avoid Vercel 413 Request Entity Too Large
      const maxSize = 480;
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
        const imageSrc = canvas.toDataURL('image/jpeg', 0.6);
        setCapturedImage(imageSrc);
        onCapture(imageSrc);
        stopCamera();
      }
    }
  }, [facingMode, onCapture, stopCamera]);

  const startCamera = async (overrideFacing?: 'user' | 'environment') => {
    const targetFacing = overrideFacing || facingMode;

    // Stop any existing stream first and clear state
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setDetecting(false);
    setIsHandDetected(false);
    setCountdown(null);
    setCameraError(false);

    try {
      let mediaStream: MediaStream | null = null;

      // Strategy 1: exact facing mode (best for mobile switching)
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: targetFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch (exactErr) {
        console.warn(`Exact ${targetFacing} camera not available, trying preferred constraint`);
      }

      // Strategy 2: preferred facing mode
      if (!mediaStream) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: targetFacing,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });
        } catch (preferredErr) {
          console.warn(`Preferred ${targetFacing} camera failed, falling back to any camera`);
        }
      }

      // Strategy 3: any camera
      if (!mediaStream) {
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
      setDetecting(false);
    }
  };

  const toggleCamera = async () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    if (stream || capturedImage === null) {
      await startCamera(nextFacing);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageSrc = event.target?.result as string;
      if (!imageSrc) return;
      compressImage(imageSrc, 480, 0.6).then((compressed) => {
        setCapturedImage(compressed);
        onCapture(compressed);
        stopCamera();
      }).catch(() => {
        setCapturedImage(imageSrc);
        onCapture(imageSrc);
        stopCamera();
      });
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset input so same file can be selected again
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

  const compressImage = (dataUrl: string, maxSize: number, quality: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

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

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context not available'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
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
                <span>{t('camera_scan')}</span>
                <span className={styles.subHint}>
                  {isMobile ? t('camera_hint_mobile') : t('camera_hint_desktop')}
                </span>
              </button>

              <div className={styles.divider}>{t('camera_or')}</div>

              <button className={styles.uploadBtn} onClick={() => fileInputRef.current?.click()}>
                <Upload size={20} />
                <span>{t('camera_upload')}</span>
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
                <span>{t('camera_err_title')}</span>
                <span className={styles.subHint}>
                  {t('camera_err_hint')}
                </span>
              </div>
              <button className={styles.uploadBtn} onClick={() => fileInputRef.current?.click()}>
                <Upload size={20} />
                <span>{t('camera_upload_photo')}</span>
              </button>
              <button className={styles.retryBtn} onClick={() => { setCameraError(false); startCamera(); }}>
                <RefreshCw size={16} />
                <span>{t('camera_retry')}</span>
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
                    <span>{t('camera_aligned')}</span>
                  </div>
                ) : (
                  <div className={styles.detectionBadgePending}>
                    <Sparkles size={16} />
                    <span>{t('camera_place')}</span>
                  </div>
                )}
              </div>

              {/* Camera Switch Toggle */}
              <button
                className={styles.switchCamBtn}
                onClick={toggleCamera}
                title={t('camera_switch_title')}
              >
                <SwitchCamera size={20} />
              </button>

              {/* Countdown Animation */}
              {countdown !== null && (
                <div className={styles.countdownOverlay}>
                  <div className={styles.countdownNumber}>{countdown}</div>
                  <span className={styles.countdownText}>{t('camera_hold')}</span>
                </div>
              )}

              {/* Manual Snap Button */}
              <button className={styles.captureBtn} onClick={capturePhoto} title={t('camera_snap_title')}>
                <div className={styles.captureInner} />
              </button>
            </>
          )}
        </div>
      ) : (
        <div className={styles.resultBox}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={capturedImage} alt={t('camera_alt')} className={styles.preview} />
          <button className={styles.retakeBtn} onClick={retake}>
            <RefreshCw size={18} />
            <span>{t('camera_retake')}</span>
          </button>
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
