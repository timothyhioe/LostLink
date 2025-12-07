import { Router } from "express";
import { buildingService } from "../services/building.service";

const router = Router();

/**
 * @swagger
 * /buildings:
 *   get:
 *     summary: Get all known campus buildings
 *     description: Returns a list of all campus buildings with their codes, names, and coordinates for frontend autocomplete
 *     tags: [Buildings]
 *     responses:
 *       200:
 *         description: List of all campus buildings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 buildings:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Building code (e.g., "D14", "C10", "Mensa")
 *                         example: "D14"
 *                       name:
 *                         type: string
 *                         description: Full building name for display
 *                         example: "D14"
 *                       lng:
 *                         type: number
 *                         description: Longitude coordinate (WGS84)
 *                         example: 8.641447467817244
 *                       lat:
 *                         type: number
 *                         description: Latitude coordinate (WGS84)
 *                         example: 49.866210435661316
 *             example:
 *               buildings:
 *                 - id: "A10"
 *                   name: "A10"
 *                   lng: 8.632021716733474
 *                   lat: 49.86594089853507
 *                 - id: "C10"
 *                   name: "C10 Hochhaus"
 *                   lng: 8.638193032596806
 *                   lat: 49.8673112616893
 *                 - id: "D14"
 *                   name: "D14"
 *                   lng: 8.641447467817244
 *                   lat: 49.866210435661316
 *                 - id: "Mensa"
 *                   name: "Mensa Schöfferstraße / C11"
 *                   lng: 8.637755468680496
 *                   lat: 49.866844303497345
 */
router.get("/buildings", (req, res) => {
  res.json({ buildings: buildingService.getAllBuildings() });
});

export { router as buildingsRouter };
