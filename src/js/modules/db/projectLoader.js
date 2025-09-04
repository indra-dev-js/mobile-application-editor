// file: file/storage/projectLoader.js
import { getAllProjects } from './indexeDb.js';

export async function loadAllProjects() {
  try {
    
    if (window.AndroidBridge?.getAllProjects) {
      const result = await window.AndroidBridge.getAllProjects(); // JSON string
      return JSON.parse(result); // array of project
    }
  } catch (e) {
    console.warn('Gagal load dari JSBridge:', e);
  }

  // Fallback ke IndexedDB
  return await getAllProjects();
}
