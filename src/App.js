import React, { useState } from "react";
import './App.css';
// iOS Screenshot Generator
// Default export React component
// Usage:
// 1. Install dependencies: npm install jszip file-saver
// 2. Import and render this component in your app (or use as App.jsx)
// 3. Upload a single high-resolution source image (preferably >= 3000px on the shortest side)
// 4. Click "Generate ZIP" to download a ZIP with folders per device + orientation containing images sized per App Store screenshot specs.

import JSZip from "jszip";

export default function App() {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("");

  // Apple screenshot sizes (common, representative set)
  const sizes = [
    { name: "iPhone_6.7-inch", w: 1290, h: 2796, orient: "portrait" },
    { name: "iPhone_6.7-inch", w: 2796, h: 1290, orient: "landscape" },
    { name: "iPhone_6.5-inch", w: 1242, h: 2688, orient: "portrait" },
    { name: "iPhone_6.5-inch", w: 2688, h: 1242, orient: "landscape" },
    { name: "iPhone_6.1-inch", w: 1179, h: 2556, orient: "portrait" },
    { name: "iPhone_6.1-inch", w: 2556, h: 1179, orient: "landscape" },
    { name: "iPhone_5.5-inch", w: 1242, h: 2208, orient: "portrait" },
    { name: "iPhone_5.5-inch", w: 2208, h: 1242, orient: "landscape" },
    { name: "iPad_12.9-inch", w: 2048, h: 2732, orient: "portrait" },
    { name: "iPad_12.9-inch", w: 2732, h: 2048, orient: "landscape" },
    { name: "iPad_11-inch", w: 1668, h: 2388, orient: "portrait" },
    { name: "iPad_11-inch", w: 2388, h: 1668, orient: "landscape" }
  ];

  function handleFileChange(e) {
    const selectedFiles = Array.from(e.target.files).slice(0, 5);
    setFiles(selectedFiles);
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      const reader = new FileReader();
      reader.onload = (ev) => {
        img.src = ev.target.result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  // Cover-crop: scale image to fill target and center-crop any overflow
  function renderToCanvas(img, targetW, targetH) {
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");

    // Compute scale to cover target
    const scale = Math.max(targetW / img.width, targetH / img.height);
    const sw = targetW / scale; // source width
    const sh = targetH / scale; // source height
    const sx = (img.width - sw) / 2;
    const sy = (img.height - sh) / 2;

    // Fill white background (App Store disallows transparency for screenshots)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetW, targetH);

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
    return canvas;
  }

  async function generateZip() {
    if (files.length === 0) return setStatus("Please upload at least one source image.");
    setStatus("Loading images...");
    try {
      const zip = new JSZip();
      
      // Process each file
      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex];
        const fileName = file.name.split('.')[0]; // Get filename without extension
        setStatus(`Loading image ${fileIndex + 1} of ${files.length}: ${file.name}...`);
        const img = await loadImageFromFile(file);
        
        // Create a folder for this source image
        const imageFolder = zip.folder(`Image_${fileIndex + 1}_${fileName}`);
        
        setStatus(`Processing image ${fileIndex + 1} of ${files.length} - Resizing...`);

        for (const s of sizes) {
          const folderName = `${s.name}/${s.orient}`; // e.g. iPhone_6.7-inch/portrait
          const folder = imageFolder.folder(folderName);
          const canvas = renderToCanvas(img, s.w, s.h);
          // Convert canvas to blob (PNG)
          const dataUrl = canvas.toDataURL("image/png");
          // Convert dataURL to binary
          const binary = atob(dataUrl.split(",")[1]);
          const array = [];
          for (let i = 0; i < binary.length; i++) array.push(binary.charCodeAt(i));
          const uint8 = new Uint8Array(array);
          const filename = `${s.name}_${s.orient}_${s.w}x${s.h}.png`;
          folder.file(filename, uint8, { binary: true });
        }
      }

      setStatus("Generating ZIP file...");
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ios_screenshots.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus(`Done — Generated screenshots for ${files.length} image(s). ZIP contains separate folders for each image.`);
    } catch (err) {
      console.error(err);
      setStatus("Error: " + (err.message || err));
    }
  }

  return (
    <div className="App">
      <h1>iOS Screenshot Generator</h1>
      <p>Upload up to 5 high-resolution images and this tool will generate Apple App Store screenshot sizes for each image, organized into separate folders inside a ZIP.</p>

      <label>
        <span>Source images (PNG/JPG) - Up to 5 files</span>
        <input type="file" accept="image/*" onChange={handleFileChange} multiple />
      </label>

      {files.length > 0 && (
        <div className="file-info">
          <strong>Selected files ({files.length}):</strong>
          <ul style={{ marginTop: '8px', marginLeft: '20px' }}>
            {files.map((file, index) => (
              <li key={index}>
                {file.name} — {(file.size / 1024 / 1024).toFixed(2)} MB
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="button-group">
        <button onClick={generateZip} className="btn-primary">Generate ZIP</button>
        <button onClick={() => { setFiles([]); setStatus(""); }} className="btn-secondary">Reset</button>
      </div>

      <div className="status-box">
        <strong>Status:</strong>
        <div className="status-text">{status || "Idle"}</div>
      </div>

      <div className="notes-section">
        <p><strong>Notes:</strong></p>
        <ul>
          <li>Upload up to 5 images at once for batch processing.</li>
          <li>Provide high-res source images (at least as large as the largest target 2796×1290) for best quality.</li>
          <li>Images are exported as PNG with white background (Apple requires no transparency for screenshots).</li>
          <li>Folder structure: <code>Image_[number]_[filename]/DeviceName/orientation/screenshot.png</code>.</li>
          <li>To add/remove sizes or tweak naming, edit the <code>sizes</code> array in the component.</li>
        </ul>
      </div>
    </div>
  );
}
