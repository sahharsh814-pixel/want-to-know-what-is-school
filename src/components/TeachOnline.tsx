import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, X, Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { setSupabaseData, getSupabaseData } from "@/lib/supabaseHelpers";

interface LiveSession {
  id: string;
  teacherId: string;
  teacherName: string;
  class: string;
  section: string;
  title: string;
  description: string;
  isLive: boolean;
  startedAt: string;
  streamType: 'camera' | 'screen';
}

interface TeachOnlineProps {
  teacherId: string;
  teacherName: string;
  assignedClass: string;
  assignedSection: string;
  onClose: () => void;
}

const TeachOnline = ({ teacherId, teacherName, assignedClass, assignedSection, onClose }: TeachOnlineProps) => {
  const [isLive, setIsLive] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [isSetupMode, setIsSetupMode] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef<string>("");

  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, []);

  useEffect(() => {
    if (isLive) {
      const interval = setInterval(updateViewerCount, 3000);
      return () => clearInterval(interval);
    }
  }, [isLive]);

  const updateViewerCount = async () => {
    const viewers = await getSupabaseData<any[]>(`royal-academy-live-viewers-${sessionIdRef.current}`, []);
    const activeViewers = viewers.filter((v: any) => {
      const lastSeen = new Date(v.lastSeen).getTime();
      const now = Date.now();
      return (now - lastSeen) < 10000;
    });
    setViewerCount(activeViewers.length);
  };

  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setIsCameraOn(true);
      setIsMicOn(true);
      setIsScreenSharing(false);
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const startScreenShare = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: true
      });

      stream.getVideoTracks()[0].onended = () => {
        setIsScreenSharing(false);
        if (isLive) {
          startCamera();
        }
      };

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setIsScreenSharing(true);
      setIsCameraOn(false);
      setIsMicOn(true);
    } catch (error) {
      console.error("Error sharing screen:", error);
      alert("Could not share screen. Please check permissions.");
    }
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const rotateCamera = () => {
    if (videoRef.current) {
      const currentRotation = videoRef.current.style.transform || '';
      const rotationMatch = currentRotation.match(/rotate\((\d+)deg\)/);
      const currentDegree = rotationMatch ? parseInt(rotationMatch[1]) : 0;
      const newDegree = (currentDegree + 90) % 360;
      videoRef.current.style.transform = `rotate(${newDegree}deg)`;
    }
  };

  const startStreaming = async () => {
    if (!title.trim()) {
      alert("Please enter a title for the live class");
      return;
    }

    await startCamera();

    const sessionId = `${teacherId}-${Date.now()}`;
    sessionIdRef.current = sessionId;

    const session: LiveSession = {
      id: sessionId,
      teacherId,
      teacherName,
      class: assignedClass,
      section: assignedSection,
      title: title.trim(),
      description: description.trim(),
      isLive: true,
      startedAt: new Date().toISOString(),
      streamType: isScreenSharing ? 'screen' : 'camera'
    };

    const allSessions = await getSupabaseData<LiveSession[]>('royal-academy-live-sessions', []);
    const updatedSessions = allSessions.filter((s: LiveSession) => s.teacherId !== teacherId);
    updatedSessions.push(session);
    
    await setSupabaseData('royal-academy-live-sessions', updatedSessions);

    setIsLive(true);
    setIsSetupMode(false);
  };

  const stopStreaming = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (sessionIdRef.current) {
      const allSessions = await getSupabaseData<LiveSession[]>('royal-academy-live-sessions', []);
      const updatedSessions = allSessions.filter((s: LiveSession) => s.id !== sessionIdRef.current);
      await setSupabaseData('royal-academy-live-sessions', updatedSessions);
      await setSupabaseData(`royal-academy-live-viewers-${sessionIdRef.current}`, []);
    }

    setIsLive(false);
    setIsCameraOn(false);
    setIsMicOn(false);
    setIsScreenSharing(false);
    setIsSetupMode(true);
  };

  const updateStreamType = async () => {
    if (sessionIdRef.current) {
      const allSessions = await getSupabaseData<LiveSession[]>('royal-academy-live-sessions', []);
      const session = allSessions.find((s: LiveSession) => s.id === sessionIdRef.current);
      if (session) {
        session.streamType = isScreenSharing ? 'screen' : 'camera';
        await setSupabaseData('royal-academy-live-sessions', allSessions);
      }
    }
  };

  useEffect(() => {
    if (isLive) {
      updateStreamType();
    }
  }, [isScreenSharing]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground">
              {isLive ? "🔴 Live Teaching" : "Start Live Class"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Class {assignedClass}{assignedSection}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {isLive && (
              <div className="flex items-center gap-2 px-4 py-2 bg-royal/20 rounded-lg">
                <Users className="h-5 w-5 text-royal" />
                <span className="font-semibold text-royal">{viewerCount} Students Watching</span>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-6">
          {isSetupMode && !isLive ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Class Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Mathematics - Chapter 5: Algebra"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What will you teach in this class?"
                  className="mt-1"
                  rows={3}
                />
              </div>
              <Button onClick={startStreaming} className="w-full" size="lg">
                Start Live Class
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                />
                {!isCameraOn && !isScreenSharing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <VideoOff className="h-16 w-16 text-gray-500" />
                  </div>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2">{title}</h3>
                {description && <p className="text-sm text-muted-foreground">{description}</p>}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant={isCameraOn ? "default" : "outline"}
                  onClick={toggleCamera}
                  disabled={isScreenSharing}
                >
                  {isCameraOn ? <Video className="h-5 w-5 mr-2" /> : <VideoOff className="h-5 w-5 mr-2" />}
                  {isCameraOn ? "Camera On" : "Camera Off"}
                </Button>

                <Button
                  variant={isMicOn ? "default" : "outline"}
                  onClick={toggleMic}
                >
                  {isMicOn ? <Mic className="h-5 w-5 mr-2" /> : <MicOff className="h-5 w-5 mr-2" />}
                  {isMicOn ? "Mic On" : "Mic Off"}
                </Button>

                <Button
                  variant={isScreenSharing ? "default" : "outline"}
                  onClick={isScreenSharing ? startCamera : startScreenShare}
                >
                  {isScreenSharing ? <MonitorOff className="h-5 w-5 mr-2" /> : <Monitor className="h-5 w-5 mr-2" />}
                  {isScreenSharing ? "Stop Screen Share" : "Share Screen"}
                </Button>

                <Button
                  variant="outline"
                  onClick={rotateCamera}
                  disabled={isScreenSharing}
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Rotate Camera
                </Button>

                <Button
                  variant="destructive"
                  onClick={stopStreaming}
                  className="ml-auto"
                >
                  Stop Live Class
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TeachOnline;
