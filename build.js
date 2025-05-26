const fs = require('fs');
const path = require('path');

// Helper: Recursively copy a directory
function copyDir(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir);
  }
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  entries.forEach(entry => {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

// Helper: Update manifest paths
function updateManifestPaths(manifest) {
  // Remove src/ prefix from paths
  manifest.action.default_popup = manifest.action.default_popup.replace('src/', '');
  manifest.background.service_worker = manifest.background.service_worker.replace('src/', '');
  
  // Update content script path
  manifest.content_scripts[0].js = ['contentScript.bundle.js'];
  
  // Update icon paths to be relative to dist root
  Object.keys(manifest.icons).forEach(size => {
    manifest.icons[size] = manifest.icons[size].replace('assets/', 'assets/');
  });
  
  return manifest;
}

// 1. Remove dist directory if it exists
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}

// 2. Recreate dist directory
fs.mkdirSync('dist');

// 3. Copy required files from src and root
const filesToCopy = [
  { src: 'src/contentScript.js', dest: 'contentScript.bundle.js' },
  { src: 'src/popup.js', dest: 'popup.js' },
  { src: 'src/popup.css', dest: 'popup.css' },
  { src: 'src/popup.html', dest: 'popup.html' },
  { src: 'src/background.js', dest: 'background.js' }
];

filesToCopy.forEach(file => {
  fs.copyFileSync(path.join(__dirname, file.src), path.join(__dirname, 'dist', file.dest));
});

// 4. Copy and update manifest.json
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
const updatedManifest = updateManifestPaths(manifest);
fs.writeFileSync(
  path.join(__dirname, 'dist', 'manifest.json'),
  JSON.stringify(updatedManifest, null, 2)
);

// 5. Copy assets directory (including nested icons etc.)
if (fs.existsSync('assets')) {
  copyDir(path.join(__dirname, 'assets'), path.join(__dirname, 'dist/assets'));
}

console.log('Build completed successfully! dist directory is clean and ready for Chrome.'); 