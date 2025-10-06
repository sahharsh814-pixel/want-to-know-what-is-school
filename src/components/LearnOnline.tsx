import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Maximize, Minimize, Volume2, VolumeX, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { getSupabaseData, setSupabaseData, subscribeToSupabaseChanges } from "@/lib/supabaseHelpers";

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

interface LearnOnlineProps {
  studentId: string;
  studentName: string;
  studentClass: string;
  studentSection: string;
  onClose: () => void;
}

const LearnOnline = ({ studentId, studentName, studentClass, studentSection, onClose }: LearnOnlineProps) => {
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<LiveSession | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState([80]);
  const [isLoading, setIsLoading] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadLiveSessions();
    
    const unsubscribe = subscribeToSupabaseChanges('royal-academy-live-sessions', (newData) => {
      if (newData) {
        const filteredSessions = (newData as LiveSession[]).filter((session: LiveSession) => 
          session.isLive && 
          session.class === studentClass && 
          session.section === studentSection
        );
        setLiveSessions(filteredSessions);
        
        if (selectedSession) {
          const updatedSession = filteredSessions.find((s: LiveSession) => s.id === selectedSession.id);
          if (!updatedSession) {
            setSelectedSession(null);
          }
        }
      }
    });

    return () => {
      unsubscribe();
      stopHeartbeat();
    };
  }, [studentClass, studentSection]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume[0] / 100;
    }
  }, [volume]);

  const loadLiveSessions = async () => {
    setIsLoading(true);
    const allSessions = await getSupabaseData<LiveSession[]>('royal-academy-live-sessions', []);
    const filteredSessions = allSessions.filter((session: LiveSession) => 
      session.isLive && 
      session.class === studentClass && 
      session.section === studentSection
    );
    setLiveSessions(filteredSessions);
    setIsLoading(false);
  };

  const startHeartbeat = (sessionId: string) => {
    stopHeartbeat();
    
    const sendHeartbeat = async () => {
      const viewers = await getSupabaseData<any[]>(`royal-academy-live-viewers-${sessionId}`, []);
      const existingViewer = viewers.find((v: any) => v.studentId === studentId);
      
      if (existingViewer) {
        existingViewer.lastSeen = new Date().toISOString();
      } else {
        viewers.push({
          studentId,
          studentName,
          lastSeen: new Date().toISOString()
        });
      }
      
      await setSupabaseData(`royal-academy-live-viewers-${sessionId}`, viewers);
    };
    
    sendHeartbeat();
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 5000);
  };

  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
  };

  const joinSession = async (session: LiveSession) => {
    setSelectedSession(session);
    startHeartbeat(session.id);
  };

  const leaveSession = () => {
    setSelectedSession(null);
    stopHeartbeat();
    if (isFullscreen) {
      toggleFullscreen();
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="p-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-royal to-gold">
          <div>
            <h2 className="text-xl font-heading font-bold text-white">
              📚 Learn Online
            </h2>
            <p className="text-sm text-white/80">
              Class {studentClass}{studentSection}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:text-white">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!selectedSession ? (
            <div>
              <h3 className="text-lg font-semibold mb-4">Available Live Classes</h3>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-royal" />
                </div>
              ) : liveSessions.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No live classes at the moment</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Check back later when your teacher starts a live class
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {liveSessions.map((session) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-r from-royal/10 to-gold/10 border border-royal/20 rounded-lg p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            <span className="text-sm font-semibold text-red-500">LIVE NOW</span>
                          </div>
                          <h4 className="text-xl font-heading font-bold text-foreground mb-2">
                            {session.title}
                          </h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            Teacher: {session.teacherName}
                          </p>
                          {session.description && (
                            <p className="text-sm text-muted-foreground">
                              {session.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => joinSession(session)}
                        className="w-full bg-gradient-to-r from-royal to-gold text-white font-semibold"
                        size="lg"
                      >
                        Join Now
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div ref={containerRef} className={`${isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}>
              <div className={`${isFullscreen ? 'h-full' : ''} space-y-4`}>
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  {/* Simulated Video Player - In production, this would connect to actual streaming service */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 to-purple-900/50">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="relative mb-6">
                          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-royal to-gold mx-auto flex items-center justify-center animate-pulse">
                            <Video className="h-12 w-12 text-white" />
                          </div>
                          <span className="absolute -top-2 -right-2 flex h-6 w-6">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-6 w-6 bg-red-500 items-center justify-center text-xs font-bold">LIVE</span>
                          </span>
                        </div>
                        <p className="text-2xl font-bold mb-2">{selectedSession.teacherName}</p>
                        <p className="text-lg text-white/90 mb-4">{selectedSession.title}</p>
                        <div className="flex items-center justify-center space-x-4 text-sm">
                          <span className="px-3 py-1 bg-white/20 rounded-full">
                            {selectedSession.streamType === 'screen' ? '📺 Screen Share' : '🎥 Camera'}
                          </span>
                          <span className="px-3 py-1 bg-green-500/30 rounded-full flex items-center">
                            <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                            Connected
                          </span>
                        </div>
                        <p className="text-xs text-white/50 mt-6">
                          🎓 Interactive lesson in progress
                        </p>
                      </div>
                    </div>
                    
                    {/* Simulated video effects */}
                    <div className="absolute top-4 left-4 right-4 flex justify-between text-white text-sm">
                      <div className="bg-black/50 px-3 py-1 rounded">
                        <span className="text-red-500 mr-2">●</span> Recording
                      </div>
                      <div className="bg-black/50 px-3 py-1 rounded">
                        <Users className="h-4 w-4 inline mr-1" />
                        Live viewers
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`${isFullscreen ? 'absolute bottom-0 left-0 right-0 p-4 bg-black/80' : ''} bg-muted/50 rounded-lg p-4`}>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleMute}
                      >
                        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                      </Button>
                      <div className="w-32">
                        <Slider
                          value={volume}
                          onValueChange={setVolume}
                          max={100}
                          step={1}
                          disabled={isMuted}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">{volume[0]}%</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleFullscreen}
                      >
                        {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                        {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={leaveSession}
                      >
                        Leave Class
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LearnOnline;
