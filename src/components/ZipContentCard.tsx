import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
} from "@mui/material";

export interface FileItem {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  fileCount?: number;
}

export interface ZipContent {
  id: string;
  name: string;
  files: string[];
  topLevelItems: FileItem[];
  hasResultsJson: boolean;
  rootPrefix?: string;
  resultJsonPath?: string;
  error?: string;
  originalFile?: File;
  analysis?: {
    messageCount: number;
    dateRange: {
      from: string;
      to: string;
    };
  };
}

interface ZipContentCardProps {
  content: ZipContent;
}

const ZipContentCard = ({ content }: ZipContentCardProps) => {
  // Helper function to format file size
  const formatFileSize = (size: number): string => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        borderColor: content.error
          ? "error.main"
          : content.hasResultsJson
          ? "success.main"
          : "warning.main",
      }}>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}>
          <Typography variant="h6">{content.name}</Typography>
          {content.error ? (
            <Chip label="Error" color="error" size="small" />
          ) : content.hasResultsJson ? (
            <Chip label="Valid" color="success" size="small" />
          ) : (
            <Chip label="Missing result.json" color="warning" size="small" />
          )}
        </Box>

        {content.error ? (
          <Typography color="error.main">{content.error}</Typography>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {content.files.length} files found
              {content.rootPrefix && (
                <>
                  {" - "}
                  <Typography
                    component="span"
                    color="info.main"
                    sx={{ fontStyle: "italic" }}>
                    Using {content.rootPrefix} as root directory
                  </Typography>
                </>
              )}
            </Typography>

            {content.resultJsonPath &&
              content.resultJsonPath !== "result.json" && (
                <Typography
                  variant="body2"
                  color="info.main"
                  sx={{ mb: 1, fontStyle: "italic" }}>
                  Found result.json at: {content.resultJsonPath}
                </Typography>
              )}

            {content.analysis && (
              <Box
                sx={{
                  my: 1,
                  p: 1,
                  bgcolor: "background.default",
                  borderRadius: 1,
                }}>
                <Typography variant="body2">
                  <strong>{content.analysis.messageCount}</strong> messages
                </Typography>
                {content.analysis.dateRange.from &&
                  content.analysis.dateRange.to && (
                    <Typography variant="body2">
                      Date range:{" "}
                      <strong>{content.analysis.dateRange.from}</strong> to{" "}
                      <strong>{content.analysis.dateRange.to}</strong>
                    </Typography>
                  )}
              </Box>
            )}

            <Divider sx={{ my: 1 }} />
            <List dense sx={{ maxHeight: 200, overflow: "auto" }}>
              {content.topLevelItems.map((item, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={item.name}
                    secondary={
                      item.isDirectory
                        ? `Folder (${item.fileCount} files)`
                        : `File (${formatFileSize(item.size)})`
                    }
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ZipContentCard;
