// /services/printService.ts

import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

/**
 * Print the storyboard.
 */
export async function printStoryboard(storyboard: any[]) {
  if (!storyboard || storyboard.length === 0) {
    alert("No storyboard to print!");
    return;
  }

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
          }
          img {
            max-width: 100%;
            margin: 10px 0;
          }
          .scene {
            margin-bottom: 40px;
          }
        </style>
      </head>
      <body>
        <h1>🎬 Film Storyboard</h1>
  `;

  for (const scene of storyboard) {
    html += `
      <div class="scene">
        <h2>Scene ${scene.sceneNumber}</h2>
        ${
          scene.imageUrl
            ? `<img src="${scene.imageUrl}" alt="Storyboard image" />`
            : "<p>No image available.</p>"
        }
        <p><strong>Shot Type:</strong> ${scene.shot_type || ""}</p>
        <p><strong>Description:</strong> ${scene.description || ""}</p>
        <p><strong>Lens Angle:</strong> ${scene.lens_angle || ""}</p>
        <p><strong>Movement:</strong> ${scene.movement || ""}</p>
        <p><strong>Lighting:</strong> ${scene.lighting_setup || ""}</p>
      </div>
    `;
  }

  html += `
      </body>
    </html>
  `;

  if (Platform.OS === "web") {
    // ✅ Web: open print window
    const printWindow = window.open("", "_blank");
    printWindow!.document.write(html);
    printWindow!.document.close();
    printWindow!.focus();
    printWindow!.print();
    return;
  }

  // ✅ Native (Expo Print)
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  console.log("✅ PDF created at:", uri);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Print or Share Storyboard PDF",
    });
  } else {
    alert("PDF generated but sharing is unavailable.");
  }
}
