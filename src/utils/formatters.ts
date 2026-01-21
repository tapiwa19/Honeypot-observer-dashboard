/**
 * Format timestamp to relative time (e.g., "2 minutes ago")
 */
export const formatTimeAgo = (timestamp: string | Date): string => {
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  } catch {
    return 'Invalid date';
  }
};

/**
 * Format timestamp to readable date/time
 */
export const formatDateTime = (timestamp: string | Date): string => {
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return 'Invalid date';
  }
};

/**
 * Format duration in seconds to human readable format
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

/**
 * Format IP address (mask last octet for privacy if needed)
 */
export const formatIpAddress = (ip: string, mask = false): string => {
  if (mask && ip) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      parts[3] = 'xxx';
      return parts.join('.');
    }
  }
  return ip;
};

/**
 * Format number with thousand separators
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

/**
 * Format bytes to human readable size
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number, total: number): string => {
  if (total === 0) return '0%';
  return ((value / total) * 100).toFixed(1) + '%';
};

/**
 * Get severity badge class
 */
export const getSeverityClass = (severity: string): string => {
  const classes = {
    low: 'bg-green-100 text-green-700 border-green-500',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-500',
    high: 'bg-orange-100 text-orange-700 border-orange-500',
    critical: 'bg-red-100 text-red-700 border-red-500'
  };
  return classes[severity as keyof typeof classes] || classes.low;
};

/**
 * Sanitize command for display (remove sensitive data)
 */
export const sanitizeCommand = (command: string): string => {
  // Remove potential passwords from commands
  return command
    .replace(/password[=:]\s*\S+/gi, 'password=***')
    .replace(/pwd[=:]\s*\S+/gi, 'pwd=***')
    .replace(/token[=:]\s*\S+/gi, 'token=***');
};

/**
 * Generate file name for exports
 */
export const generateExportFileName = (
  type: string,
  format: string,
  dateRange?: { from: string; to: string }
): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const rangeStr = dateRange 
    ? `_${dateRange.from}_to_${dateRange.to}`
    : '';
  
  return `honeypot_${type}${rangeStr}_${timestamp}.${format}`;
};

/**
 * Get country flag emoji from country code
 */
export const getCountryFlag = (countryCode: string): string => {
  const flags: Record<string, string> = {
    CN: '🇨🇳', RU: '🇷🇺', US: '🇺🇸', BR: '🇧🇷', IN: '🇮🇳',
    DE: '🇩🇪', GB: '🇬🇧', FR: '🇫🇷', KR: '🇰🇷', JP: '🇯🇵',
    VN: '🇻🇳', TR: '🇹🇷', ID: '🇮🇩', NL: '🇳🇱', UA: '🇺🇦',
  };
  return flags[countryCode] || '🌍';
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Calculate risk score color
 */
export const getRiskScoreColor = (score: number): string => {
  if (score >= 8) return 'text-red-500';
  if (score >= 6) return 'text-orange-500';
  if (score >= 4) return 'text-yellow-500';
  return 'text-green-500';
};

/**
 * Format timer display (MM:SS)
 */
export const formatTimer = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};