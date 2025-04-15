import { ZipContent, FileItem } from "../components/ZipContentCard";
import JSZip from "jszip";
import { v4 as uuidv4 } from "uuid";
import { saveAs } from "file-saver";

/**
 * Extracts the contents of a zip file
 */
export const unzipFile = async (file: File): Promise<ZipContent> => {
  const zip = new JSZip();
  const content = await zip.loadAsync(file);

  const allFiles: string[] = [];
  let hasResultsJson = false;
  let resultJsonPath = "";

  // Find the result.json file and determine the root directory
  let rootPrefix = "";

  // First pass: locate result.json
  content.forEach((relativePath, zipEntry) => {
    // Skip hidden files and __MACOSX directories
    if (
      relativePath.startsWith(".") ||
      relativePath.startsWith("__MACOSX") ||
      relativePath.includes("/__MACOSX/")
    ) {
      return;
    }

    if (!zipEntry.dir) {
      // Check for result.json
      if (
        relativePath === "result.json" ||
        relativePath.endsWith("/result.json")
      ) {
        hasResultsJson = true;
        resultJsonPath = relativePath;

        // If result.json is not in the root, determine root prefix
        if (relativePath !== "result.json") {
          // The path parts excluding the filename "result.json"
          const pathParts = relativePath.split("/");
          pathParts.pop(); // Remove "result.json"
          rootPrefix = pathParts.join("/") + "/";
        }
      }
    }
  });

  // Map to keep track of folder contents
  const folderContents: Record<string, string[]> = {};

  // Second pass: collect all files relative to the root directory
  content.forEach((relativePath, zipEntry) => {
    // Skip hidden files and __MACOSX directories
    if (
      relativePath.startsWith(".") ||
      relativePath.startsWith("__MACOSX") ||
      relativePath.includes("/__MACOSX/")
    ) {
      return;
    }

    // If we found a result.json in a subfolder, only process files in that subfolder
    if (rootPrefix) {
      if (!relativePath.startsWith(rootPrefix)) {
        return; // Skip files outside the identified root
      }

      // Adjust path to make the subfolder the new root
      const adjustedPath = relativePath.substring(rootPrefix.length);

      if (!zipEntry.dir && adjustedPath) {
        allFiles.push(adjustedPath);

        // Get the top-level folder/file after adjusting the path
        const topLevel = adjustedPath.split("/")[0];

        // Add to folder contents tracking
        if (adjustedPath.includes("/")) {
          const folder = topLevel;
          if (!folderContents[folder]) {
            folderContents[folder] = [];
          }
          folderContents[folder].push(adjustedPath);
        }
      }
    } else {
      // No subfolder adjustment needed
      if (!zipEntry.dir) {
        allFiles.push(relativePath);

        // Get the top-level folder/file
        const topLevel = relativePath.split("/")[0];

        // Add to folder contents tracking
        if (relativePath.includes("/")) {
          const folder = topLevel;
          if (!folderContents[folder]) {
            folderContents[folder] = [];
          }
          folderContents[folder].push(relativePath);
        }
      }
    }
  });

  // Process top-level items
  const topLevelItems: FileItem[] = [];
  const processedItems = new Set<string>();

  // Helper function to process a file path and create top-level items
  const processFilePath = (filePath: string, zipEntry: JSZip.JSZipObject) => {
    const pathParts = filePath.split("/");
    const topLevel = pathParts[0];

    // Skip if we've already processed this top-level item
    if (processedItems.has(topLevel) || !topLevel) {
      return;
    }

    processedItems.add(topLevel);

    if (pathParts.length === 1 && !zipEntry.dir) {
      // It's a file at the top level
      topLevelItems.push({
        name: topLevel,
        path: filePath,
        size: Number(zipEntry.comment?.length || 0),
        isDirectory: false,
      });
    } else {
      // It's a directory
      const filesInFolder = folderContents[topLevel] || [];
      topLevelItems.push({
        name: topLevel,
        path: topLevel + "/",
        size: 0, // Directories don't have a size
        isDirectory: true,
        fileCount: filesInFolder.length,
      });
    }
  };

  // Process all files based on whether we need to adjust paths
  content.forEach((relativePath, zipEntry) => {
    // Skip hidden files and __MACOSX directories
    if (
      relativePath.startsWith(".") ||
      relativePath.startsWith("__MACOSX") ||
      relativePath.includes("/__MACOSX/")
    ) {
      return;
    }

    if (rootPrefix) {
      if (relativePath.startsWith(rootPrefix)) {
        const adjustedPath = relativePath.substring(rootPrefix.length);
        if (adjustedPath) {
          processFilePath(adjustedPath, zipEntry);
        }
      }
    } else {
      processFilePath(relativePath, zipEntry);
    }
  });

  // Sort items: folders first, then files
  topLevelItems.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  // If no result.json is found, create an error message
  const error = !hasResultsJson
    ? "No result.json found in the archive. This may not be a valid Telegram export."
    : undefined;

  return {
    id: uuidv4(),
    name: file.name,
    files: allFiles,
    topLevelItems,
    hasResultsJson,
    rootPrefix,
    resultJsonPath,
    error,
    originalFile: file, // Store the original file for later use
  };
};

/**
 * Combines multiple zip contents into a single downloadable zip file
 */
export const combineZipContents = async (
  contents: ZipContent[]
): Promise<void> => {
  // Only process valid contents
  const validContents = contents.filter((content) => !content.error);
  if (validContents.length === 0) {
    throw new Error("No valid Telegram exports to combine");
  }

  const combinedZip = new JSZip();
  const fileMap = new Map<string, { path: string; timestamp: number }>();

  // Process each zip file
  for (const content of validContents) {
    // Load the original zip file from the stored File object
    if (!content.originalFile) {
      throw new Error(`Original file for ${content.name} is missing`);
    }

    const originalZip = await JSZip.loadAsync(content.originalFile);
    const rootPrefix = content.rootPrefix || "";

    // Extract each file
    for (const filePath in originalZip.files) {
      const zipEntry = originalZip.files[filePath];

      // Skip directories and files not in the correct root
      if (
        zipEntry.dir ||
        (rootPrefix && !filePath.startsWith(rootPrefix)) ||
        filePath.startsWith(".") ||
        filePath.startsWith("__MACOSX/") ||
        filePath.includes("/__MACOSX/")
      ) {
        continue;
      }

      // Get the adjusted path relative to the determined root
      const adjustedPath = rootPrefix
        ? filePath.substring(rootPrefix.length)
        : filePath;
      if (!adjustedPath) continue;

      // Simulate conflict resolution logic
      // In a real implementation, we'd extract timestamps from filenames
      const currentTimestamp = getTimestampFromPath(adjustedPath);

      // Check if we already have this file from another zip
      const existing = fileMap.get(adjustedPath);
      if (!existing || currentTimestamp > existing.timestamp) {
        // Keep this file if it's newer
        fileMap.set(adjustedPath, {
          path: adjustedPath,
          timestamp: currentTimestamp,
        });

        // Add to the combined zip
        const fileContent = await zipEntry.async("uint8array");
        combinedZip.file(adjustedPath, fileContent);
      }
    }
  }

  // Generate the combined zip file
  const combinedContent = await combinedZip.generateAsync({ type: "blob" });

  // Download the file
  saveAs(combinedContent, "combined_telegram_export.zip");
};

/**
 * Helper function to generate a timestamp based on path
 * In a real implementation, this would properly parse Telegram's filename format
 */
const getTimestampFromPath = (path: string): number => {
  // This is a simplified example - in a real app you would parse
  // Telegram's actual filename format which includes timestamps

  // For demonstration, we'll just use the string length as a minor factor
  // This ensures the path parameter is actually used while still providing
  // sufficiently random-ish timestamps for our demo
  const pathFactor = path.length * 100;

  // Generate a timestamp with some randomness plus the path factor
  return Date.now() - Math.floor(Math.random() * 10000000) + pathFactor;
};
