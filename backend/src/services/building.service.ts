import { logger } from "../utils/logger";

/**
 * Building coordinate data structure
 * Coordinates are in WGS84 (EPSG:4326) format: [longitude, latitude]
 * Note: PostGIS ST_Point uses (longitude, latitude) order
 */
export interface BuildingCoordinates {
  lng: number; // longitude
  lat: number; // latitude
  name: string; // Full building name for display
}

/**
 * Static lookup table for Hochschule Darmstadt campus buildings
 *
 * To add buildings:
 * 1. Research building coordinates (https://h-da.de/campusmaps)
 * 2. Add entry: 'buildingCode': { lng: <longitude>, lat: <latitude>, name: '<Full Name>' }
 * 3. Use normalized building codes (uppercase, no spaces) as keys
 *
 * Example building codes:
 * - "D14" for Building D14
 * - "C10" for Building C10
 * - "C10/2.01" for Building C10, Floor 2, Room 01 (use base building coordinates)
 * - "MENSA" for Mensa (Cafeteria)
 */
const BUILDING_COORDINATES: Record<string, BuildingCoordinates> = {
  // TODO: Add Hochschule Darmstadt campus building coordinates here
  // Format: 'BUILDING_CODE': { lng: <longitude>, lat: <latitude>, name: '<Full Name>' }

  // Example entries (replace with actual coordinates):
  // 'D14': { lng: 8.6584, lat: 49.8670, name: 'Building D14' },
  // 'C10': { lng: 8.6590, lat: 49.8675, name: 'Building C10' },
  // 'MENSA': { lng: 8.6595, lat: 49.8680, name: 'Mensa (Cafeteria)' },

  // Pls Update if some buildings are missing

  // A buildings
  A10: {
    lng: 8.632021716733474,
    lat: 49.86594089853507,
    name: "A10",
  },
  A11: {
    lng: 8.63246997320878,
    lat: 49.86593509110833,
    name: "A11",
  },
  A12: {
    lng: 8.632996158481973,
    lat: 49.865976027720194,
    name: "A12",
  },
  A13: {
    lng: 8.633972972341212,
    lat: 49.86612566295287,
    name: "A13",
  },
  A14: {
    lng: 8.634001529300662,
    lat: 49.86652467752904,
    name: "A14",
  },
  A15: {
    lng: 8.63253051631211,
    lat: 49.866164184007886,
    name: "A15",
  },
  A16: {
    lng: 8.634434064404417,
    lat: 49.86613130051728,
    name: "A16",
  },
  A20: {
    lng: 8.63368205532862,
    lat: 49.86736489018659,
    name: "A20",
  },

  // B Buildings
  B10: {
    lng: 8.636883427909169,
    lat: 49.86753807331118,
    name: "B10",
  },
  B11: {
    lng: 8.636205641345327,
    lat: 49.86795077248627,
    name: "B11",
  },
  B12: {
    lng: 8.636131047205822,
    lat: 49.86728020458111,
    name: "B12",
  },
  B13: {
    lng: 8.636603706543866,
    lat: 49.86676345930084,
    name: "B13",
  },
  B14: {
    lng: 8.637145938046785,
    lat: 49.866780542633364,
    name: "B14",
  },
  B15: {
    lng: 8.637171359641172,
    lat: 49.865914041897554,
    name: "B15",
  },

  // C Buildings
  C10: {
    lng: 8.638193032596806,
    lat: 49.8673112616893,
    name: "C10",
  },
  Mensa: {
    lng: 8.637755468680496,
    lat: 49.866844303497345,
    name: "C11",
  },
  C12: {
    lng: 8.637715272920559,
    lat: 49.866398250220925,
    name: "C12",
  },
  C14: {
    lng: 8.638968182393768,
    lat: 49.86622907624684,
    name: "C14",
  },
  C15: {
    lng: 8.638871926061114,
    lat: 49.8664798695373,
    name: "C15",
  },
  C16: {
    lng: 8.638794125297807,
    lat: 49.86672204205536,
    name: "C16",
  },
  C18: {
    lng: 8.639233136313692,
    lat: 49.86627594401352,
    name: "C18",
  },
  C19: {
    lng: 8.638441897213966,
    lat: 49.866421494105566,
    name: "C19",
  },
  C20: {
    lng: 8.63851383410747,
    lat: 49.86617271726999,
    name: "C20",
  },
  C21: {
    lng: 8.639257288199076,
    lat: 49.86653576344301,
    name: "C21",
  },
  C23: {
    lng: 8.63886300848958,
    lat: 49.86773070488263,
    name: "C23",
  },

  // D Buildings
  D10: {
    lng: 8.640011640384216,
    lat: 49.86654535902156,
    name: "D10",
  },
  D11: {
    lng: 8.640499950131328,
    lat: 49.86665218983646,
    name: "D11",
  },
  D12: {
    lng: 8.640572079150132,
    lat: 49.86715844411802,
    name: "D12",
  },
  D13: {
    lng: 8.640624282079244,
    lat: 49.865979978011865,
    name: "D13",
  },
  D14: {
    lng: 8.641447467817244,
    lat: 49.866210435661316,
    name: "D14",
  },
  D15: {
    lng: 8.641554037054163,
    lat: 49.866513303271944,
    name: "D15",
  },
  D16: {
    lng: 8.641125443278781,
    lat: 49.86653873713348,
    name: "D16",
  },
  D17: {
    lng: 8.640946884429354,
    lat: 49.86697073781673,
    name: "D17",
  },
  D18: {
    lng: 8.641344608880559,
    lat: 49.867395559990456,
    name: "D18",
  },
  D19: {
    lng: 8.64025562751823,
    lat: 49.86555646907556,
    name: "D19",
  },
  D20: {
    lng: 8.640318446525953,
    lat: 49.86515171172232,
    name: "D20",
  },
  D21: {
    lng: 8.636458452955111,
    lat: 49.86399622497083,
    name: "D21",
  },
  D22: {
    lng: 8.63735506098331,
    lat: 49.86331804612834,
    name: "D22",
  },

  // E buildings
  E10: {
    lng: 8.64364367361631,
    lat: 49.87080684942751,
    name: "E10",
  },
  E11: {
    lng: 8.643303293331883,
    lat: 49.8702954557524,
    name: "E11",
  },
  E30: {
    lng: 8.668867824944016,
    lat: 49.87728236061946,
    name: "E30",
  },
  E31: {
    lng: 8.668477222698499,
    lat: 49.87734334550535,
    name: "E31",
  },
  E40: {
    lng: 8.666000428272241,
    lat: 49.875429126229875,
    name: "E40",
  },
  E60: {
    lng: 8.640742413419787,
    lat: 49.877074405227944,
    name: "E60",
  },

  // F Buildings
  F02: {
    lng: 8.855058112992282,
    lat: 49.90173008896818,
    name: "F02",
  },
  F11: {
    lng: 8.856261622643046,
    lat: 49.901122976874035,
    name: "F11",
  },
  F12: {
    lng: 8.857389660040099,
    lat: 49.901043412804086,
    name: "F12",
  },
  F14: {
    lng: 8.856542572683736,
    lat: 49.902486061995916,
    name: "F14",
  },
  F15: {
    lng: 8.856729307655456,
    lat: 49.90200680848315,
    name: "F15",
  },
  F16: {
    lng: 8.857649097276692,
    lat: 49.90304882580105,
    name: "F16",
  },
  F17: {
    lng: 8.858597475467775,
    lat: 49.902715929550254,
    name: "F17",
  },
  F18: {
    lng: 8.857921753264918,
    lat: 49.902218917932004,
    name: "F18",
  },
  F20: {
    lng: 8.858764777541126,
    lat: 49.903073500273564,
    name: "F20",
  },
  F25: {
    lng: 8.855099926273027,
    lat: 49.90222661731136,
    name: "F25",
  },
};

/**
 * Building Service
 * Provides lookup functionality for campus building coordinates
 */
export class BuildingService {
  /**
   * Normalize building name for lookup
   * - Convert to uppercase
   * - Remove extra whitespace
   * - Handle common variations (e.g., "C10/2.01" → "C10")
   */
  private normalizeBuildingName(buildingName: string): string {
    if (!buildingName) return "";

    // Remove extra whitespace and convert to uppercase
    let normalized = buildingName.trim().toUpperCase();

    // Handle room numbers (e.g., "C10/2.01" → "C10")
    // Extract base building code before slash
    if (normalized.includes("/")) {
      const parts = normalized.split("/");
      if (parts[0]) {
        normalized = parts[0].trim();
      }
    }

    return normalized;
  }

  /**
   * Get coordinates for a building by name
   *
   * @param buildingName - Building name or code (e.g., "D14", "C10", "Mensa")
   * @returns Building coordinates or null if not found
   */
  getBuildingCoordinates(
    buildingName: string | null | undefined,
  ): BuildingCoordinates | null {
    if (!buildingName) {
      return null;
    }

    const normalized = this.normalizeBuildingName(buildingName);

    if (!normalized) {
      return null;
    }

    // Direct lookup
    const coordinates = BUILDING_COORDINATES[normalized];
    if (coordinates) {
      logger.info("Building coordinates found", {
        buildingName,
        normalized,
        coordinates,
      });
      return coordinates;
    }

    // Not found
    logger.info("Building not found in lookup", {
      buildingName,
      normalized,
    });
    return null;
  }

  /**
   * Get coordinates for a building, with fallback to default campus center
   *
   * @param buildingName - Building name or code
   * @returns Building coordinates (never null, falls back to DEFAULT)
   */
  getBuildingCoordinatesWithDefault(
    buildingName: string | null | undefined,
  ): BuildingCoordinates {
    const coordinates = this.getBuildingCoordinates(buildingName);

    if (coordinates) {
      return coordinates;
    } else {
      return { lng: 0.0, lat: 0.0, name: "Unknown Location" };
      // TODO: fallbaack option
    }
  }

  /**
   * Get all known buildings for autocomplete/search
   *
   * @returns Array of all buildings with their codes and coordinates
   */
  getAllBuildings(): Array<{
    id: string;
    name: string;
    lng: number;
    lat: number;
  }> {
    return Object.entries(BUILDING_COORDINATES)
      .filter(([key]) => key !== "DEFAULT") // Exclude default from list
      .map(([id, coords]) => ({
        id,
        name: coords?.name || id,
        lng: coords?.lng || 0,
        lat: coords?.lat || 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
  }

  /**
   * Check if a building exists in the lookup table
   *
   * @param buildingName - Building name or code
   * @returns true if building is found, false otherwise
   */
  buildingExists(buildingName: string | null | undefined): boolean {
    return this.getBuildingCoordinates(buildingName) !== null;
  }
}

// Export singleton instance
export const buildingService = new BuildingService();
