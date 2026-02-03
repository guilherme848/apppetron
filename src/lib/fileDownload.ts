import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { supabase } from '@/integrations/supabase/client';

/**
 * Download a single file directly from a URL
 */
export async function downloadFile(url: string, fileName: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch file');
    
    const blob = await response.blob();
    saveAs(blob, fileName);
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

/**
 * Download a file from Supabase storage
 */
export async function downloadFromStorage(
  bucket: string,
  storagePath: string,
  fileName: string
): Promise<void> {
  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  await downloadFile(data.publicUrl, fileName);
}

export interface FileForZip {
  name: string;
  url: string;
}

/**
 * Download multiple files as a ZIP archive
 */
export async function downloadFilesAsZip(
  files: FileForZip[],
  zipFileName: string
): Promise<void> {
  if (files.length === 0) {
    throw new Error('No files to download');
  }

  const zip = new JSZip();

  // Track used names to handle duplicates
  const usedNames = new Set<string>();

  // Fetch all files in parallel
  const fetchPromises = files.map(async (file) => {
    try {
      const response = await fetch(file.url);
      if (!response.ok) {
        console.error(`Failed to fetch ${file.name}: ${response.statusText}`);
        return null;
      }
      const blob = await response.blob();
      
      // Handle duplicate names
      let finalName = file.name;
      if (usedNames.has(finalName)) {
        const lastDot = finalName.lastIndexOf('.');
        const name = lastDot > 0 ? finalName.slice(0, lastDot) : finalName;
        const ext = lastDot > 0 ? finalName.slice(lastDot) : '';
        let counter = 2;
        do {
          finalName = `${name} (${counter})${ext}`;
          counter++;
        } while (usedNames.has(finalName));
      }
      usedNames.add(finalName);
      
      return { name: finalName, blob };
    } catch (error) {
      console.error(`Error fetching ${file.name}:`, error);
      return null;
    }
  });

  const results = await Promise.all(fetchPromises);

  // Add files to ZIP
  for (const result of results) {
    if (result) {
      zip.file(result.name, result.blob);
    }
  }

  // Check if any files were added
  if (Object.keys(zip.files).length === 0) {
    throw new Error('Failed to add any files to ZIP');
  }

  // Generate ZIP and trigger download
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, zipFileName);
}

/**
 * Format a date for use in file names
 */
export function formatDateForFileName(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Sanitize a string for use in file names
 */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9À-ÿ\s\-_]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .substring(0, 50);
}
