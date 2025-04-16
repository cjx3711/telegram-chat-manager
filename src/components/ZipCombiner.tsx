import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Container,
  Paper,
  Alert,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import FileDropzone from "./FileDropzone";
import ZipContentCard, { ZipContent } from "./ZipContentCard";
import {
  unzipFile,
  combineZipContents,
  analyzeResultJson,
} from "../utils/zipUtils";
import { saveAs } from "file-saver";

// Interface for analysis results
interface AnalysisResult {
  id: number;
  messageCount: number;
  name: string;
  dateRange: {
    from: string;
    to: string;
  };
}

// Interface for combined results
interface CombinedResult {
  blob: Blob;
  totalMessages: number;
  duplicateMessages: number;
  folders: string[];
  totalFiles: number;
}

const ZipCombiner = () => {
  const [zipContents, setZipContents] = useState<ZipContent[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCombining, setIsCombining] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [idMismatch, setIdMismatch] = useState(false);
  const [combinedResult, setCombinedResult] = useState<CombinedResult | null>(
    null
  );
  const [overlappingMessages, setOverlappingMessages] =
    useState<boolean>(false);

  const handleFilesAdded = async (files: File[]) => {
    setError(null);
    setAnalysisComplete(false);
    setAnalysisResults([]);
    setIdMismatch(false);
    setOverlappingMessages(false);
    setCombinedResult(null);

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

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResults([]);
    setIdMismatch(false);
    setOverlappingMessages(false);
    setCombinedResult(null);

    try {
      const results: AnalysisResult[] = [];
      let firstId: number | null = null;
      const updatedContents = [...zipContents];
      const messageCounts: number[] = [];

      for (let i = 0; i < updatedContents.length; i++) {
        const content = updatedContents[i];
        if (content.error || !content.hasResultsJson) continue;

        const analysis = await analyzeResultJson(content);
        results.push(analysis);
        messageCounts.push(analysis.messageCount);

        // Update the content with analysis information
        updatedContents[i] = {
          ...content,
          analysis: {
            messageCount: analysis.messageCount,
            dateRange: analysis.dateRange,
          },
        };

        // Check for ID mismatches
        if (firstId === null) {
          firstId = analysis.id;
        } else if (firstId !== analysis.id) {
          setIdMismatch(true);
          setError(
            `Chat ID mismatch detected: ${firstId} !== ${analysis.id}. Cannot combine different chats.`
          );
        }
      }

      // Check for potentially overlapping date ranges
      if (results.length > 1) {
        const dateRanges = results.map((result) => ({
          from: new Date(result.dateRange.from),
          to: new Date(result.dateRange.to),
        }));

        for (let i = 0; i < dateRanges.length; i++) {
          for (let j = i + 1; j < dateRanges.length; j++) {
            if (
              (dateRanges[i].from <= dateRanges[j].to &&
                dateRanges[i].to >= dateRanges[j].from) ||
              (dateRanges[j].from <= dateRanges[i].to &&
                dateRanges[j].to >= dateRanges[i].from)
            ) {
              setOverlappingMessages(true);
              break;
            }
          }
          if (overlappingMessages) break;
        }
      }

      setZipContents(updatedContents);
      setAnalysisResults(results);
      setAnalysisComplete(true);
    } catch (err) {
      setError(
        `Error analyzing files: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCombine = async () => {
    if (idMismatch) {
      setError("Cannot combine chats with different IDs");
      return;
    }

    setIsCombining(true);
    setError(null);

    try {
      const result = await combineZipContents(zipContents);
      setCombinedResult(result);
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

  const handleDownload = () => {
    if (combinedResult) {
      saveAs(combinedResult.blob, "combined_telegram_export.zip");
    }
  };

  const handleReset = () => {
    setZipContents([]);
    setAnalysisComplete(false);
    setError(null);
    setAnalysisResults([]);
    setIdMismatch(false);
    setOverlappingMessages(false);
    setCombinedResult(null);
  };

  const hasValidFiles =
    zipContents.length > 1 && zipContents.every((content) => !content.error);

  // Calculate total message count
  const totalMessages = analysisResults.reduce(
    (total, result) => total + result.messageCount,
    0
  );
  const chatName = analysisResults.length > 0 ? analysisResults[0].name : "";

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
          When combining exports, the tool will merge messages from all files
          and remove duplicates based on message ID.
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

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {zipContents.map((content) => (
                <Box key={content.id}>
                  <ZipContentCard content={content} />
                </Box>
              ))}
            </Box>

            {analysisComplete && analysisResults.length > 0 && (
              <Box
                sx={{
                  mt: 2,
                  mb: 2,
                  p: 2,
                  bgcolor: "background.paper",
                  borderRadius: 1,
                }}>
                <Typography variant="h6" gutterBottom>
                  Analysis Results
                </Typography>
                <Typography variant="body1">
                  Chat name: <strong>{chatName}</strong>
                </Typography>
                <Typography variant="body1">
                  Chat ID: <strong>{analysisResults[0].id}</strong>
                </Typography>
                <Typography variant="body1">
                  Total messages across all files:{" "}
                  <strong>{totalMessages}</strong>
                </Typography>
                <Typography variant="body1">
                  Date range:{" "}
                  <strong>
                    {analysisResults.reduce((earliest, result) => {
                      if (
                        !earliest ||
                        (result.dateRange.from &&
                          result.dateRange.from < earliest)
                      ) {
                        return result.dateRange.from;
                      }
                      return earliest;
                    }, "")}{" "}
                    to{" "}
                    {analysisResults.reduce((latest, result) => {
                      if (
                        !latest ||
                        (result.dateRange.to && result.dateRange.to > latest)
                      ) {
                        return result.dateRange.to;
                      }
                      return latest;
                    }, "")}
                  </strong>
                </Typography>

                {overlappingMessages && !idMismatch && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    The date ranges in these exports overlap. Some messages may
                    be duplicated and will be merged based on message ID.
                  </Alert>
                )}

                {idMismatch && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    Cannot combine: The files contain different chat IDs
                  </Alert>
                )}
              </Box>
            )}

            {combinedResult && (
              <Card sx={{ mt: 3, mb: 3, bgcolor: "success.light" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Combined Export Ready
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body1">
                      Total messages:{" "}
                      <strong>{combinedResult.totalMessages}</strong>
                    </Typography>
                    {combinedResult.duplicateMessages > 0 && (
                      <Typography variant="body1">
                        Duplicate messages removed:{" "}
                        <strong>{combinedResult.duplicateMessages}</strong>
                      </Typography>
                    )}
                    <Typography variant="body1">
                      Total files: <strong>{combinedResult.totalFiles}</strong>
                    </Typography>
                  </Box>

                  {combinedResult.folders.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body1" gutterBottom>
                        Folders included:
                      </Typography>
                      <List
                        dense
                        sx={{ bgcolor: "background.paper", borderRadius: 1 }}>
                        {combinedResult.folders.map((folder, index) => (
                          <ListItem key={index}>
                            <ListItemText primary={folder} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}

                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleDownload}
                    sx={{ mt: 1 }}>
                    Download Combined Export
                  </Button>
                </CardContent>
              </Card>
            )}

            <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleAnalyze}
                disabled={!hasValidFiles || isAnalyzing}>
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
                disabled={
                  !analysisComplete ||
                  isCombining ||
                  idMismatch ||
                  !!combinedResult
                }>
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
