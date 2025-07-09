// /services/exportService.ts

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import JSZip from "jszip";
import { Platform } from "react-native";
import {
  FilmPackage,
  BudgetCategory,
} from "@/store/filmStore";

/**
 * Escape HTML for safe export.
 */
function safe(str?: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Helper: download blob on web
 */
function downloadBlobWeb(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export entire film package as a PDF file.
 */
export const exportFilmPackageAsPDF = async (
  filmPackage: FilmPackage,
  customFilename?: string
) => {
  try {
    let html = `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #333;
              padding: 20px;
            }
            h1, h2, h3 {
              color: #FF6A00;
              margin-top: 20px;
            }
            .section {
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
            pre {
              background-color: #f5f5f5;
              padding: 10px;
              white-space: pre-wrap;
              word-wrap: break-word;
            }
            img {
              max-width: 100%;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <h1>🎬 Film Package Export</h1>
    `;

    if (filmPackage.concept) {
      html += `
        <div class="section">
          <h2>Concept</h2>
          <p>${safe(filmPackage.concept)}</p>
        </div>`;
    }

    if (filmPackage.logline) {
      html += `
        <div class="section">
          <h2>Logline</h2>
          <p>${safe(filmPackage.logline)}</p>
        </div>`;
    }

    if (filmPackage.script) {
      const chunkString = (str: string, size: number) => {
        const chunks: string[] = [];
        let i = 0;
        while (i < str.length) {
          chunks.push(str.slice(i, i + size));
          i += size;
        }
        return chunks;
      };

      const scriptChunks = chunkString(filmPackage.script, 1000).map(safe);

      html += `
        <div class="section">
          <h2>Script</h2>
          ${scriptChunks
            .map(
              (chunk) =>
                `<pre style="font-family:Courier; font-size:12px;">${chunk}</pre>`
            )
            .join("")}
        </div>`;
    }

    if (filmPackage.storyboard?.length) {
      html += `<div class="section"><h2>Storyboard</h2>`;
      for (const scene of filmPackage.storyboard) {
        html += `<h3>Scene ${scene.sceneNumber}</h3>`;
        html += scene.imageUrl
          ? `<img src="${safe(scene.imageUrl)}" alt="Storyboard image" />`
          : "";
        html += `<p><strong>Shot Type:</strong> ${safe(scene.shot_type)}</p>`;
        html += `<p><strong>Description:</strong> ${safe(scene.description)}</p>`;
        html += `<p><strong>Lens Angle:</strong> ${safe(scene.lens_angle)}</p>`;
        html += `<p><strong>Movement:</strong> ${safe(scene.movement)}</p>`;
        html += `<p><strong>Lighting:</strong> ${safe(scene.lighting_setup)}</p>`;
      }
      html += `</div>`;
    }

    if (filmPackage.locations?.length) {
      html += `
        <div class="section">
          <h2>Locations</h2>
          ${filmPackage.locations
            .map(
              (loc) =>
                `<p><strong>${safe(loc.name)}</strong><br/>${safe(
                  loc.description
                )}</p>`
            )
            .join("")}
        </div>`;
    }

    if (filmPackage.budget && Array.isArray(filmPackage.budget)) {
      html += `
        <div class="section">
          <h2>Budget Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Amount</th>
                <th>Percentage</th>
                <th>Items</th>
              </tr>
            </thead>
            <tbody>
              ${filmPackage.budget
                .map((cat: BudgetCategory) => {
                  const items =
                    cat.items
                      ?.map((item) =>
                        typeof item === "string"
                          ? safe(item)
                          : `${safe(item.name)} ($${item.cost.toLocaleString()})`
                      )
                      .join("<br/>") || "";
                  return `
                    <tr>
                      <td>${safe(cat.name)}</td>
                      <td>$${cat.amount.toLocaleString()}</td>
                      <td>${cat.percentage}%</td>
                      <td>${items}</td>
                    </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>`;
    }

    html += `</body></html>`;

    const fileName = customFilename || "film_package.pdf";

    if (Platform.OS === "web") {
      const blob = new Blob([html], { type: "text/html" });
      downloadBlobWeb(blob, fileName);
      console.log("✅ Film Package exported as HTML file on web.");
      return;
    }

    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const fileUri = uri;

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        UTI: "com.adobe.pdf",
        mimeType: "application/pdf",
        dialogTitle: "Export Film Package PDF",
      });
    } else {
      console.log("PDF saved at:", fileUri);
    }
  } catch (error) {
    console.error("❌ PDF export error:", error);
    throw error;
  }
};

/**
 * Export script as a TXT file
 */
export const exportScriptAsTxt = async (
  scriptText: string,
  customFilename?: string
) => {
  try {
    const fileName = customFilename || "film_script.txt";

    if (Platform.OS === "web") {
      const blob = new Blob([scriptText], { type: "text/plain" });
      downloadBlobWeb(blob, fileName);
      console.log("✅ Script downloaded on web.");
      return;
    }

    const fileUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, scriptText, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/plain",
        dialogTitle: "Export Film Script",
      });
    } else {
      console.log("TXT saved at:", fileUri);
    }
  } catch (error) {
    console.error("❌ TXT export error:", error);
    throw error;
  }
};

/**
 * Export storyboard images as a ZIP file (manifest only for web)
 */
export const exportStoryboardAsZip = async (
  storyboard: {
    sceneNumber: number;
    imageUrl?: string;
    shot_type?: string;
    description?: string;
    lens_angle?: string;
    movement?: string;
    lighting_setup?: string;
  }[]
) => {
  try {
    if (!storyboard || storyboard.length === 0) {
      console.error("❌ Nothing to export.");
      alert("Nothing to export.");
      return;
    }

    const zip = new JSZip();
    const manifest: any[] = [];

    for (const scene of storyboard) {
      const extMatch = scene.imageUrl?.match(/\.(jpg|jpeg|png|webp)(\?|$)/i);
      const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";

      const filename = `scene_${scene.sceneNumber}.${ext}`;

      if (Platform.OS === "web") {
        // ✅ NEW: skip fetching images entirely on web
        manifest.push({
          sceneNumber: scene.sceneNumber,
          shot_type: scene.shot_type,
          description: scene.description,
          lens_angle: scene.lens_angle,
          movement: scene.movement,
          lighting_setup: scene.lighting_setup,
          resolution: "512x512",
          imageUrl: scene.imageUrl,
        });
        continue;
      }

      if (!scene.imageUrl) continue;

      // Native download
      const downloaded = await FileSystem.downloadAsync(
        scene.imageUrl,
        FileSystem.cacheDirectory + filename
      );

      const base64Data = await FileSystem.readAsStringAsync(downloaded.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      zip.file(filename, base64Data, { base64: true });

      manifest.push({
        sceneNumber: scene.sceneNumber,
        shot_type: scene.shot_type,
        description: scene.description,
        lens_angle: scene.lens_angle,
        movement: scene.movement,
        lighting_setup: scene.lighting_setup,
        resolution: "512x512",
        imageFile: filename,
        imageUrl: scene.imageUrl,
      });
    }

    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    const zipContents = Object.keys(zip.files);
    if (Platform.OS === "web" && zipContents.length === 1) {
      // only manifest on web — generate and download it
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlobWeb(zipBlob, "storyboard_export.zip");
      alert("Storyboard manifest exported! Images were not fetched due to CORS restrictions. Please use the URLs in manifest.json.");
      console.log("✅ Storyboard ZIP (manifest only) downloaded on web.");
      return;
    }

    if (Platform.OS === "web") {
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlobWeb(zipBlob, "storyboard_export.zip");
      alert("Storyboard ZIP exported!");
      console.log("✅ Storyboard ZIP downloaded on web.");
      return;
    }

    const zipBase64 = await zip.generateAsync({ type: "base64" });
    const zipFileUri = FileSystem.documentDirectory + "storyboard_export.zip";

    await FileSystem.writeAsStringAsync(zipFileUri, zipBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(zipFileUri, {
        mimeType: "application/zip",
        dialogTitle: "Export Storyboard ZIP",
      });
    } else {
      console.log("ZIP saved at:", zipFileUri);
    }
  } catch (error) {
    console.error("❌ ZIP export error:", error);
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as any).message)
        : "An unexpected error occurred while exporting the storyboard ZIP.";
    alert(message);
    throw error;
  }
};
