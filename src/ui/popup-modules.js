// LeetPilot Popup Module Loader
// Loads core modules and exposes them globally for popup use

import { StorageManager } from '../core/storage-manager.js';
import { InputValidator } from '../core/input-validator.js';

// Define a namespace for LeetPilot modules
window.LeetPilotModules = window.LeetPilotModules || {};

// Expose modules globally for use in popup
window.LeetPilotModules.StorageManager = StorageManager;
window.LeetPilotModules.InputValidator = InputValidator;

console.log('LeetPilot modules loaded and exposed globally');