'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, CheckCircle2, Sparkles } from 'lucide-react';
import styles from './CameraCapture.module.css';

interface CameraCaptureProps {
  onCapture: (imageSrc: string) => void;
  label: string;
}

export default function CameraCapture({ onCapture, label }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isHandDetected, setIsHandDetected] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [detecting, setDetecting] = useState(false);

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
        context.drawImage(video, 0, 0, width, height);
        const imageSrc = canvas.toDataURL('image/jpeg', 0.65);
        setCapturedImage(imageSrc);
        onCapture(imageSrc);
        stopCamera();
      }
    }
  }, [onCapture, stopCamera]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(mediaStream);
      setDetecting(true);
    } catch (err) {
      console.error('Error accessing camera', err);
      alert('Please allow camera access to scan your hand.');
    }
  };

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

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
          modelComplexity: 1,
          minDetectionConfidence: 0.65,
          minTrackingConfidence: 0.65,
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
              await hands.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
        });

        cameraInstance.start();
      } catch (err) {
        console.error('MediaPipe Init Error:', err);
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
        <div className={styles.cameraBox}>
          {!stream ? (
            <button className={styles.startBtn} onClick={startCamera}>
              <Camera size={36} />
              <span>Show Hand to Camera</span>
              <span style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.2rem' }}>
                Auto-captures when hand is aligned
              </span>
            </button>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted className={styles.video} />

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
                    <span>Place Hand Inside Frame</span>
                  </div>
                )}
              </div>

              {/* Countdown Animation */}
              {countdown !== null && (
                <div className={styles.countdownOverlay}>
                  <div className={styles.countdownNumber}>{countdown}</div>
                  <span className={styles.countdownText}>Hold Still...</span>
                </div>
              )}

              {/* Manual Snap Fallback Button */}
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
            <RefreshCw size={20} />
            <span>Retake</span>
          </button>
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
