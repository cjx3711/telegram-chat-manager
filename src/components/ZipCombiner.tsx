import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Container,
  Paper,
  Grid,
  Alert,
} from "@mui/material";
import FileDropzone from "./FileDropzone";
import ZipContentCard, { ZipContent } from "./ZipContentCard";
import { unzipFile, combineZipContents } from "../utils/zipUtils";

const ZipCombiner = () => {
  const [zipContents, setZipContents] = useState<ZipContent[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCombining, setIsCombining] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilesAdded = async (files: File[]) => {
    setError(null);

    for (const file of files) {
      try {
        const content = await unzipFile(file);
        setZipContents((prev) => [...prev, content]);
      } catch (err) {
        setError(
          `Error processing ${file.name}: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);

    // Simulate analysis with a timeout
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisComplete(true);
    }, 2000);
  };

  const handleCombine = async () => {
    setIsCombining(true);
    setError(null);

    try {
      await combineZipContents(zipContents);
      setIsCombining(false);
    } catch (err) {
      setError(
        `Error combining files: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      setIsCombining(false);
    }
  };

  const handleReset = () => {
    setZipContents([]);
    setAnalysisComplete(false);
    setError(null);
  };

  const hasValidFiles =
    zipContents.length > 1 && zipContents.every((content) => !content.error);

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 3, mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Telegram Export Combiner
        </Typography>

        <Typography variant="body1" paragraph>
          This tool helps you combine multiple Telegram chat exports into one.
          Simply drop your Telegram export zip files below, analyze them, and
          then combine them into a single file.
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          When combining the exports, if there are conflicting files, the tool
          will keep the newer version based on the filename.
        </Alert>

        <FileDropzone onFilesAdded={handleFilesAdded} />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {zipContents.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Uploaded Files ({zipContents.length})
            </Typography>

            <Grid container spacing={2}>
              {zipContents.map((content) => (
                <Grid item xs={12} key={content.id}>
                  <ZipContentCard content={content} />
                </Grid>
              ))}
            </Grid>

            <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleAnalyze}
                disabled={!hasValidFiles || isAnalyzing || analysisComplete}>
                {isAnalyzing ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Analyze Files"
                )}
              </Button>

              <Button
                variant="contained"
                color="success"
                onClick={handleCombine}
                disabled={!analysisComplete || isCombining}>
                {isCombining ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Combine Files"
                )}
              </Button>

              <Button variant="outlined" onClick={handleReset}>
                Reset
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default ZipCombiner;
