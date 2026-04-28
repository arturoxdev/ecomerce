import "server-only";

export {
  findAllZipcodes,
  findZipcodeById,
  findZipcodeByCityAndCode,
  countZipcodes,
  searchZipcodes,
  createZipcodesService,
} from "./services/zipcodes.service";

export type { ZipcodeRow, ZipcodesService } from "./services/zipcodes.service";
