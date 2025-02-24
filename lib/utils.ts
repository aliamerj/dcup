import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { vSizes } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAvaliableVolume(
  plan?: "Free" | "Basic" | "Pro" | "Business" | "Enterprise",
  volumeAvailable?: number // in bytes
): string | null {
  if (!plan || !volumeAvailable) return null
  let totalCapacityBytes: number;
  let capacityDisplay: string;
  let divisor: number; // used for converting bytes to the appropriate unit

  switch (plan) {
    case "Free":
      totalCapacityBytes = vSizes.MB_1;
      capacityDisplay = "1 MB";
      divisor = 1024 * 1024; // converting to MB
      break;
    case "Basic":
      totalCapacityBytes = vSizes.MB_50; // 50 MB
      capacityDisplay = "50 MB";
      divisor = 1024 * 1024; // converting to MB
      break;
    case "Pro":
      totalCapacityBytes = vSizes.MB_250; // 250 MB
      capacityDisplay = "250 MB";
      divisor = 1024 * 1024; // converting to MB
      break;
    case "Business":
      totalCapacityBytes = vSizes.GB_5; // 5 GB
      capacityDisplay = "5 GB";
      divisor = 1024 * 1024 * 1024; // converting to GB
      break;
    case "Enterprise":
      totalCapacityBytes = vSizes.GB_15; // 5 GB
      capacityDisplay = "15 GB";
      divisor = 1024 * 1024 * 1024; // converting to GB
      break;
    default:
      // default values (should not happen if plan is properly typed)
      totalCapacityBytes = 0;
      capacityDisplay = "";
      divisor = 1;
  }

  // Calculate the used volume in bytes.
  const usedBytes = totalCapacityBytes - volumeAvailable;

  // Convert the used bytes to the corresponding unit.
  const usedInUnit = usedBytes / divisor;

  // Format the used volume: if it’s not an integer, show one digit after the decimal point.
  const formattedUsed =
    Number.isInteger(usedInUnit) ? usedInUnit.toString() : usedInUnit.toFixed(1);

  return `${formattedUsed} / ${capacityDisplay}`;
}

