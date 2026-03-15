import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

type RecordingState = 'idle' | 'recording' | 'done';

const ANALYZE_REQUEST_TIMEOUT_MS = 75_000;

export function AnalyzePage() {
  const navigate = useNavigate();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [textPrompt, setTextPrompt] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const hasText = textPrompt.trim().length > 0;
  const hasAudio = audioBlob !== null;
  const isValid = imageFile !== null && (hasText || hasAudio);

  const getHint = () => {
    if (!imageFile) return 'Please add a photo of the issue.';
    if (!hasText && !hasAudio) return 'Please add a text description or a voice recording.';
    return null;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordingState('recording');
    } catch {
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecordingState('done');
  };

  const clearRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingState('idle');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    const title = `Home repair – ${new Date().toLocaleDateString()}`;
    formData.append('title', title);
    if (textPrompt.trim()) formData.append('description', textPrompt.trim());
    formData.append('image', imageFile!);
    if (audioBlob) formData.append('audio', audioBlob, 'recording.webm');

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => {
        controller.abort();
      }, ANALYZE_REQUEST_TIMEOUT_MS);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? `Request failed with status ${res.status}`);
      }
      const repairCase = await res.json();
      navigate(`/cases/${repairCase.id}`);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Analysis took too long. Please try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-center">
      <div className="card form-card">
        <span className="eyebrow">SnapMend</span>
        <h1 className="form-title">AI-guided home repair</h1>
        <p className="form-subtitle">Upload a photo and describe the issue — by text, voice, or both.</p>

        <form onSubmit={handleSubmit} className="analyze-form">
          {/* Photo upload */}
          <div className="field-group">
            <label className="field-label">
              Photo <span className="required">*</span>
            </label>
            <label className="file-drop">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="file-input"
              />
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="image-preview" />
              ) : (
                <div className="file-drop-placeholder">
                  <span className="file-drop-icon">📷</span>
                  <span>Click or drag to upload a photo</span>
                </div>
              )}
            </label>
          </div>

          {/* Text prompt */}
          <div className="field-group">
            <label className="field-label" htmlFor="text-prompt">
              Describe the issue <span className="optional">(optional if voice provided)</span>
            </label>
            <textarea
              id="text-prompt"
              className="textarea"
              rows={4}
              placeholder="e.g. There's a crack in the drywall near the window, about 30 cm long..."
              value={textPrompt}
              onChange={(e) => setTextPrompt(e.target.value)}
            />
          </div>

          {/* Voice recording */}
          <div className="field-group">
            <label className="field-label">
              Voice recording <span className="optional">(optional if text provided)</span>
            </label>
            <div className="recorder">
              {recordingState === 'idle' && (
                <button type="button" className="btn btn-record" onClick={startRecording}>
                  <span className="record-dot" /> Start Recording
                </button>
              )}
              {recordingState === 'recording' && (
                <button type="button" className="btn btn-stop" onClick={stopRecording}>
                  <span className="stop-square" /> Stop Recording
                </button>
              )}
              {recordingState === 'done' && audioUrl && (
                <div className="recording-preview">
                  <audio controls src={audioUrl} className="audio-player" />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={clearRecording}>
                    Discard
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Validation hint */}
          {getHint() && !isSubmitting && (
            <p className="validation-hint">{getHint()}</p>
          )}

          {/* Error */}
          {error && <div className="alert alert-error">{error}</div>}

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <span className="loading-row">
                <span className="spinner" /> Analyzing… this may take up to about a minute
              </span>
            ) : (
              'Analyze'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
