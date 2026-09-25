import { describe, expect, it } from "vitest";

import { dockerAvailability, images, runningContainers } from "../src/index.js";

describe("docker plugin (real environment)", () => {
  it("reports availability without throwing in any environment", async () => {
    const availability = await dockerAvailability();

    if (availability.available) {
      expect(availability.version).toMatch(/^\d+\.\d+/);
    } else {
      expect(["cli-missing", "daemon-down"]).toContain(availability.reason);
    }
  });

  it("returns undefined container lists when Docker is unusable", async () => {
    const availability = await dockerAvailability();
    const containers = await runningContainers();

    if (!availability.available) {
      expect(containers).toBeUndefined();
    } else {
      expect(Array.isArray(containers)).toBe(true);
    }
  });

  it("returns undefined image lists when Docker is unusable", async () => {
    const availability = await dockerAvailability();
    const list = await images();

    if (!availability.available) {
      expect(list).toBeUndefined();
    } else {
      expect(Array.isArray(list)).toBe(true);
    }
  });
});
