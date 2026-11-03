import express from "express";
import cors from "cors";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import multer from "multer";
import { pipeline } from "@huggingface/transformers";
import ffmpegPath from "ffmpeg-static";

const app = express();
const PORT = process.env.PORT || 5000;
const execFileAsync = promisify(execFile);

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// ==========================================
// MODEL CONFIGURATION
// ==========================================

const IMAGE_MODEL_ID = "onnx-community/ai-image-detection-ONNX";
const AUDIO_MODEL_ID = "ai8shiro/deepfake-audio-wav2vec2-ONNX";

let imageDetectorPromise;
let audioDetectorPromise;

async function getImageDetector() {
  if (!imageDetectorPromise) {
    imageDetectorPromise = pipeline(
      "image-classification",
      IMAGE_MODEL_ID
    );
  }

  try {
    return await imageDetectorPromise;
  } catch (error) {
    imageDetectorPromise = null;
    throw error;
  }
}

async function getAudioDetector() {
  if (!audioDetectorPromise) {
    audioDetectorPromise = pipeline(
      "audio-classification",
      AUDIO_MODEL_ID
    );
  }

  try {
    return await audioDetectorPromise;
  } catch (error) {
    audioDetectorPromise = null;
    throw error;
  }
}

// ==========================================
// TEMPORARY FILE STORAGE
// ==========================================

const tempDir = path.join(os.tmpdir(), "truthscan-uploads");
await fs.mkdir(tempDir, { recursive: true });

// ==========================================
// MULTER CONFIGURATION
// ==========================================

const imageUpload = multer({
  dest: tempDir,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/bmp",
    ];

    if (allowed.includes(file.mimetype)) {
      return callback(null, true);
    }

    callback(new Error("Upload a JPG, PNG, WEBP, or BMP image."));
  },
});

const videoUpload = multer({
  dest: tempDir,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowed = [
      "video/mp4",
      "video/quicktime",
      "video/webm",
      "video/x-matroska",
      "video/x-msvideo",
      "application/octet-stream",
    ];

    if (allowed.includes(file.mimetype)) {
      return callback(null, true);
    }

    callback(new Error("Upload an MP4, MOV, WEBM, MKV, or AVI video."));
  },
});

const audioUpload = multer({
  dest: tempDir,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowed = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/wave",
      "audio/mp4",
      "audio/aac",
      "audio/ogg",
      "audio/webm",
      "audio/flac",
      "audio/x-flac",
      "audio/x-m4a",
      "audio/m4a",
    ];

    if (allowed.includes(file.mimetype)) {
      return callback(null, true);
    }

    callback(
      new Error(
        "Upload an MP3, WAV, M4A, AAC, OGG, WEBM, or FLAC audio file."
      )
    );
  },
});

// ==========================================
// COMMON HELPER FUNCTIONS
// ==========================================

function getTopPrediction(predictions = []) {
  return predictions.reduce(
    (best, current) =>
      !best || Number(current.score) > Number(best.score)
        ? current
        : best,
    null
  );
}

function classifyPredictions(predictions = []) {
  const normalized = predictions.map((item) => ({
    label: String(item.label || "unknown"),
    score: Number(item.score || 0),
  }));

  const fakePrediction = normalized.find((item) =>
    /fake|artificial|generated|synthetic|ai[- ]?generated/i.test(item.label)
  );

  const realPrediction = normalized.find((item) =>
    /real|authentic|natural|human/i.test(item.label)
  );

  if (fakePrediction && realPrediction) {
    return fakePrediction.score > realPrediction.score
      ? "Likely AI-generated"
      : "Likely authentic";
  }

  if (fakePrediction) return "Likely AI-generated";
  if (realPrediction) return "Likely authentic";

  return "Inconclusive";
}

function getAudioLabel(predictions = []) {
  const fake = predictions.find((item) =>
    /spoof|fake|synthetic|deepfake|generated|artificial/i.test(
      String(item.label)
    )
  );

  const real = predictions.find((item) =>
    /bonafide|bona fide|real|genuine|authentic|human/i.test(
      String(item.label)
    )
  );

  if (!fake || !real) return null;

  return {
    fakeScore: Number(fake.score),
    realScore: Number(real.score),
  };
}

async function safelyRemove(filePath) {
  if (!filePath) return;

  try {
    await fs.rm(filePath, {
      force: true,
      recursive: true,
    });
  } catch (error) {
    console.error("Temporary file cleanup failed:", error.message);
  }
}

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "TruthScan AI",
    imageDetection: true,
    videoFrameAnalysis: Boolean(ffmpegPath),
    audioDetection: Boolean(ffmpegPath),
    models: {
      image: IMAGE_MODEL_ID,
      audio: AUDIO_MODEL_ID,
    },
  });
});

// ==========================================
// DASHBOARD API
// ==========================================

app.get("/api/dashboard", (req, res) => {
  res.json({
    status: "ok",
    message: "TruthScan AI dashboard API is running",
    modules: ["image", "video", "audio"],
  });
});

// ==========================================
// IMAGE DETECTION
// ==========================================

app.post(
  "/api/detect/image",
  imageUpload.single("file"),
  async (req, res, next) => {
    let uploadPath;

    try {
      if (!req.file) {
        return res.status(400).json({
          error: "Please upload an image using the file field.",
        });
      }

      uploadPath = req.file.path;

      const detector = await getImageDetector();
      const predictions = await detector(uploadPath, { top_k: 5 });

      const verdict = classifyPredictions(predictions);
      const topPrediction = getTopPrediction(predictions);

      res.json({
        id: `${Date.now()}`,
        fileName: req.file.originalname,
        mediaType: "IMAGE",
        model: IMAGE_MODEL_ID,
        label: topPrediction?.label || "Unknown",
        score: topPrediction?.score || 0,
        verdict,
        predictions,
        warning:
          "Automated model estimate only. This result is not proof of authenticity.",
      });
    } catch (error) {
      next(error);
    } finally {
      await safelyRemove(uploadPath);
    }
  }
);// ==========================================
// VIDEO DETECTION
// ==========================================

app.post(
  "/api/detect/video",
  videoUpload.single("file"),
  async (req, res, next) => {
    let videoPath;
    let framesDir;

    try {
      if (!req.file) {
        return res.status(400).json({
          error: "Please upload a video using the file field.",
        });
      }

      if (!ffmpegPath) {
        return res.status(500).json({
          error: "FFmpeg is unavailable.",
        });
      }

      videoPath = req.file.path;

      framesDir = path.join(
        tempDir,
        `frames-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      );

      await fs.mkdir(framesDir, { recursive: true });

      const framePattern = path.join(framesDir, "frame-%02d.jpg");

      await execFileAsync(
        ffmpegPath,
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-i",
          videoPath,
          "-vf",
          "fps=1,scale=640:-2",
          "-frames:v",
          "8",
          "-q:v",
          "3",
          framePattern,
        ],
        {
          timeout: 120000,
          windowsHide: true,
        }
      );

      const frameFiles = (await fs.readdir(framesDir))
        .filter((name) => /^frame-\d+\.jpg$/i.test(name))
        .sort();

      if (frameFiles.length === 0) {
        return res.status(422).json({
          error:
            "No frames could be extracted. Try a valid MP4 or WEBM video.",
        });
      }

      const detector = await getImageDetector();
      const frameResults = [];

      for (const frameName of frameFiles) {
        const framePath = path.join(framesDir, frameName);

        const predictions = await detector(framePath, {
          top_k: 5,
        });

        const verdict = classifyPredictions(predictions);
        const topPrediction = getTopPrediction(predictions);

        frameResults.push({
          frame: frameName,
          label: topPrediction?.label || "Unknown",
          score: topPrediction?.score || 0,
          verdict,
          predictions,
        });
      }

      const fakeCount = frameResults.filter(
        (item) => item.verdict === "Likely AI-generated"
      ).length;

      const realCount = frameResults.filter(
        (item) => item.verdict === "Likely authentic"
      ).length;

      let verdict = "Inconclusive";

      if (fakeCount > realCount) {
        verdict = "Potential AI-generated content";
      } else if (realCount > fakeCount) {
        verdict = "No strong AI signal in sampled frames";
      }

      res.json({
        id: `${Date.now()}`,
        fileName: req.file.originalname,
        mediaType: "VIDEO",
        model: IMAGE_MODEL_ID,
        framesAnalyzed: frameResults.length,
        fakeFrames: fakeCount,
        authenticFrames: realCount,
        inconclusiveFrames:
          frameResults.length - fakeCount - realCount,
        summary:
          `Analyzed ${frameResults.length} sampled frames: ${fakeCount} AI-like, ${realCount} authentic-like, and ${frameResults.length - fakeCount - realCount} inconclusive.`,
        verdict,
        frameResults,
        warning:
          "This analyzes sampled video frames with an image classifier. It does not verify facial identity, lip-sync, audio, or temporal manipulation. Results are not proof of a deepfake.",
      });
    } catch (error) {
      next(error);
    } finally {
      await safelyRemove(videoPath);
      await safelyRemove(framesDir);
    }
  }
);

// ==========================================
// AUDIO DEEPFAKE DETECTION
// ==========================================

app.post(
  "/api/detect/audio",
  audioUpload.single("file"),
  async (req, res, next) => {
    let audioPath;
    let rawPath;

    try {
      if (!req.file) {
        return res.status(400).json({
          error: "Please upload an audio file.",
        });
      }

      if (!ffmpegPath) {
        return res.status(500).json({
          error: "FFmpeg is unavailable.",
        });
      }

      audioPath = req.file.path;

      rawPath = path.join(
        tempDir,
        `audio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.raw`
      );

      // Convert to mono, 16 kHz Float32 PCM.
      // Analyze at most 60 seconds.

      await execFileAsync(
        ffmpegPath,
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-i",
          audioPath,
          "-vn",
          "-t",
          "60",
          "-ac",
          "1",
          "-ar",
          "16000",
          "-f",
          "f32le",
          "-acodec",
          "pcm_f32le",
          rawPath,
        ],
        {
          timeout: 120000,
          windowsHide: true,
        }
      );

      const rawBuffer = await fs.readFile(rawPath);

      // One second of 16 kHz Float32 audio = 64000 bytes.
      if (rawBuffer.length < 64000) {
        return res.status(422).json({
          error: "Audio must contain at least one second of usable sound.",
        });
      }

      if (rawBuffer.length % 4 !== 0) {
        return res.status(422).json({
          error: "Invalid audio data.",
        });
      }

      const audioSamples = new Float32Array(
        rawBuffer.buffer.slice(
          rawBuffer.byteOffset,
          rawBuffer.byteOffset + rawBuffer.byteLength
        )
      );

      // Load audio deepfake model.
      const detector = await getAudioDetector();

      const SAMPLE_RATE = 16000;
      const WINDOW_SIZE = 4 * SAMPLE_RATE;

      const segmentResults = [];

      // Split audio into four-second segments.
      for (
        let start = 0;
        start < audioSamples.length;
        start += WINDOW_SIZE
      ) {
        const end = Math.min(
          start + WINDOW_SIZE,
          audioSamples.length
        );

        const segment = audioSamples.slice(start, end);

        // Skip segments shorter than one second.
        if (segment.length < SAMPLE_RATE) {
          continue;
        }

        const predictions = await detector(segment, {
          sampling_rate: SAMPLE_RATE,
          top_k: 5,
        });

        const scores = getAudioLabel(predictions);

        segmentResults.push({
          segment: segmentResults.length + 1,
          startSeconds: Number((start / SAMPLE_RATE).toFixed(2)),
          endSeconds: Number((end / SAMPLE_RATE).toFixed(2)),
          predictions,
          scores,
        });
      }

      if (segmentResults.length === 0) {
        return res.status(422).json({
          error: "Could not extract usable audio segments.",
        });
      }

      // Keep only segments with recognizable labels.
      const validSegments = segmentResults.filter(
        (segment) => segment.scores !== null
      );

      if (validSegments.length === 0) {
        return res.status(422).json({
          error:
            "The audio model returned unrecognized labels. Check its output before interpreting the result.",
          rawPredictions: segmentResults[0].predictions,
        });
      }      // Normalize each segment and use the median to reduce the influence
      // of one unusually noisy or unusual segment.
      const spoofScores = validSegments
        .map((segment) => {
          const fake = segment.scores.fakeScore;
          const real = segment.scores.realScore;
          const total = fake + real;
          return total > 0 ? fake / total : null;
        })
        .filter((score) => Number.isFinite(score));

      if (spoofScores.length === 0) {
        return res.status(422).json({
          error: "The model did not return usable audio scores.",
          rawPredictions: segmentResults[0]?.predictions || [],
        });
      }

      function median(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);

        return sorted.length % 2
          ? sorted[middle]
          : (sorted[middle - 1] + sorted[middle]) / 2;
      }

      const medianSpoof = median(spoofScores);

      const spoofAgreement =
        spoofScores.filter((score) => score >= 0.65).length /
        spoofScores.length;

      const realAgreement =
        spoofScores.filter((score) => score <= 0.35).length /
        spoofScores.length;

      // Conservative experimental thresholds, not calibrated probabilities.
      let verdict = "Inconclusive";

      if (
        spoofScores.length >= 2 &&
        medianSpoof >= 0.70 &&
        spoofAgreement >= 0.70
      ) {
        verdict = "Potential spoofed / AI-generated audio";
      } else if (
        spoofScores.length >= 2 &&
        medianSpoof <= 0.30 &&
        realAgreement >= 0.70
      ) {
        verdict = "No strong spoofing signal detected";
      }

      const averageFake =
        validSegments.reduce(
          (sum, segment) => sum + segment.scores.fakeScore,
          0
        ) / validSegments.length;

      const averageReal =
        validSegments.reduce(
          (sum, segment) => sum + segment.scores.realScore,
          0
        ) / validSegments.length;

      const predictions = [
        {
          label: "Spoof / AI-generated signal (median)",
          score: medianSpoof,
        },
        {
          label: "Bonafide / Real signal (median)",
          score: 1 - medianSpoof,
        },
      ];

      // A model score is not a calibrated probability of synthetic origin.
      const confidence = Math.max(medianSpoof, 1 - medianSpoof);

      res.json({
        id: `${Date.now()}`,
        fileName: req.file.originalname,
        mediaType: "AUDIO",
        model: AUDIO_MODEL_ID,
        verdict,
        label: verdict,
        score: confidence,
        scoreMeaning: "Model score, not a calibrated probability",

        averageModelScores: {
          spoof: Number(averageFake.toFixed(4)),
          bonafide: Number(averageReal.toFixed(4)),
        },

        segmentAgreement: {
          spoof: Number(spoofAgreement.toFixed(3)),
          bonafide: Number(realAgreement.toFixed(3)),
        },

        predictions,
        segmentsAnalyzed: validSegments.length,

        summary:
          `Analyzed ${validSegments.length} audio segments. ${Math.round(spoofAgreement * 100)}% showed a strong spoof signal and ${Math.round(realAgreement * 100)}% showed a strong bonafide signal.`,

        segmentResults,

        warning:
          "Experimental speech anti-spoofing estimate. Scores are model outputs, not calibrated probabilities. Inconclusive means the segment evidence was not sufficiently consistent. Performance may vary across languages, voices, recording conditions and synthesis methods. Only the first 60 seconds are analyzed. This result is not proof of authenticity.",
      });
    } catch (error) {
      next(error);
    } finally {
      await safelyRemove(audioPath);
      await safelyRemove(rawPath);
    }
  }
);

// ==========================================
// COMPATIBILITY ENDPOINT
// ==========================================

app.post("/api/analyze", (req, res) => {
  res.json({
    status: "ok",
    message:
      "Use /api/detect/image, /api/detect/video, or /api/detect/audio for media analysis.",
  });
});

// ==========================================
// ERROR HANDLING
// ==========================================

app.use((error, req, res, next) => {
  console.error("API error:", error.message);

  if (res.headersSent) {
    return next(error);
  }

  // File upload errors
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      let message = "Uploaded file is too large.";

      if (req.path.includes("/image")) {
        message = "Image must be 10 MB or smaller.";
      } else if (req.path.includes("/video")) {
        message = "Video must be 50 MB or smaller.";
      } else if (req.path.includes("/audio")) {
        message = "Audio must be 25 MB or smaller.";
      }

      return res.status(413).json({
        error: message,
      });
    }

    return res.status(400).json({
      error: error.message,
    });
  }

  // Unsupported file formats
  if (
    error.message.startsWith("Upload a ") ||
    error.message.startsWith("Upload an ")
  ) {
    return res.status(400).json({
      error: error.message,
    });
  }

  res.status(500).json({
    error: "Media analysis failed.",
    details:
      process.env.NODE_ENV === "development"
        ? error.message
        : undefined,
  });
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
  console.log(
    `TruthScan AI API running at http://localhost:${PORT}`
  );

  console.log("Image detection: /api/detect/image");
  console.log("Video detection: /api/detect/video");
  console.log("Audio detection: /api/detect/audio");
});