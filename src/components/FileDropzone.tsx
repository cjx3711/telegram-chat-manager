import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Box, Typography, Paper } from "@mui/material";

interface FileDropzoneProps {
  onFilesAdded: (files: File[]) => void;
}

const FileDropzone = ({ onFilesAdded }: FileDropzoneProps) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesAdded(acceptedFiles);
    },
    [onFilesAdded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/zip": [".zip"],
    },
  });

  return (
    <Paper
      {...getRootProps()}
      sx={{
        p: 4,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        border: "2px dashed",
        borderColor: isDragActive ? "primary.main" : "divider",
        bgcolor: isDragActive ? "action.hover" : "background.paper",
        cursor: "pointer",
        transition: "all 0.2s ease",
        minHeight: 200,
      }}>
      <input {...getInputProps()} />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}>
        <Typography variant="h6" mb={1}>
          {isDragActive
            ? "Drop the Telegram export files here"
            : "Drag & drop Telegram export files here"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Only .zip files containing Telegram exports are accepted
        </Typography>
      </Box>
    </Paper>
  );
};

export default FileDropzone;
