import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import './index.css';

const MAX_RECORD_TIME = 300;

function VoiceRecorder({ onRecordingComplete, disabled = false }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);

  useEffect(() => {
    let timerId = null;

    if (isRecording) {
      timerId = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev + 1 >= MAX_RECORD_TIME) {
            stopRecording();
            toast.success('Maximum recording time reached (5 minutes).');
            return MAX_RECORD_TIME;
          }
          return prev + 1;
        });
      }, 1000);
    }

    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        if (mediaRecorder.stream) {
          mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        }
      }
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
    };
  }, [mediaRecorder, audioPreviewUrl]);

  const startRecording = async () => {
    if (disabled) return;

    try {
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
      setRecordedBlob(null);
      setAudioPreviewUrl(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const options = { mimeType: 'audio/webm;codecs=opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'audio/webm';
      }

      const recorder = new MediaRecorder(stream, options);
      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedBlob(audioBlob);

        const previewUrl = URL.createObjectURL(audioBlob);
        setAudioPreviewUrl(previewUrl);

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      console.error('Microphone access error:', error.message);
      toast.error(
        'Could not access microphone. Please allow microphone permissions.'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    setIsRecording(false);
  };

  const handleSubmit = () => {
    if (recordedBlob) {
      onRecordingComplete(recordedBlob);
      setRecordedBlob(null);
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
        setAudioPreviewUrl(null);
      }
      setRecordingTime(0);
    }
  };

  const handleReRecord = () => {
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setRecordedBlob(null);
    setAudioPreviewUrl(null);
    setRecordingTime(0);
    setIsRecording(false);
    setMediaRecorder(null);
  };

  return (
    <div className="voice-recorder">
      {!isRecording && !recordedBlob && (
        <button
          type="button"
          className={`vr-record-btn ${disabled ? 'vr-record-btn-disabled' : ''}`}
          onClick={startRecording}
          disabled={disabled}
        >
          {disabled ? 'Please wait...' : 'Start Recording'}
        </button>
      )}

      {isRecording && (
        <div className="vr-recording-area">
          <div className="vr-recording-status">
            <span className="vr-record-dot">●</span>
            <span className="vr-status-text">Recording...</span>
          </div>
          <div className="vr-timer">{Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}</div>
          <button type="button" className="vr-stop-btn" onClick={stopRecording}>
            Stop Recording
          </button>
        </div>
      )}

      {audioPreviewUrl && !isRecording && (
        <div className="vr-preview">
          <p className="vr-preview-label">Review your recording</p>
          <audio className="vr-audio-player" src={audioPreviewUrl} controls />
          <div className="vr-preview-actions">
            <button type="button" className="vr-rerecord-btn" onClick={handleReRecord} disabled={disabled}>
              Re-record
            </button>
            <button
              type="button"
              className={`vr-submit-btn ${disabled ? 'vr-submit-btn-disabled' : ''}`}
              onClick={handleSubmit}
              disabled={disabled}
            >
              Submit Recording
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VoiceRecorder;
