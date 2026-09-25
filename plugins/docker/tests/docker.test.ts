import { describe, expect, it } from "vitest";

import { dockerAvailability, images, runningContainers } from "../src/index.js";

// Probing Docker (or discovering it is missing) goes through real
// process execution: on CI runners, and on Windows in particular, this
// can take seconds per probe. Give every test generous headroom over
// the 5s default and run independent probes concurrently.
describe("docker plugin (real environment)", () => {
  it(
    "reports availability without throwing in any environment",
    { timeout: 20_000 },
    async () => {
      const availability = await dockerAvailability();

      if (availability.available) {
        expect(availability.version).toMatch(/^\d+\.\d+/);
      } else {
        expect(["cli-missing", "daemon-down"]).toContain(availability.reason);
      }
    },
  );

  it(
    "returns undefined container lists when Docker is unusable",
    { timeout: 20_000 },
    async () => {
      const [availability, containers] = await Promise.all([
        dockerAvailability(),
        runningContainers(),
      ]);

      if (!availability.available) {
        expect(containers).toBeUndefined();
      } else {
        expect(Array.isArray(containers)).toBe(true);
      }
    },
  );

  it(
    "returns undefined image lists when Docker is unusable",
    { timeout: 20_000 },
    async () => {
      const [availability, list] = await Promise.all([dockerAvailability(), images()]);

      if (!availability.available) {
        expect(list).toBeUndefined();
      } else {
        expect(Array.isArray(list)).toBe(true);
      }
    },
  );
});
